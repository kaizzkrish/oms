import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  Feature,
  Project,
  ProjectModule,
  Sprint,
  Task,
} from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { FeaturesService } from '../features/features.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectModulesService } from '../project-modules/project-modules.service';
import type { ProjectsService } from '../projects/projects.service';
import type { SprintsService } from '../sprints/sprints.service';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

function createTaskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleId: null,
    featureId: null,
    sprintId: null,
    assigneeId: null,
    name: 'Build hero banner component',
    code: 'HERO-1',
    description: null,
    type: 'TASK',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
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

function createSprintFixture(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 'sprint-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    teamId: null,
    scrumMasterId: null,
    name: 'Sprint 1',
    code: 'SPR-1',
    goal: null,
    status: 'PLANNING',
    startDate: new Date('2026-01-13'),
    endDate: new Date('2026-01-27'),
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

describe('TasksService', () => {
  let repository: jest.Mocked<TasksRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let projectModulesService: jest.Mocked<ProjectModulesService>;
  let featuresService: jest.Mocked<FeaturesService>;
  let sprintsService: jest.Mocked<SprintsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: TasksService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<TasksRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    projectModulesService = {
      getProjectModuleOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectModulesService>;

    featuresService = {
      getFeatureOrThrow: jest.fn(),
    } as unknown as jest.Mocked<FeaturesService>;

    sprintsService = {
      getSprintOrThrow: jest.fn(),
    } as unknown as jest.Mocked<SprintsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new TasksService(
      repository,
      organizationsService,
      projectsService,
      projectModulesService,
      featuresService,
      sprintsService,
      employeesService,
    );
  });

  describe('createTask', () => {
    it('creates a task once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.create.mockResolvedValue(createTaskFixture());

      const result = await service.createTask(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Build hero banner component',
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
      expect(result.name).toBe('Build hero banner component');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Build hero banner component',
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
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Build hero banner component',
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
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Build hero banner component',
        }),
      ).rejects.toThrow(BadRequestException);
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
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          moduleId: 'module-1',
          name: 'Build hero banner component',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the feature belongs to the same project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      featuresService.getFeatureOrThrow.mockResolvedValue(
        createFeatureFixture({ projectId: 'other-project' }),
      );

      await expect(
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          featureId: 'feature-1',
          name: 'Build hero banner component',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the sprint belongs to the same project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      sprintsService.getSprintOrThrow.mockResolvedValue(
        createSprintFixture({ projectId: 'other-project' }),
      );

      await expect(
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          sprintId: 'sprint-1',
          name: 'Build hero banner component',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the assignee belongs to the same organization', async () => {
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
        service.createTask({
          organizationId: 'org-1',
          projectId: 'project-1',
          assigneeId: 'employee-1',
          name: 'Build hero banner component',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('updates a task when found', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      repository.update.mockResolvedValue(
        createTaskFixture({ description: 'Updated' }),
      );

      const result = await service.updateTask(
        'task-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the task does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateTask('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateTask('task-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned module belongs to the same project', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      projectModulesService.getProjectModuleOrThrow.mockResolvedValue(
        createModuleFixture({ id: 'module-2', projectId: 'other-project' }),
      );

      await expect(
        service.updateTask('task-1', { moduleId: 'module-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned feature belongs to the same project', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      featuresService.getFeatureOrThrow.mockResolvedValue(
        createFeatureFixture({ id: 'feature-2', projectId: 'other-project' }),
      );

      await expect(
        service.updateTask('task-1', { featureId: 'feature-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned sprint belongs to the same project', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      sprintsService.getSprintOrThrow.mockResolvedValue(
        createSprintFixture({ id: 'sprint-2', projectId: 'other-project' }),
      );

      await expect(
        service.updateTask('task-1', { sprintId: 'sprint-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned assignee belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.updateTask('task-1', { assigneeId: 'employee-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('soft-deletes a task', async () => {
      repository.findById.mockResolvedValue(createTaskFixture());
      repository.softDelete.mockResolvedValue(
        createTaskFixture({ isActive: false }),
      );

      await service.deleteTask('task-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('task-1', 'admin-1');
    });

    it('throws NotFoundException when the task does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteTask('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreTask', () => {
    it('restores a soft-deleted task', async () => {
      repository.findById.mockResolvedValue(
        createTaskFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createTaskFixture());

      const result = await service.restoreTask('task-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('task-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
