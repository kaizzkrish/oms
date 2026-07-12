import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PasswordService } from '../../common/password/password.service';
import type { User } from '../../generated/prisma/client';
import type { QueryUsersDto } from './dto/query-users.dto';
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
      update: jest.fn(),
      updatePasswordHash: jest.fn(),
      updateLastLoginAt: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
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

  describe('getUserOrThrow', () => {
    it('returns the user when found', async () => {
      usersRepository.findById.mockResolvedValue(createUserFixture());

      const result = await service.getUserOrThrow('user-1');

      expect(result.id).toBe('user-1');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.getUserOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listUsers', () => {
    it('paginates and maps results using repository findMany', async () => {
      usersRepository.findMany.mockResolvedValue([[createUserFixture()], 1]);

      const query: QueryUsersDto = {
        page: 2,
        limit: 10,
        sortOrder: 'asc',
        sortBy: 'createdAt',
      };
      const result = await service.listUsers(query);

      expect(usersRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('updateUser', () => {
    it('updates a user when found and email is free', async () => {
      usersRepository.findById.mockResolvedValue(createUserFixture());
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.update.mockResolvedValue(
        createUserFixture({ firstName: 'Janet' }),
      );

      const result = await service.updateUser(
        'user-1',
        { firstName: 'Janet' },
        'admin-1',
      );

      expect(usersRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ firstName: 'Janet', updatedBy: 'admin-1' }),
      );
      expect(result.firstName).toBe('Janet');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('missing', { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new email belongs to another user', async () => {
      usersRepository.findById.mockResolvedValue(createUserFixture());
      usersRepository.findByEmail.mockResolvedValue(
        createUserFixture({ id: 'other-user' }),
      );

      await expect(
        service.updateUser('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('soft-deletes a user', async () => {
      usersRepository.findById.mockResolvedValue(createUserFixture());
      usersRepository.softDelete.mockResolvedValue(
        createUserFixture({ isActive: false }),
      );

      await service.deleteUser('user-1', 'admin-1', 'admin-1');

      expect(usersRepository.softDelete).toHaveBeenCalledWith(
        'user-1',
        'admin-1',
      );
    });

    it('prevents a user from deleting their own account', async () => {
      await expect(
        service.deleteUser('user-1', 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteUser('missing', 'admin-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreUser', () => {
    it('restores a soft-deleted user', async () => {
      usersRepository.findById.mockResolvedValue(
        createUserFixture({ isActive: false, deletedAt: new Date() }),
      );
      usersRepository.restore.mockResolvedValue(createUserFixture());

      const result = await service.restoreUser('user-1', 'admin-1');

      expect(usersRepository.restore).toHaveBeenCalledWith('user-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
