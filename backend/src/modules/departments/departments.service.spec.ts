import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Department, Office } from '../../generated/prisma/client';
import type { OfficesService } from '../offices/offices.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { DepartmentsRepository } from './departments.repository';
import { DepartmentsService } from './departments.service';

function createDepartmentFixture(
  overrides: Partial<Department> = {},
): Department {
  return {
    id: 'dept-1',
    organizationId: 'org-1',
    officeId: null,
    name: 'Engineering',
    code: 'ENG',
    description: null,
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

function createOfficeFixture(overrides: Partial<Office> = {}): Office {
  return {
    id: 'office-1',
    organizationId: 'org-1',
    name: 'Headquarters',
    isHeadquarters: true,
    addressLine1: '1 Corporate Park',
    addressLine2: null,
    city: 'Mumbai',
    state: null,
    country: 'India',
    postalCode: null,
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

describe('DepartmentsService', () => {
  let repository: jest.Mocked<DepartmentsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let officesService: jest.Mocked<OfficesService>;
  let service: DepartmentsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    officesService = {
      getOfficeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OfficesService>;

    service = new DepartmentsService(
      repository,
      organizationsService,
      officesService,
    );
  });

  describe('createDepartment', () => {
    it('creates a department once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createDepartmentFixture());

      const result = await service.createDepartment(
        { organizationId: 'org-1', name: 'Engineering' },
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
      expect(result.name).toBe('Engineering');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createDepartment({
          organizationId: 'org-1',
          name: 'Engineering',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(
        createDepartmentFixture(),
      );

      await expect(
        service.createDepartment({
          organizationId: 'org-1',
          name: 'Engineering',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the office belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      officesService.getOfficeOrThrow.mockResolvedValue(
        createOfficeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createDepartment({
          organizationId: 'org-1',
          officeId: 'office-1',
          name: 'Engineering',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates the department with a matching office', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      officesService.getOfficeOrThrow.mockResolvedValue(
        createOfficeFixture({ organizationId: 'org-1' }),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(
        createDepartmentFixture({ officeId: 'office-1' }),
      );

      const result = await service.createDepartment({
        organizationId: 'org-1',
        officeId: 'office-1',
        name: 'Engineering',
      });

      expect(result.officeId).toBe('office-1');
    });
  });

  describe('updateDepartment', () => {
    it('updates a department when found and name is free', async () => {
      repository.findById.mockResolvedValue(createDepartmentFixture());
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createDepartmentFixture({ description: 'Updated' }),
      );

      const result = await service.updateDepartment(
        'dept-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'dept-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the department does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateDepartment('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another department in the same organization', async () => {
      repository.findById.mockResolvedValue(createDepartmentFixture());
      repository.findByOrganizationAndName.mockResolvedValue(
        createDepartmentFixture({ id: 'other-dept' }),
      );

      await expect(
        service.updateDepartment('dept-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteDepartment', () => {
    it('soft-deletes a department', async () => {
      repository.findById.mockResolvedValue(createDepartmentFixture());
      repository.softDelete.mockResolvedValue(
        createDepartmentFixture({ isActive: false }),
      );

      await service.deleteDepartment('dept-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('dept-1', 'admin-1');
    });

    it('throws NotFoundException when the department does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteDepartment('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreDepartment', () => {
    it('restores a soft-deleted department', async () => {
      repository.findById.mockResolvedValue(
        createDepartmentFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createDepartmentFixture());

      const result = await service.restoreDepartment('dept-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('dept-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
