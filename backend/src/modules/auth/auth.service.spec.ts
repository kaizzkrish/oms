import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '../../common/password/password.service';
import type {
  PasswordResetToken,
  Session,
  User,
} from '../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordResetTokenRepository } from './repository/password-reset-token.repository';
import { SessionRepository } from './repository/session.repository';
import { TokenService } from './token.service';

jest.mock('../../common/crypto/hash.util', () => ({
  sha256Hex: jest.fn((value: string) => `hashed:${value}`),
}));

function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'stored-hash',
    firstName: 'Jane',
    lastName: 'Doe',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

function createSessionFixture(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    refreshTokenHash: 'hashed:refresh-token',
    userAgent: 'jest',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 100_000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let usersService: jest.Mocked<UsersService>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let passwordResetTokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let mailService: jest.Mocked<MailService>;
  let configService: jest.Mocked<ConfigService>;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      recordLogin: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    passwordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue({
        token: 'access-token',
        jti: 'jti-1',
        expiresIn: '15m',
      }),
      generateRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
      verifyRefreshToken: jest.fn(),
      blacklistAccessToken: jest.fn(),
      parseExpiryToMs: jest.fn().mockReturnValue(100_000),
    } as unknown as jest.Mocked<TokenService>;

    sessionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      findActiveByUser: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;

    passwordResetTokenRepository = {
      create: jest.fn(),
      findValidByHash: jest.fn(),
      markUsed: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetTokenRepository>;

    mailService = {
      queuePasswordResetEmail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    configService = {
      get: (key: string) => {
        if (key === 'jwt') {
          return { refreshExpiresIn: '7d' };
        }
        if (key === 'app') {
          return { serverHost: '192.168.1.100' };
        }
        return undefined;
      },
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthService(
      usersService,
      passwordService,
      tokenService,
      sessionRepository,
      passwordResetTokenRepository,
      mailService,
      configService,
    );
  });

  describe('login', () => {
    it('issues tokens for a valid email/password combination', async () => {
      usersService.findByEmail.mockResolvedValue(createUserFixture());
      passwordService.verify.mockResolvedValue(true);
      sessionRepository.create.mockResolvedValue(createSessionFixture());
      sessionRepository.rotate.mockResolvedValue(createSessionFixture());

      const result = await service.login(
        'jane@example.com',
        'correct-password',
        {},
      );

      expect(usersService.recordLogin).toHaveBeenCalledWith('user-1');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('jane@example.com');
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login('nobody@example.com', 'x', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an inactive user', async () => {
      usersService.findByEmail.mockResolvedValue(
        createUserFixture({ isActive: false }),
      );
      await expect(service.login('jane@example.com', 'x', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an incorrect password', async () => {
      usersService.findByEmail.mockResolvedValue(createUserFixture());
      passwordService.verify.mockResolvedValue(false);
      await expect(
        service.login('jane@example.com', 'wrong', {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token for a valid, matching session', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sid: 'session-1',
      });
      sessionRepository.findById.mockResolvedValue(createSessionFixture());
      sessionRepository.rotate.mockResolvedValue(createSessionFixture());
      usersService.findById.mockResolvedValue(createUserFixture());

      const result = await service.refresh('refresh-token', {});

      expect(result.accessToken).toBe('access-token');
      expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });

    it('revokes the session and rejects when the presented token was already rotated out', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sid: 'session-1',
      });
      sessionRepository.findById.mockResolvedValue(
        createSessionFixture({ refreshTokenHash: 'hashed:some-other-token' }),
      );

      await expect(service.refresh('refresh-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sessionRepository.revoke).toHaveBeenCalledWith('session-1');
    });

    it('rejects a revoked session', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sid: 'session-1',
      });
      sessionRepository.findById.mockResolvedValue(
        createSessionFixture({ revokedAt: new Date() }),
      );

      await expect(service.refresh('refresh-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an invalid or expired refresh JWT', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad token'));
      await expect(service.refresh('garbage', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the session and blacklists the access token', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      await service.logout('jti-1', nowSeconds + 60, 'session-1');

      expect(sessionRepository.revoke).toHaveBeenCalledWith('session-1');
      expect(tokenService.blacklistAccessToken).toHaveBeenCalledWith(
        'jti-1',
        expect.any(Number),
      );
    });
  });

  describe('changePassword', () => {
    it('updates the password and revokes other sessions when the current password is correct', async () => {
      usersService.findById.mockResolvedValue(createUserFixture());
      passwordService.verify.mockResolvedValue(true);

      await service.changePassword(
        'user-1',
        'current',
        'NewP4ssword!',
        'session-1',
      );

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'NewP4ssword!',
      );
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        'session-1',
      );
    });

    it('rejects an incorrect current password', async () => {
      usersService.findById.mockResolvedValue(createUserFixture());
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrong', 'NewP4ssword!'),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('queues a reset email for a known user', async () => {
      usersService.findByEmail.mockResolvedValue(createUserFixture());

      await service.forgotPassword('jane@example.com');

      expect(passwordResetTokenRepository.create).toHaveBeenCalled();
      expect(mailService.queuePasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'jane@example.com' }),
      );
    });

    it('does nothing for an unknown email, without revealing that to the caller', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await service.forgotPassword('nobody@example.com');

      expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mailService.queuePasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates the password and revokes all sessions for a valid token', async () => {
      const resetToken: PasswordResetToken = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hashed:raw-token',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt: new Date(),
      };
      passwordResetTokenRepository.findValidByHash.mockResolvedValue(
        resetToken,
      );

      await service.resetPassword('raw-token', 'NewP4ssword!');

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'NewP4ssword!',
      );
      expect(passwordResetTokenRepository.markUsed).toHaveBeenCalledWith(
        'reset-1',
      );
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects an invalid or expired token', async () => {
      passwordResetTokenRepository.findValidByHash.mockResolvedValue(null);
      await expect(
        service.resetPassword('bad-token', 'NewP4ssword!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeSession', () => {
    it('revokes a session belonging to the user', async () => {
      sessionRepository.findById.mockResolvedValue(createSessionFixture());
      await service.revokeSession('user-1', 'session-1');
      expect(sessionRepository.revoke).toHaveBeenCalledWith('session-1');
    });

    it("rejects revoking another user's session", async () => {
      sessionRepository.findById.mockResolvedValue(
        createSessionFixture({ userId: 'other-user' }),
      );
      await expect(
        service.revokeSession('user-1', 'session-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
