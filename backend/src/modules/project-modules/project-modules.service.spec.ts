import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Project, ProjectModule } from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import { ProjectModulesRepository } from './project-modules.repository';
import { ProjectModulesService } from './project-modules.service';

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

describe('ProjectModulesService', () => {
  let repository: jest.Mocked<ProjectModulesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: ProjectModulesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<ProjectModulesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new ProjectModulesService(
      repository,
      organizationsService,
      projectsService,
      employeesService,
    );
  });

  describe('createProjectModule', () => {
    it('creates a module once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createModuleFixture());

      const result = await service.createProjectModule(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
        },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(projectsService.getProjectOrThrow).toHaveBeenCalledWith(
        'project-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Homepage Revamp');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
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
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
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
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the module lead belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleLeadId: 'employee-1',
          name: 'Homepage Revamp',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(createModuleFixture());

      await expect(
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
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

      await expect(
        service.createProjectModule({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Homepage Revamp',
          startDate: '2026-06-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProjectModule', () => {
    it('updates a module when found and name is free', async () => {
      repository.findById.mockResolvedValue(createModuleFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createModuleFixture({ description: 'Updated' }),
      );

      const result = await service.updateProjectModule(
        'module-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'module-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the module does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProjectModule('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another module in the same project', async () => {
      repository.findById.mockResolvedValue(createModuleFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createModuleFixture({ id: 'other-module' }),
      );

      await expect(
        service.updateProjectModule('module-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createModuleFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateProjectModule('module-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a new end date before the existing start date', async () => {
      repository.findById.mockResolvedValue(
        createModuleFixture({ startDate: new Date('2026-06-01') }),
      );

      await expect(
        service.updateProjectModule('module-1', { endDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProjectModule', () => {
    it('soft-deletes a module', async () => {
      repository.findById.mockResolvedValue(createModuleFixture());
      repository.softDelete.mockResolvedValue(
        createModuleFixture({ isActive: false }),
      );

      await service.deleteProjectModule('module-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('module-1', 'admin-1');
    });

    it('throws NotFoundException when the module does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteProjectModule('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreProjectModule', () => {
    it('restores a soft-deleted module', async () => {
      repository.findById.mockResolvedValue(
        createModuleFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createModuleFixture());

      const result = await service.restoreProjectModule('module-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('module-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
