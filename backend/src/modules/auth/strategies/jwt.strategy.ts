import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../../config/configuration';
import type { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { TokenService } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).accessSecret,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    const blacklisted = await this.tokenService.isAccessTokenBlacklisted(
      payload.jti,
    );
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return payload;
  }
}
