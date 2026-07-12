import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AppConfig } from '../../config/configuration';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokensEntity } from './entities/auth-tokens.entity';
import { SessionEntity } from './entities/session.entity';
import type { JwtAccessPayload } from './interfaces/jwt-payload.interface';
import { TokenService } from './token.service';

const REFRESH_TOKEN_COOKIE = 'oms_refresh_token';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensEntity> {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      this.requestContext(req),
    );
    this.setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return new AuthTokensEntity({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensEntity> {
    const refreshToken = this.getRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refresh(
      refreshToken,
      this.requestContext(req),
    );
    this.setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return new AuthTokensEntity({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke the current session and blacklist the access token',
  })
  async logout(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const sessionId = await this.extractSessionId(req);
    await this.authService.logout(currentUser.jti, currentUser.exp, sessionId);
    this.clearRefreshCookie(res);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: "Get the current user's profile" })
  profile(@CurrentUser() currentUser: JwtAccessPayload): Promise<UserEntity> {
    return this.authService.getProfile(currentUser.sub);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the current user's password" })
  async changePassword(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const sessionId = await this.extractSessionId(req);
    await this.authService.changePassword(
      currentUser.sub,
      dto.currentPassword,
      dto.newPassword,
      sessionId,
    );
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset a password using a reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Your password has been reset. Please log in again.' };
  }

  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: "List the current user's active sessions" })
  async sessions(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Req() req: Request,
  ): Promise<SessionEntity[]> {
    const currentSessionId = await this.extractSessionId(req);
    return this.authService.listSessions(currentUser.sub, currentSessionId);
  }

  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session/device' })
  async revokeSession(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.authService.revokeSession(currentUser.sub, id);
  }

  private requestContext(req: Request): {
    userAgent?: string;
    ipAddress?: string;
  } {
    return {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };
  }

  private getRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private async extractSessionId(req: Request): Promise<string | undefined> {
    const refreshToken = this.getRefreshCookie(req);
    if (!refreshToken) {
      return undefined;
    }
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      return payload.sid;
    } catch {
      return undefined;
    }
  }

  private setRefreshCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    const nodeEnv = this.configService.get('nodeEnv', { infer: true });
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
  }
}
