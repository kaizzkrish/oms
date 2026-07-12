import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../config/configuration';
import { RedisService } from '../../redis/redis.service';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';

const BLACKLIST_KEY_PREFIX = 'auth:blacklist:';

export interface GeneratedAccessToken {
  token: string;
  jti: string;
  expiresIn: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly redisService: RedisService,
  ) {}

  async generateAccessToken(
    userId: string,
    email: string,
  ): Promise<GeneratedAccessToken> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const jti = randomUUID();
    const payload: JwtAccessPayload = { sub: userId, email, jti };
    const token = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: this.parseExpiryToSeconds(jwtConfig.accessExpiresIn),
    });
    return { token, jti, expiresIn: jwtConfig.accessExpiresIn };
  }

  async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const payload: JwtRefreshPayload = {
      sub: userId,
      sid: sessionId,
      jti: randomUUID(),
    };
    return this.jwtService.signAsync(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: this.parseExpiryToSeconds(jwtConfig.refreshExpiresIn),
    });
  }

  verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    return this.jwtService.verifyAsync<JwtAccessPayload>(token, {
      secret: jwtConfig.accessSecret,
    });
  }

  verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    return this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
      secret: jwtConfig.refreshSecret,
    });
  }

  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      return;
    }
    await this.redisService.set(
      `${BLACKLIST_KEY_PREFIX}${jti}`,
      '1',
      'EX',
      ttlSeconds,
    );
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const value = await this.redisService.get(`${BLACKLIST_KEY_PREFIX}${jti}`);
    return value !== null;
  }

  /** Parses a duration string like "15m" / "7d" into milliseconds. */
  parseExpiryToMs(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return Number(match[1]) * unitMs[match[2]];
  }

  /**
   * jsonwebtoken's `expiresIn` option only accepts a plain number of seconds
   * or its own branded `StringValue` string type — converting our config
   * strings to seconds sidesteps depending on that branded type directly.
   */
  private parseExpiryToSeconds(expiresIn: string): number {
    return Math.floor(this.parseExpiryToMs(expiresIn) / 1000);
  }
}
