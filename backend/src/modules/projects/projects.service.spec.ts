import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  Client,
  Department,
  Project,
  Team,
} from '../../generated/prisma/client';
import type { ClientsService } from '../clients/clients.service';
import type { DepartmentsService } from '../departments/departments.service';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { TeamsService } from '../teams/teams.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

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

function createClientFixture(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    accountManagerId: null,
    name: 'Globex Corporation',
    code: 'GLOBEX',
    industry: null,
    website: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
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

function createTeamFixture(
  overrides: Partial<Team> & { memberCount?: number } = {},
): Team & { _count: { members: number } } {
  const { memberCount = 0, ...teamOverrides } = overrides;
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
    ...teamOverrides,
    _count: { members: memberCount },
  };
}

describe('ProjectsService', () => {
  let repository: jest.Mocked<ProjectsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let clientsService: jest.Mocked<ClientsService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let teamsService: jest.Mocked<TeamsService>;
  let service: ProjectsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<ProjectsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    clientsService = {
      getClientOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ClientsService>;

    departmentsService = {
      getDepartmentOrThrow: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    teamsService = {
      getTeamOrThrow: jest.fn(),
    } as unknown as jest.Mocked<TeamsService>;

    service = new ProjectsService(
      repository,
      organizationsService,
      clientsService,
      departmentsService,
      employeesService,
      teamsService,
    );
  });

  describe('createProject', () => {
    it('creates a project once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createProjectFixture());

      const result = await service.createProject(
        { organizationId: 'org-1', name: 'Website Redesign' },
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
      expect(result.name).toBe('Website Redesign');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(
        createProjectFixture(),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the client belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      clientsService.getClientOrThrow.mockResolvedValue(
        createClientFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          clientId: 'client-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
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
        service.createProject({
          organizationId: 'org-1',
          departmentId: 'dept-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the project manager belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          projectManagerId: 'employee-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the team belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      teamsService.getTeamOrThrow.mockResolvedValue(
        createTeamFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          teamId: 'team-1',
          name: 'Website Redesign',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );

      await expect(
        service.createProject({
          organizationId: 'org-1',
          name: 'Website Redesign',
          startDate: '2026-06-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('updates a project when found and name is free', async () => {
      repository.findById.mockResolvedValue(createProjectFixture());
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createProjectFixture({ description: 'Updated' }),
      );

      const result = await service.updateProject(
        'project-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the project does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProject('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another project in the same organization', async () => {
      repository.findById.mockResolvedValue(createProjectFixture());
      repository.findByOrganizationAndName.mockResolvedValue(
        createProjectFixture({ id: 'other-project' }),
      );

      await expect(
        service.updateProject('project-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a new end date before the existing start date', async () => {
      repository.findById.mockResolvedValue(
        createProjectFixture({ startDate: new Date('2026-06-01') }),
      );

      await expect(
        service.updateProject('project-1', { endDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('soft-deletes a project', async () => {
      repository.findById.mockResolvedValue(createProjectFixture());
      repository.softDelete.mockResolvedValue(
        createProjectFixture({ isActive: false }),
      );

      await service.deleteProject('project-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'project-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the project does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteProject('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreProject', () => {
    it('restores a soft-deleted project', async () => {
      repository.findById.mockResolvedValue(
        createProjectFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createProjectFixture());

      const result = await service.restoreProject('project-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('project-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
