import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sha256Hex } from '../../common/crypto/hash.util';
import { PasswordService } from '../../common/password/password.service';
import type { AppConfig } from '../../config/configuration';
import type { Session, User } from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SessionEntity } from './entities/session.entity';
import { PasswordResetTokenRepository } from './repository/password-reset-token.repository';
import { SessionRepository } from './repository/session.repository';
import { TokenService } from './token.service';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: UserEntity;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async login(
    email: string,
    password: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await this.passwordService.verify(
      user.passwordHash,
      password,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.recordLogin(user.id);

    return this.issueTokens(user, { ...context });
  }

  async refresh(
    refreshToken: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.sessionRepository.findById(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    if (sha256Hex(refreshToken) !== session.refreshTokenHash) {
      // The presented token doesn't match the session's latest issued
      // refresh token — it was already rotated out. Treat this as a
      // possible token-theft signal and revoke the whole session.
      await this.sessionRepository.revoke(session.id);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }

    return this.issueTokens(user, context, session.id);
  }

  async logout(
    accessTokenJti: string,
    accessTokenExp: number | undefined,
    sessionId?: string,
  ): Promise<void> {
    if (sessionId) {
      await this.sessionRepository.revoke(sessionId);
    }
    if (accessTokenExp) {
      const ttlSeconds = accessTokenExp - Math.floor(Date.now() / 1000);
      await this.tokenService.blacklistAccessToken(accessTokenJti, ttlSeconds);
    }
  }

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserEntity.fromPrisma(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const valid = await this.passwordService.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.usersService.updatePassword(userId, newPassword);
    await this.sessionRepository.revokeAllForUser(userId, currentSessionId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Deliberately do not reveal whether the email is registered.
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await this.passwordResetTokenRepository.create(
      user.id,
      sha256Hex(rawToken),
      expiresAt,
    );

    const { serverHost } = this.configService.get('app', { infer: true });
    const resetUrl = `http://${serverHost}/reset-password?token=${rawToken}`;
    await this.mailService.queuePasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenRepository.findValidByHash(
      sha256Hex(rawToken),
    );
    if (!resetToken) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired',
      );
    }

    await this.usersService.updatePassword(resetToken.userId, newPassword);
    await this.passwordResetTokenRepository.markUsed(resetToken.id);
    await this.sessionRepository.revokeAllForUser(resetToken.userId);
  }

  async listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionEntity[]> {
    const sessions = await this.sessionRepository.findActiveByUser(userId);
    return sessions.map((session) =>
      SessionEntity.fromPrisma(session, currentSessionId),
    );
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    await this.sessionRepository.revoke(sessionId);
  }

  private async issueTokens(
    user: User,
    context: RequestContext,
    existingSessionId?: string,
  ): Promise<AuthResult> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const expiresAt = new Date(
      Date.now() +
        this.tokenService.parseExpiryToMs(jwtConfig.refreshExpiresIn),
    );

    let session: Session;
    if (existingSessionId) {
      session = await this.sessionRepository.rotate(
        existingSessionId,
        'pending',
        expiresAt,
      );
    } else {
      session = await this.sessionRepository.create({
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt,
      });
    }

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      session.id,
    );
    await this.sessionRepository.rotate(
      session.id,
      sha256Hex(refreshToken),
      expiresAt,
    );

    const { token: accessToken, expiresIn } =
      await this.tokenService.generateAccessToken(user.id, user.email);

    return {
      accessToken,
      expiresIn,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      user: UserEntity.fromPrisma(user),
    };
  }
}
