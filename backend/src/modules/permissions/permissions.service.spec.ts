import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Permission } from '../../generated/prisma/client';
import type { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import type { PermissionGroupWithCount } from '../permission-groups/entities/permission-group.entity';
import { PermissionsRepository } from './permissions.repository';
import { PermissionsService } from './permissions.service';

function createPermissionFixture(
  overrides: Partial<Permission> = {},
): Permission {
  return {
    id: 'permission-1',
    name: 'Project.Create',
    description: null,
    isSystem: false,
    isActive: true,
    groupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

function createGroupFixture(
  overrides: Partial<PermissionGroupWithCount> = {},
): PermissionGroupWithCount {
  return {
    id: 'group-1',
    name: 'Project Management',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    _count: { permissions: 0 },
    ...overrides,
  };
}

describe('PermissionsService', () => {
  let repository: jest.Mocked<PermissionsRepository>;
  let permissionGroupsService: jest.Mocked<PermissionGroupsService>;
  let service: PermissionsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
      countRoleAssignments: jest.fn(),
      findEffectivePermissionNames: jest.fn(),
    } as unknown as jest.Mocked<PermissionsRepository>;

    permissionGroupsService = {
      getGroupOrThrow: jest.fn(),
    } as unknown as jest.Mocked<PermissionGroupsService>;

    service = new PermissionsService(repository, permissionGroupsService);
  });

  describe('createPermission', () => {
    it('creates a permission when the name is not already taken', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createPermissionFixture());

      const result = await service.createPermission(
        { name: 'Project.Create' },
        'admin-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Project.Create',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Project.Create');
    });

    it('throws ConflictException when the name is already taken', async () => {
      repository.findByName.mockResolvedValue(createPermissionFixture());

      await expect(
        service.createPermission({ name: 'Project.Create' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates the permission with the given group once it is verified to exist', async () => {
      repository.findByName.mockResolvedValue(null);
      permissionGroupsService.getGroupOrThrow.mockResolvedValue(
        createGroupFixture(),
      );
      repository.create.mockResolvedValue(
        createPermissionFixture({ groupId: 'group-1' }),
      );

      await service.createPermission({
        name: 'Project.Create',
        groupId: 'group-1',
      });

      expect(permissionGroupsService.getGroupOrThrow).toHaveBeenCalledWith(
        'group-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'group-1' }),
      );
    });

    it('propagates a NotFoundException when the group does not exist', async () => {
      repository.findByName.mockResolvedValue(null);
      permissionGroupsService.getGroupOrThrow.mockRejectedValue(
        new NotFoundException('Permission group with id "group-1" not found'),
      );

      await expect(
        service.createPermission({
          name: 'Project.Create',
          groupId: 'group-1',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  it('creates a system permission with isSystem: true', async () => {
    repository.create.mockResolvedValue(
      createPermissionFixture({ isSystem: true }),
    );

    await service.createSystemPermission('Users.View', 'View users');

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Users.View', isSystem: true }),
    );
  });

  describe('updatePermission', () => {
    it('updates a permission when found and name is free', async () => {
      repository.findById.mockResolvedValue(createPermissionFixture());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createPermissionFixture({ description: 'Updated' }),
      );

      const result = await service.updatePermission(
        'permission-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'permission-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the permission does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updatePermission('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('prevents renaming a system permission', async () => {
      repository.findById.mockResolvedValue(
        createPermissionFixture({ isSystem: true, name: 'Users.View' }),
      );

      await expect(
        service.updatePermission('permission-1', { name: 'Users.List' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('prevents deactivating a system permission', async () => {
      repository.findById.mockResolvedValue(
        createPermissionFixture({ isSystem: true, name: 'Users.View' }),
      );

      await expect(
        service.updatePermission('permission-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePermission', () => {
    it('soft-deletes a permission with no role assignments', async () => {
      repository.findById.mockResolvedValue(createPermissionFixture());
      repository.countRoleAssignments.mockResolvedValue(0);
      repository.softDelete.mockResolvedValue(
        createPermissionFixture({ isActive: false }),
      );

      await service.deletePermission('permission-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'permission-1',
        'admin-1',
      );
    });

    it('prevents deleting a system permission', async () => {
      repository.findById.mockResolvedValue(
        createPermissionFixture({ isSystem: true }),
      );

      await expect(service.deletePermission('permission-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('prevents deleting a permission still assigned to roles', async () => {
      repository.findById.mockResolvedValue(createPermissionFixture());
      repository.countRoleAssignments.mockResolvedValue(2);

      await expect(service.deletePermission('permission-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restorePermission', () => {
    it('restores a soft-deleted permission', async () => {
      repository.findById.mockResolvedValue(
        createPermissionFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createPermissionFixture());

      const result = await service.restorePermission('permission-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith(
        'permission-1',
        'admin-1',
      );
      expect(result.isActive).toBe(true);
    });
  });

  describe('getEffectivePermissionNames', () => {
    it('returns the permission names as a set', async () => {
      repository.findEffectivePermissionNames.mockResolvedValue([
        'Users.View',
        'Roles.View',
      ]);

      const result = await service.getEffectivePermissionNames('user-1');

      expect(result).toEqual(new Set(['Users.View', 'Roles.View']));
    });
  });
});
