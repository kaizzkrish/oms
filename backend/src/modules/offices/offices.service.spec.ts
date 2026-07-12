import { NotFoundException } from '@nestjs/common';
import type { Office } from '../../generated/prisma/client';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { OfficesRepository } from './offices.repository';
import { OfficesService } from './offices.service';

function createOfficeFixture(overrides: Partial<Office> = {}): Office {
  return {
    id: 'office-1',
    organizationId: 'org-1',
    name: 'Headquarters',
    isHeadquarters: false,
    addressLine1: '1 Corporate Park',
    addressLine2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '400001',
    phone: null,
    email: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

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

describe('OfficesService', () => {
  let repository: jest.Mocked<OfficesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let service: OfficesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
      unsetOtherHeadquarters: jest.fn(),
    } as unknown as jest.Mocked<OfficesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    service = new OfficesService(repository, organizationsService);
  });

  describe('createOffice', () => {
    it('creates an office once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.create.mockResolvedValue(createOfficeFixture());

      const result = await service.createOffice(
        {
          organizationId: 'org-1',
          name: 'Headquarters',
          addressLine1: '1 Corporate Park',
          city: 'Mumbai',
          country: 'India',
        },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          createdBy: 'admin-1',
        }),
      );
      expect(repository.unsetOtherHeadquarters).not.toHaveBeenCalled();
      expect(result.name).toBe('Headquarters');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createOffice({
          organizationId: 'org-1',
          name: 'Headquarters',
          addressLine1: '1 Corporate Park',
          city: 'Mumbai',
          country: 'India',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('unsets other headquarters offices when creating a new one marked as headquarters', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.create.mockResolvedValue(
        createOfficeFixture({ isHeadquarters: true }),
      );

      await service.createOffice({
        organizationId: 'org-1',
        name: 'Headquarters',
        isHeadquarters: true,
        addressLine1: '1 Corporate Park',
        city: 'Mumbai',
        country: 'India',
      });

      expect(repository.unsetOtherHeadquarters).toHaveBeenCalledWith(
        'org-1',
        'office-1',
      );
    });
  });

  describe('updateOffice', () => {
    it('throws NotFoundException when the office does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateOffice('missing', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('verifies the new organization when reassigning an office', async () => {
      repository.findById.mockResolvedValue(createOfficeFixture());
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture({ id: 'org-2' }),
      );
      repository.update.mockResolvedValue(
        createOfficeFixture({ organizationId: 'org-2' }),
      );

      await service.updateOffice('office-1', { organizationId: 'org-2' });

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-2',
      );
    });

    it('unsets other headquarters offices when isHeadquarters becomes true', async () => {
      repository.findById.mockResolvedValue(createOfficeFixture());
      repository.update.mockResolvedValue(
        createOfficeFixture({ isHeadquarters: true }),
      );

      await service.updateOffice('office-1', { isHeadquarters: true });

      expect(repository.unsetOtherHeadquarters).toHaveBeenCalledWith(
        'org-1',
        'office-1',
      );
    });
  });

  describe('deleteOffice', () => {
    it('soft-deletes an office', async () => {
      repository.findById.mockResolvedValue(createOfficeFixture());
      repository.softDelete.mockResolvedValue(
        createOfficeFixture({ isActive: false }),
      );

      await service.deleteOffice('office-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('office-1', 'admin-1');
    });

    it('throws NotFoundException when the office does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteOffice('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreOffice', () => {
    it('restores a soft-deleted office', async () => {
      repository.findById.mockResolvedValue(
        createOfficeFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createOfficeFixture());

      const result = await service.restoreOffice('office-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('office-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
