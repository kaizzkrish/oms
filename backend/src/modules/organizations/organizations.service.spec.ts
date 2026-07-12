import { ConflictException, NotFoundException } from '@nestjs/common';
import type { OrganizationWithOfficeCount } from './entities/organization.entity';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';

function createOrgFixture(
  overrides: Partial<OrganizationWithOfficeCount> = {},
): OrganizationWithOfficeCount {
  return {
    id: 'org-1',
    name: 'Acme Corporation',
    legalName: null,
    registrationNumber: null,
    industry: null,
    website: null,
    email: null,
    phone: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    _count: { offices: 0 },
    ...overrides,
  };
}

describe('OrganizationsService', () => {
  let repository: jest.Mocked<OrganizationsRepository>;
  let service: OrganizationsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsRepository>;

    service = new OrganizationsService(repository);
  });

  describe('createOrganization', () => {
    it('creates an organization when the name is not already taken', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createOrgFixture());

      const result = await service.createOrganization(
        { name: 'Acme Corporation' },
        'admin-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme Corporation',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Acme Corporation');
    });

    it('throws ConflictException when the name is already taken', async () => {
      repository.findByName.mockResolvedValue(createOrgFixture());

      await expect(
        service.createOrganization({ name: 'Acme Corporation' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateOrganization', () => {
    it('updates an organization when found and name is free', async () => {
      repository.findById.mockResolvedValue(createOrgFixture());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createOrgFixture({ industry: 'Finance' }),
      );

      const result = await service.updateOrganization(
        'org-1',
        { industry: 'Finance' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ industry: 'Finance' }),
      );
      expect(result.industry).toBe('Finance');
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateOrganization('missing', { industry: 'Finance' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another organization', async () => {
      repository.findById.mockResolvedValue(createOrgFixture());
      repository.findByName.mockResolvedValue(
        createOrgFixture({ id: 'other-org' }),
      );

      await expect(
        service.updateOrganization('org-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteOrganization', () => {
    it('soft-deletes an organization with no offices', async () => {
      repository.findById.mockResolvedValue(createOrgFixture());
      repository.softDelete.mockResolvedValue(
        createOrgFixture({ isActive: false }),
      );

      await service.deleteOrganization('org-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('org-1', 'admin-1');
    });

    it('prevents deleting an organization that still has offices', async () => {
      repository.findById.mockResolvedValue(
        createOrgFixture({ _count: { offices: 2 } }),
      );

      await expect(service.deleteOrganization('org-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteOrganization('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreOrganization', () => {
    it('restores a soft-deleted organization', async () => {
      repository.findById.mockResolvedValue(
        createOrgFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createOrgFixture());

      const result = await service.restoreOrganization('org-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('org-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
