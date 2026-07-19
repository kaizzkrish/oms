import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Project, Sprint, Team } from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import type { TeamsService } from '../teams/teams.service';
import { SprintsRepository } from './sprints.repository';
import { SprintsService } from './sprints.service';

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

function createTeamFixture(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    organizationId: 'org-1',
    departmentId: null,
    teamLeaderId: null,
    name: 'Engineering Team',
    code: 'ENG-TEAM',
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

describe('SprintsService', () => {
  let repository: jest.Mocked<SprintsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let teamsService: jest.Mocked<TeamsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: SprintsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<SprintsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    teamsService = {
      getTeamOrThrow: jest.fn(),
    } as unknown as jest.Mocked<TeamsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new SprintsService(
      repository,
      organizationsService,
      projectsService,
      teamsService,
      employeesService,
    );
  });

  describe('createSprint', () => {
    it('creates a sprint once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createSprintFixture());

      const result = await service.createSprint(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
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
      expect(result.name).toBe('Sprint 1');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
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
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
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
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the team belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      teamsService.getTeamOrThrow.mockResolvedValue(
        createTeamFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          teamId: 'team-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the scrum master belongs to the same organization', async () => {
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
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          scrumMasterId: 'employee-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
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
      repository.findByProjectAndName.mockResolvedValue(createSprintFixture());

      await expect(
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-01-13',
          endDate: '2026-01-27',
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
        service.createSprint({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Sprint 1',
          startDate: '2026-06-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSprint', () => {
    it('updates a sprint when found and name is free', async () => {
      repository.findById.mockResolvedValue(createSprintFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createSprintFixture({ goal: 'Updated' }),
      );

      const result = await service.updateSprint(
        'sprint-1',
        { goal: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'sprint-1',
        expect.objectContaining({ goal: 'Updated' }),
      );
      expect(result.goal).toBe('Updated');
    });

    it('throws NotFoundException when the sprint does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateSprint('missing', { goal: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another sprint in the same project', async () => {
      repository.findById.mockResolvedValue(createSprintFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createSprintFixture({ id: 'other-sprint' }),
      );

      await expect(
        service.updateSprint('sprint-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createSprintFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateSprint('sprint-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a new end date before the existing start date', async () => {
      repository.findById.mockResolvedValue(
        createSprintFixture({ startDate: new Date('2026-06-01') }),
      );

      await expect(
        service.updateSprint('sprint-1', { endDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSprint', () => {
    it('soft-deletes a sprint', async () => {
      repository.findById.mockResolvedValue(createSprintFixture());
      repository.softDelete.mockResolvedValue(
        createSprintFixture({ isActive: false }),
      );

      await service.deleteSprint('sprint-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('sprint-1', 'admin-1');
    });

    it('throws NotFoundException when the sprint does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteSprint('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreSprint', () => {
    it('restores a soft-deleted sprint', async () => {
      repository.findById.mockResolvedValue(
        createSprintFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createSprintFixture());

      const result = await service.restoreSprint('sprint-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('sprint-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
