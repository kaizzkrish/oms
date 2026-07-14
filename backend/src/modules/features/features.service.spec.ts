import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  Feature,
  Project,
  ProjectModule,
} from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectModulesService } from '../project-modules/project-modules.service';
import type { ProjectsService } from '../projects/projects.service';
import { FeaturesRepository } from './features.repository';
import { FeaturesService } from './features.service';

function createFeatureFixture(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleId: 'module-1',
    ownerId: null,
    name: 'Hero Banner Redesign',
    code: 'HERO',
    description: null,
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
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

function createProjectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organizationId: 'org-1',
    clientId: null,
    departmentId: null,
    projectManagerId: null,
    teamId: null,
    name: 'Website Redesign',
    code: 'WEB-RD',
    description: null,
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
    budget: null,
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

function createModuleFixture(
  overrides: Partial<ProjectModule> = {},
): ProjectModule {
  return {
    id: 'module-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleLeadId: null,
    name: 'Homepage Revamp',
    code: 'HOME',
    description: null,
    status: 'PLANNING',
    startDate: null,
    endDate: null,
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

function createEmployeeFixture(
  overrides: Partial<EmployeeWithUser> = {},
): EmployeeWithUser {
  return {
    id: 'employee-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      isActive: true,
    },
    organizationId: 'org-1',
    departmentId: null,
    designationId: null,
    officeId: null,
    reportingManagerId: null,
    employeeCode: 'EMP-0001',
    employmentType: 'FULL_TIME',
    dateOfJoining: new Date('2025-01-06'),
    dateOfLeaving: null,
    phone: null,
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

describe('FeaturesService', () => {
  let repository: jest.Mocked<FeaturesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let projectModulesService: jest.Mocked<ProjectModulesService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: FeaturesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByModuleAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<FeaturesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    projectModulesService = {
      getProjectModuleOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectModulesService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new FeaturesService(
      repository,
      organizationsService,
      projectsService,
      projectModulesService,
      employeesService,
    );
  });

  describe('createFeature', () => {
    it('creates a feature once the organization, project, and module are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture(),
      );
      repository.findByModuleAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createFeatureFixture());

      const result = await service.createFeature(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(projectsService.getProjectOrThrow).toHaveBeenCalledWith(
        'project-1',
      );
      expect(
        projectModulesService.getProjectModuleOrThrow,
      ).toHaveBeenCalledWith('module-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Hero Banner Redesign');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the project does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockRejectedValue(
        new NotFoundException('Project with id "project-1" not found'),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the project belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the module does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockRejectedValue(
        new NotFoundException('Module with id "module-1" not found'),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the module belongs to the same project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture({ projectId: 'other-project' }),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the owner belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          ownerId: 'employee-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this module', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture(),
      );
      repository.findByModuleAndName.mockResolvedValue(createFeatureFixture());

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture(),
      );

      await expect(
        service.createFeature({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Hero Banner Redesign',
          startDate: '2026-06-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateFeature', () => {
    it('updates a feature when found and name is free', async () => {
      repository.findById.mockResolvedValue(createFeatureFixture());
      repository.findByModuleAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createFeatureFixture({ description: 'Updated' }),
      );

      const result = await service.updateFeature(
        'feature-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'feature-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the feature does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateFeature('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another feature in the same module', async () => {
      repository.findById.mockResolvedValue(createFeatureFixture());
      repository.findByModuleAndName.mockResolvedValue(
        createFeatureFixture({ id: 'other-feature' }),
      );

      await expect(
        service.updateFeature('feature-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createFeatureFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateFeature('feature-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned module belongs to the same project', async () => {
      repository.findById.mockResolvedValue(createFeatureFixture());
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture({ id: 'module-2', projectId: 'other-project' }),
      );

      await expect(
        service.updateFeature('feature-1', { moduleId: 'module-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a new end date before the existing start date', async () => {
      repository.findById.mockResolvedValue(
        createFeatureFixture({ startDate: new Date('2026-06-01') }),
      );

      await expect(
        service.updateFeature('feature-1', { endDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFeature', () => {
    it('soft-deletes a feature', async () => {
      repository.findById.mockResolvedValue(createFeatureFixture());
      repository.softDelete.mockResolvedValue(
        createFeatureFixture({ isActive: false }),
      );

      await service.deleteFeature('feature-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'feature-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the feature does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteFeature('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreFeature', () => {
    it('restores a soft-deleted feature', async () => {
      repository.findById.mockResolvedValue(
        createFeatureFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createFeatureFixture());

      const result = await service.restoreFeature('feature-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('feature-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
