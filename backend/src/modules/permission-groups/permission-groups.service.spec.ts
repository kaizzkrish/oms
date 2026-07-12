import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PermissionGroupWithCount } from './entities/permission-group.entity';
import { PermissionGroupsRepository } from './permission-groups.repository';
import { PermissionGroupsService } from './permission-groups.service';

function createGroupFixture(
  overrides: Partial<PermissionGroupWithCount> = {},
): PermissionGroupWithCount {
  return {
    id: 'group-1',
    name: 'User Management',
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

describe('PermissionGroupsService', () => {
  let repository: jest.Mocked<PermissionGroupsRepository>;
  let service: PermissionGroupsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<PermissionGroupsRepository>;

    service = new PermissionGroupsService(repository);
  });

  describe('createGroup', () => {
    it('creates a group when the name is not already taken', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createGroupFixture());

      const result = await service.createGroup(
        { name: 'User Management' },
        'admin-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'User Management',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('User Management');
    });

    it('throws ConflictException when the name is already taken', async () => {
      repository.findByName.mockResolvedValue(createGroupFixture());

      await expect(
        service.createGroup({ name: 'User Management' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateGroup', () => {
    it('updates a group when found and name is free', async () => {
      repository.findById.mockResolvedValue(createGroupFixture());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createGroupFixture({ description: 'Updated' }),
      );

      const result = await service.updateGroup(
        'group-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'group-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the group does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateGroup('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another group', async () => {
      repository.findById.mockResolvedValue(createGroupFixture());
      repository.findByName.mockResolvedValue(
        createGroupFixture({ id: 'other-group' }),
      );

      await expect(
        service.updateGroup('group-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteGroup', () => {
    it('soft-deletes a group with no permissions', async () => {
      repository.findById.mockResolvedValue(createGroupFixture());
      repository.softDelete.mockResolvedValue(
        createGroupFixture({ isActive: false }),
      );

      await service.deleteGroup('group-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('group-1', 'admin-1');
    });

    it('prevents deleting a group that still contains permissions', async () => {
      repository.findById.mockResolvedValue(
        createGroupFixture({ _count: { permissions: 2 } }),
      );

      await expect(service.deleteGroup('group-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the group does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteGroup('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreGroup', () => {
    it('restores a soft-deleted group', async () => {
      repository.findById.mockResolvedValue(
        createGroupFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createGroupFixture());

      const result = await service.restoreGroup('group-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('group-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
