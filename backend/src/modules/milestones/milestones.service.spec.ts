import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Milestone, Project } from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import { MilestonesRepository } from './milestones.repository';
import { MilestonesService } from './milestones.service';

function createMilestoneFixture(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'milestone-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    ownerId: null,
    name: 'Beta Launch',
    code: 'BETA',
    description: null,
    status: 'PENDING',
    dueDate: new Date('2026-04-30'),
    achievedDate: null,
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

describe('MilestonesService', () => {
  let repository: jest.Mocked<MilestonesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: MilestonesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<MilestonesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new MilestonesService(
      repository,
      organizationsService,
      projectsService,
      employeesService,
    );
  });

  describe('createMilestone', () => {
    it('creates a milestone once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createMilestoneFixture());

      const result = await service.createMilestone(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
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
      expect(result.name).toBe('Beta Launch');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createMilestone({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
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
        service.createMilestone({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
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
        service.createMilestone({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
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
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createMilestone({
          organizationId: 'org-1',
          projectId: 'project-1',
          ownerId: 'employee-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
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
      repository.findByProjectAndName.mockResolvedValue(
        createMilestoneFixture(),
      );

      await expect(
        service.createMilestone({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch',
          dueDate: '2026-04-30',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateMilestone', () => {
    it('updates a milestone when found and name is free', async () => {
      repository.findById.mockResolvedValue(createMilestoneFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createMilestoneFixture({ description: 'Updated' }),
      );

      const result = await service.updateMilestone(
        'milestone-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'milestone-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the milestone does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateMilestone('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another milestone in the same project', async () => {
      repository.findById.mockResolvedValue(createMilestoneFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createMilestoneFixture({ id: 'other-milestone' }),
      );

      await expect(
        service.updateMilestone('milestone-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createMilestoneFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateMilestone('milestone-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMilestone', () => {
    it('soft-deletes a milestone', async () => {
      repository.findById.mockResolvedValue(createMilestoneFixture());
      repository.softDelete.mockResolvedValue(
        createMilestoneFixture({ isActive: false }),
      );

      await service.deleteMilestone('milestone-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'milestone-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the milestone does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteMilestone('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreMilestone', () => {
    it('restores a soft-deleted milestone', async () => {
      repository.findById.mockResolvedValue(
        createMilestoneFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createMilestoneFixture());

      const result = await service.restoreMilestone('milestone-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('milestone-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
