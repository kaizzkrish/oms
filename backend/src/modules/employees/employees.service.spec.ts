import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  Department,
  Designation,
  Office,
} from '../../generated/prisma/client';
import type { DepartmentsService } from '../departments/departments.service';
import type { DesignationsService } from '../designations/designations.service';
import type { OfficesService } from '../offices/offices.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { UsersService } from '../users/users.service';
import type { EmployeeWithUser } from './entities/employee.entity';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';

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

function createUserFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jane.doe@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    isActive: true,
    ...overrides,
  };
}

describe('EmployeesService', () => {
  let repository: jest.Mocked<EmployeesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let designationsService: jest.Mocked<DesignationsService>;
  let officesService: jest.Mocked<OfficesService>;
  let usersService: jest.Mocked<UsersService>;
  let service: EmployeesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByOrganizationAndCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<EmployeesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    departmentsService = {
      getDepartmentOrThrow: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsService>;

    designationsService = {
      getDesignationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<DesignationsService>;

    officesService = {
      getOfficeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OfficesService>;

    usersService = {
      getUserOrThrow: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new EmployeesService(
      repository,
      organizationsService,
      departmentsService,
      designationsService,
      officesService,
      usersService,
    );
  });

  describe('createEmployee', () => {
    it('creates an employee once the organization and user are verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      repository.findByUserId.mockResolvedValue(null);
      repository.findByOrganizationAndCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(createEmployeeFixture());

      const result = await service.createEmployee(
        {
          userId: 'user-1',
          organizationId: 'org-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(usersService.getUserOrThrow).toHaveBeenCalledWith('user-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', createdBy: 'admin-1' }),
      );
      expect(result.employeeCode).toBe('EMP-0001');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the user does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockRejectedValue(
        new NotFoundException('User with id "user-1" not found'),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the user already has an employee profile', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      repository.findByUserId.mockResolvedValue(createEmployeeFixture());

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the employee code is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      repository.findByUserId.mockResolvedValue(null);
      repository.findByOrganizationAndCode.mockResolvedValue(
        createEmployeeFixture(),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the department belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      departmentsService.getDepartmentOrThrow.mockResolvedValue(
        createDepartmentFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          departmentId: 'dept-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the designation belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      designationsService.getDesignationOrThrow.mockResolvedValue(
        createDesignationFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          designationId: 'designation-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the office belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      officesService.getOfficeOrThrow.mockResolvedValue(
        createOfficeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          officeId: 'office-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the reporting manager belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      usersService.getUserOrThrow.mockResolvedValue(
        createUserFixture() as never,
      );
      repository.findById.mockResolvedValue(
        createEmployeeFixture({ id: 'manager-1', organizationId: 'other-org' }),
      );

      await expect(
        service.createEmployee({
          userId: 'user-1',
          organizationId: 'org-1',
          reportingManagerId: 'manager-1',
          employeeCode: 'EMP-0001',
          dateOfJoining: '2025-01-06',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateEmployee', () => {
    it('updates an employee when found and the code is free', async () => {
      repository.findById.mockResolvedValue(createEmployeeFixture());
      repository.findByOrganizationAndCode.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createEmployeeFixture({ phone: '+91-9876543210' }),
      );

      const result = await service.updateEmployee(
        'employee-1',
        { phone: '+91-9876543210' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'employee-1',
        expect.objectContaining({ phone: '+91-9876543210' }),
      );
      expect(result.phone).toBe('+91-9876543210');
    });

    it('throws NotFoundException when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateEmployee('missing', { phone: '+91-9876543210' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new code belongs to another employee in the same organization', async () => {
      repository.findById.mockResolvedValue(createEmployeeFixture());
      repository.findByOrganizationAndCode.mockResolvedValue(
        createEmployeeFixture({ id: 'other-employee' }),
      );

      await expect(
        service.updateEmployee('employee-1', { employeeCode: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an employee being set as their own reporting manager', async () => {
      repository.findById.mockResolvedValue(createEmployeeFixture());

      await expect(
        service.updateEmployee('employee-1', {
          reportingManagerId: 'employee-1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmployee', () => {
    it('soft-deletes an employee', async () => {
      repository.findById.mockResolvedValue(createEmployeeFixture());
      repository.softDelete.mockResolvedValue(
        createEmployeeFixture({ isActive: false }),
      );

      await service.deleteEmployee('employee-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'employee-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteEmployee('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreEmployee', () => {
    it('restores a soft-deleted employee', async () => {
      repository.findById.mockResolvedValue(
        createEmployeeFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createEmployeeFixture());

      const result = await service.restoreEmployee('employee-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('employee-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
