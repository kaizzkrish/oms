import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Department, Team } from '../../generated/prisma/client';
import type { DepartmentsService } from '../departments/departments.service';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

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

describe('TeamsService', () => {
  let repository: jest.Mocked<TeamsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: TeamsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
      findMembership: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      findMembersForTeam: jest.fn(),
    } as unknown as jest.Mocked<TeamsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    departmentsService = {
      getDepartmentOrThrow: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new TeamsService(
      repository,
      organizationsService,
      departmentsService,
      employeesService,
    );
  });

  describe('createTeam', () => {
    it('creates a team once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createTeamFixture());

      const result = await service.createTeam(
        { organizationId: 'org-1', name: 'Engineering Team' },
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
      expect(result.name).toBe('Engineering Team');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createTeam({
          organizationId: 'org-1',
          name: 'Engineering Team',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(
        createTeamFixture(),
      );

      await expect(
        service.createTeam({
          organizationId: 'org-1',
          name: 'Engineering Team',
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
        service.createTeam({
          organizationId: 'org-1',
          departmentId: 'dept-1',
          name: 'Engineering Team',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the team leader belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createTeam({
          organizationId: 'org-1',
          teamLeaderId: 'employee-1',
          name: 'Engineering Team',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTeam', () => {
    it('updates a team when found and name is free', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createTeamFixture({ description: 'Updated' }),
      );

      const result = await service.updateTeam(
        'team-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'team-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the team does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateTeam('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another team in the same organization', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      repository.findByOrganizationAndName.mockResolvedValue(
        createTeamFixture({ id: 'other-team' }),
      );

      await expect(
        service.updateTeam('team-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteTeam', () => {
    it('soft-deletes a team with no members', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      repository.softDelete.mockResolvedValue(
        createTeamFixture({ isActive: false }),
      );

      await service.deleteTeam('team-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('team-1', 'admin-1');
    });

    it('throws ConflictException when the team still has members', async () => {
      repository.findById.mockResolvedValue(
        createTeamFixture({ memberCount: 2 }),
      );

      await expect(service.deleteTeam('team-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the team does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteTeam('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreTeam', () => {
    it('restores a soft-deleted team', async () => {
      repository.findById.mockResolvedValue(
        createTeamFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createTeamFixture());

      const result = await service.restoreTeam('team-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('team-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('addMember', () => {
    it('adds an employee from the same organization to an active team', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture(),
      );
      repository.findMembership.mockResolvedValue(null);

      await service.addMember('team-1', 'employee-1', 'admin-1');

      expect(repository.addMember).toHaveBeenCalledWith(
        'team-1',
        'employee-1',
        'admin-1',
      );
    });

    it('rejects adding members to an inactive team', async () => {
      repository.findById.mockResolvedValue(
        createTeamFixture({ isActive: false }),
      );

      await expect(service.addMember('team-1', 'employee-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.addMember).not.toHaveBeenCalled();
    });

    it('rejects an employee from a different organization', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(service.addMember('team-1', 'employee-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.addMember).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the employee is already a member', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture(),
      );
      repository.findMembership.mockResolvedValue({
        id: 'membership-1',
        teamId: 'team-1',
        employeeId: 'employee-1',
        joinedAt: new Date(),
        addedBy: null,
      });

      await expect(service.addMember('team-1', 'employee-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.addMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('removes an existing membership', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      repository.findMembership.mockResolvedValue({
        id: 'membership-1',
        teamId: 'team-1',
        employeeId: 'employee-1',
        joinedAt: new Date(),
        addedBy: null,
      });

      await service.removeMember('team-1', 'employee-1');

      expect(repository.removeMember).toHaveBeenCalledWith(
        'team-1',
        'employee-1',
      );
    });

    it('throws NotFoundException when the employee is not a member', async () => {
      repository.findById.mockResolvedValue(createTeamFixture());
      repository.findMembership.mockResolvedValue(null);

      await expect(
        service.removeMember('team-1', 'employee-1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.removeMember).not.toHaveBeenCalled();
    });
  });
});
