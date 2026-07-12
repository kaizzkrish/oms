import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../../generated/prisma/client';
import type { UsersService } from '../users/users.service';
import type { QueryRolesDto } from './dto/query-roles.dto';
import type { RoleWithUserCount } from './entities/role.entity';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

function createRoleFixture(
  overrides: Partial<RoleWithUserCount> = {},
): RoleWithUserCount {
  return {
    id: 'role-1',
    name: 'Employee',
    description: null,
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    _count: { userRoles: 0 },
    ...overrides,
  };
}

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

describe('RolesService', () => {
  let rolesRepository: jest.Mocked<RolesRepository>;
  let usersService: jest.Mocked<UsersService>;
  let service: RolesService;

  beforeEach(() => {
    rolesRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
      findAssignment: jest.fn(),
      assignUser: jest.fn(),
      unassignUser: jest.fn(),
      findUsersForRole: jest.fn(),
    } as unknown as jest.Mocked<RolesRepository>;

    usersService = {
      getUserOrThrow: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new RolesService(rolesRepository, usersService);
  });

  describe('createRole', () => {
    it('creates a role when the name is not already taken', async () => {
      rolesRepository.findByName.mockResolvedValue(null);
      rolesRepository.create.mockResolvedValue(createRoleFixture());

      const result = await service.createRole({ name: 'Employee' }, 'admin-1');

      expect(rolesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Employee', createdBy: 'admin-1' }),
      );
      expect(result.name).toBe('Employee');
    });

    it('throws a ConflictException when the name is already taken', async () => {
      rolesRepository.findByName.mockResolvedValue(createRoleFixture());

      await expect(service.createRole({ name: 'Employee' })).rejects.toThrow(
        ConflictException,
      );
      expect(rolesRepository.create).not.toHaveBeenCalled();
    });
  });

  it('creates a system role with isSystem: true', async () => {
    rolesRepository.create.mockResolvedValue(
      createRoleFixture({ isSystem: true }),
    );

    await service.createSystemRole('Admin', 'Full access');

    expect(rolesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Admin', isSystem: true }),
    );
  });

  describe('listRoles', () => {
    it('paginates and maps results using repository findMany', async () => {
      rolesRepository.findMany.mockResolvedValue([[createRoleFixture()], 1]);

      const query: QueryRolesDto = {
        page: 2,
        limit: 10,
        sortOrder: 'asc',
        sortBy: 'name',
      };
      const result = await service.listRoles(query);

      expect(rolesRepository.findMany).toHaveBeenCalledWith(
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

  describe('updateRole', () => {
    it('updates a role when found and name is free', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.findByName.mockResolvedValue(null);
      rolesRepository.update.mockResolvedValue(
        createRoleFixture({ description: 'Updated' }),
      );

      const result = await service.updateRole(
        'role-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(rolesRepository.update).toHaveBeenCalledWith(
        'role-1',
        expect.objectContaining({
          description: 'Updated',
          updatedBy: 'admin-1',
        }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateRole('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another role', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.findByName.mockResolvedValue(
        createRoleFixture({ id: 'other-role' }),
      );

      await expect(
        service.updateRole('role-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('prevents renaming a system role', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ isSystem: true, name: 'Admin' }),
      );

      await expect(
        service.updateRole('role-1', { name: 'Super Admin' }),
      ).rejects.toThrow(BadRequestException);
      expect(rolesRepository.update).not.toHaveBeenCalled();
    });

    it('prevents deactivating a system role', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ isSystem: true, name: 'Admin' }),
      );

      await expect(
        service.updateRole('role-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
      expect(rolesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRole', () => {
    it('soft-deletes a role with no assigned users', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.softDelete.mockResolvedValue(
        createRoleFixture({ isActive: false }),
      );

      await service.deleteRole('role-1', 'admin-1');

      expect(rolesRepository.softDelete).toHaveBeenCalledWith(
        'role-1',
        'admin-1',
      );
    });

    it('prevents deleting a system role', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ isSystem: true }),
      );

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(rolesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('prevents deleting a role that still has assigned users', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ _count: { userRoles: 3 } }),
      );

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        ConflictException,
      );
      expect(rolesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.deleteRole('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreRole', () => {
    it('restores a soft-deleted role', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ isActive: false, deletedAt: new Date() }),
      );
      rolesRepository.restore.mockResolvedValue(createRoleFixture());

      const result = await service.restoreRole('role-1', 'admin-1');

      expect(rolesRepository.restore).toHaveBeenCalledWith('role-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('assignUser', () => {
    it('assigns a role to a user', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      usersService.getUserOrThrow.mockResolvedValue(createUserFixture());
      rolesRepository.findAssignment.mockResolvedValue(null);

      await service.assignUser('role-1', 'user-1', 'admin-1');

      expect(rolesRepository.assignUser).toHaveBeenCalledWith(
        'role-1',
        'user-1',
        'admin-1',
      );
    });

    it('prevents assigning an inactive role', async () => {
      rolesRepository.findById.mockResolvedValue(
        createRoleFixture({ isActive: false }),
      );

      await expect(service.assignUser('role-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(rolesRepository.assignUser).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the user does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      usersService.getUserOrThrow.mockRejectedValue(
        new NotFoundException('User with id "user-1" not found'),
      );

      await expect(service.assignUser('role-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(rolesRepository.assignUser).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the user already has the role', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      usersService.getUserOrThrow.mockResolvedValue(createUserFixture());
      rolesRepository.findAssignment.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        assignedAt: new Date(),
        assignedBy: null,
      });

      await expect(service.assignUser('role-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(rolesRepository.assignUser).not.toHaveBeenCalled();
    });
  });

  describe('unassignUser', () => {
    it('unassigns a role from a user', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.findAssignment.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        assignedAt: new Date(),
        assignedBy: null,
      });

      await service.unassignUser('role-1', 'user-1');

      expect(rolesRepository.unassignUser).toHaveBeenCalledWith(
        'role-1',
        'user-1',
      );
    });

    it('throws NotFoundException when the user does not have the role', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.findAssignment.mockResolvedValue(null);

      await expect(service.unassignUser('role-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(rolesRepository.unassignUser).not.toHaveBeenCalled();
    });
  });

  describe('listUsersForRole', () => {
    it('paginates users assigned to a role', async () => {
      rolesRepository.findById.mockResolvedValue(createRoleFixture());
      rolesRepository.findUsersForRole.mockResolvedValue([
        [createUserFixture()],
        1,
      ]);

      const result = await service.listUsersForRole('role-1', {
        page: 1,
        limit: 10,
        sortOrder: 'asc',
      });

      expect(rolesRepository.findUsersForRole).toHaveBeenCalledWith(
        'role-1',
        0,
        10,
      );
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundException when the role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.listUsersForRole('missing', {
          page: 1,
          limit: 10,
          sortOrder: 'asc',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasUserRole', () => {
    it('returns true when an assignment exists', async () => {
      rolesRepository.findAssignment.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        assignedAt: new Date(),
        assignedBy: null,
      });

      await expect(service.hasUserRole('user-1', 'role-1')).resolves.toBe(true);
    });

    it('returns false when no assignment exists', async () => {
      rolesRepository.findAssignment.mockResolvedValue(null);

      await expect(service.hasUserRole('user-1', 'role-1')).resolves.toBe(
        false,
      );
    });
  });
});
