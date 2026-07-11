import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let service: TokenService;

  const jwtConfig = {
    accessSecret: 'access-secret',
    accessExpiresIn: '15m',
    refreshSecret: 'refresh-secret',
    refreshExpiresIn: '7d',
  };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    redisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const configService = {
      get: () => jwtConfig,
    } as unknown as ConfigService;

    service = new TokenService(jwtService, configService, redisService);
  });

  it('generates an access token with a fresh jti and the configured secret/expiry', async () => {
    const result = await service.generateAccessToken(
      'user-1',
      'jane@example.com',
    );

    expect(result.token).toBe('signed-token');
    expect(result.expiresIn).toBe('15m');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        email: 'jane@example.com',
        jti: result.jti,
      }),
      { secret: 'access-secret', expiresIn: 15 * 60 },
    );
  });

  it('generates a refresh token bound to the session id with a unique jti', async () => {
    await service.generateRefreshToken('user-1', 'session-1');

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        sid: 'session-1',
        jti: expect.any(String),
      }),
      { secret: 'refresh-secret', expiresIn: 7 * 24 * 60 * 60 },
    );
  });

  it('blacklists a jti with a TTL derived from the token expiry', async () => {
    await service.blacklistAccessToken('jti-1', 120);
    expect(redisService.set).toHaveBeenCalledWith(
      'auth:blacklist:jti-1',
      '1',
      'EX',
      120,
    );
  });

  it('does not blacklist when the TTL is already zero or negative', async () => {
    await service.blacklistAccessToken('jti-1', 0);
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it('reports a token as blacklisted only when Redis has the key', async () => {
    redisService.get.mockResolvedValueOnce('1');
    await expect(service.isAccessTokenBlacklisted('jti-1')).resolves.toBe(true);

    redisService.get.mockResolvedValueOnce(null);
    await expect(service.isAccessTokenBlacklisted('jti-2')).resolves.toBe(
      false,
    );
  });

  it('parses duration strings into milliseconds', () => {
    expect(service.parseExpiryToMs('15m')).toBe(15 * 60 * 1000);
    expect(service.parseExpiryToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(service.parseExpiryToMs('30s')).toBe(30 * 1000);
    expect(service.parseExpiryToMs('not-a-duration')).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
});
