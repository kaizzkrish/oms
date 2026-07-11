import { ConflictException } from '@nestjs/common';
import { PasswordService } from '../../common/password/password.service';
import type { User } from '../../generated/prisma/client';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed',
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

describe('UsersService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let service: UsersService;

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
      updateLastLoginAt: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    passwordService = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      verify: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    service = new UsersService(usersRepository, passwordService);
  });

  describe('createUser', () => {
    it('creates a user when the email is not already taken', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(createUserFixture());

      const result = await service.createUser({
        email: 'jane@example.com',
        password: 'Sup3rSecret!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(passwordService.hash).toHaveBeenCalledWith('Sup3rSecret!');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@example.com',
          passwordHash: 'new-hash',
        }),
      );
      expect(result.email).toBe('jane@example.com');
    });

    it('throws a ConflictException when the email is already registered', async () => {
      usersRepository.findByEmail.mockResolvedValue(createUserFixture());

      await expect(
        service.createUser({
          email: 'jane@example.com',
          password: 'Sup3rSecret!',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  it('updates the password hash', async () => {
    usersRepository.updatePasswordHash.mockResolvedValue(createUserFixture());

    await service.updatePassword('user-1', 'NewP4ssword!');

    expect(passwordService.hash).toHaveBeenCalledWith('NewP4ssword!');
    expect(usersRepository.updatePasswordHash).toHaveBeenCalledWith(
      'user-1',
      'new-hash',
    );
  });

  it('records the last login timestamp', async () => {
    usersRepository.updateLastLoginAt.mockResolvedValue(createUserFixture());

    await service.recordLogin('user-1');

    expect(usersRepository.updateLastLoginAt).toHaveBeenCalledWith('user-1');
  });
});
