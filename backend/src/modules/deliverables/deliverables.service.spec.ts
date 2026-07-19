import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  Deliverable,
  Milestone,
  Project,
} from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { MilestonesService } from '../milestones/milestones.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import { DeliverablesRepository } from './deliverables.repository';
import { DeliverablesService } from './deliverables.service';

function createDeliverableFixture(
  overrides: Partial<Deliverable> = {},
): Deliverable {
  return {
    id: 'deliverable-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    milestoneId: null,
    ownerId: null,
    name: 'Beta Launch Readiness Report',
    code: 'BETA-RPT',
    description: null,
    type: 'REPORT',
    status: 'PENDING',
    dueDate: new Date('2026-04-23'),
    submittedDate: null,
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

describe('DeliverablesService', () => {
  let repository: jest.Mocked<DeliverablesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let milestonesService: jest.Mocked<MilestonesService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: DeliverablesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<DeliverablesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    milestonesService = {
      getMilestoneOrThrow: jest.fn(),
    } as unknown as jest.Mocked<MilestonesService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new DeliverablesService(
      repository,
      organizationsService,
      projectsService,
      milestonesService,
      employeesService,
    );
  });

  describe('createDeliverable', () => {
    it('creates a deliverable once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createDeliverableFixture());

      const result = await service.createDeliverable(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch Readiness Report',
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
      expect(result.name).toBe('Beta Launch Readiness Report');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch Readiness Report',
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
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch Readiness Report',
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
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch Readiness Report',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the milestone belongs to the same project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      milestonesService.getMilestoneOrThrow.mockResolvedValue(
        createMilestoneFixture({ projectId: 'other-project' }),
      );

      await expect(
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          milestoneId: 'milestone-1',
          name: 'Beta Launch Readiness Report',
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
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          ownerId: 'employee-1',
          name: 'Beta Launch Readiness Report',
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
        createDeliverableFixture(),
      );

      await expect(
        service.createDeliverable({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Beta Launch Readiness Report',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateDeliverable', () => {
    it('updates a deliverable when found and name is free', async () => {
      repository.findById.mockResolvedValue(createDeliverableFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createDeliverableFixture({ status: 'SUBMITTED' }),
      );

      const result = await service.updateDeliverable(
        'deliverable-1',
        { status: 'SUBMITTED' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'deliverable-1',
        expect.objectContaining({ status: 'SUBMITTED' }),
      );
      expect(result.status).toBe('SUBMITTED');
    });

    it('throws NotFoundException when the deliverable does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateDeliverable('missing', { status: 'SUBMITTED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another deliverable in the same project', async () => {
      repository.findById.mockResolvedValue(createDeliverableFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createDeliverableFixture({ id: 'other-deliverable' }),
      );

      await expect(
        service.updateDeliverable('deliverable-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createDeliverableFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateDeliverable('deliverable-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('clears the milestone when milestoneId is set to null', async () => {
      repository.findById.mockResolvedValue(
        createDeliverableFixture({ milestoneId: 'milestone-1' }),
      );
      repository.update.mockResolvedValue(
        createDeliverableFixture({ milestoneId: null }),
      );

      await service.updateDeliverable('deliverable-1', { milestoneId: null });

      expect(repository.update).toHaveBeenCalledWith(
        'deliverable-1',
        expect.objectContaining({ milestoneId: null }),
      );
    });
  });

  describe('deleteDeliverable', () => {
    it('soft-deletes a deliverable', async () => {
      repository.findById.mockResolvedValue(createDeliverableFixture());
      repository.softDelete.mockResolvedValue(
        createDeliverableFixture({ isActive: false }),
      );

      await service.deleteDeliverable('deliverable-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'deliverable-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the deliverable does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteDeliverable('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreDeliverable', () => {
    it('restores a soft-deleted deliverable', async () => {
      repository.findById.mockResolvedValue(
        createDeliverableFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createDeliverableFixture());

      const result = await service.restoreDeliverable(
        'deliverable-1',
        'admin-1',
      );

      expect(repository.restore).toHaveBeenCalledWith(
        'deliverable-1',
        'admin-1',
      );
      expect(result.isActive).toBe(true);
    });
  });
});
