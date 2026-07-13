import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Department, Designation } from '../../generated/prisma/client';
import type { DepartmentsService } from '../departments/departments.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { DesignationsRepository } from './designations.repository';
import { DesignationsService } from './designations.service';

function createDesignationFixture(
  overrides: Partial<Designation> = {},
): Designation {
  return {
    id: 'designation-1',
    organizationId: 'org-1',
    departmentId: null,
    name: 'Software Engineer',
    code: 'SE',
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

describe('DesignationsService', () => {
  let repository: jest.Mocked<DesignationsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let service: DesignationsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<DesignationsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    departmentsService = {
      getDepartmentOrThrow: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsService>;

    service = new DesignationsService(
      repository,
      organizationsService,
      departmentsService,
    );
  });

  describe('createDesignation', () => {
    it('creates a designation once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createDesignationFixture());

      const result = await service.createDesignation(
        { organizationId: 'org-1', name: 'Software Engineer' },
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
      expect(result.name).toBe('Software Engineer');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createDesignation({
          organizationId: 'org-1',
          name: 'Software Engineer',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(
        createDesignationFixture(),
      );

      await expect(
        service.createDesignation({
          organizationId: 'org-1',
          name: 'Software Engineer',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the department belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      departmentsService.getDepartmentOrThrow.mockResolvedValue(
        createDepartmentFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createDesignation({
          organizationId: 'org-1',
          departmentId: 'dept-1',
          name: 'Software Engineer',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates the designation with a matching department', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      departmentsService.getDepartmentOrThrow.mockResolvedValue(
        createDepartmentFixture({ organizationId: 'org-1' }),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(
        createDesignationFixture({ departmentId: 'dept-1' }),
      );

      const result = await service.createDesignation({
        organizationId: 'org-1',
        departmentId: 'dept-1',
        name: 'Software Engineer',
      });

      expect(result.departmentId).toBe('dept-1');
    });
  });

  describe('updateDesignation', () => {
    it('updates a designation when found and name is free', async () => {
      repository.findById.mockResolvedValue(createDesignationFixture());
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createDesignationFixture({ description: 'Updated' }),
      );

      const result = await service.updateDesignation(
        'designation-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'designation-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the designation does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateDesignation('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another designation in the same organization', async () => {
      repository.findById.mockResolvedValue(createDesignationFixture());
      repository.findByOrganizationAndName.mockResolvedValue(
        createDesignationFixture({ id: 'other-designation' }),
      );

      await expect(
        service.updateDesignation('designation-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteDesignation', () => {
    it('soft-deletes a designation', async () => {
      repository.findById.mockResolvedValue(createDesignationFixture());
      repository.softDelete.mockResolvedValue(
        createDesignationFixture({ isActive: false }),
      );

      await service.deleteDesignation('designation-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'designation-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the designation does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteDesignation('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreDesignation', () => {
    it('restores a soft-deleted designation', async () => {
      repository.findById.mockResolvedValue(
        createDesignationFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createDesignationFixture());

      const result = await service.restoreDesignation(
        'designation-1',
        'admin-1',
      );

      expect(repository.restore).toHaveBeenCalledWith(
        'designation-1',
        'admin-1',
      );
      expect(result.isActive).toBe(true);
    });
  });
});
