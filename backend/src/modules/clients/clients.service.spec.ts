import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Client } from '../../generated/prisma/client';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import type { EmployeesService } from '../employees/employees.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { ClientsRepository } from './clients.repository';
import { ClientsService } from './clients.service';

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

describe('ClientsService', () => {
  let repository: jest.Mocked<ClientsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let employeesService: jest.Mocked<EmployeesService>;
  let service: ClientsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<ClientsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    employeesService = {
      getEmployeeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<EmployeesService>;

    service = new ClientsService(
      repository,
      organizationsService,
      employeesService,
    );
  });

  describe('createClient', () => {
    it('creates a client once the organization is verified to exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createClientFixture());

      const result = await service.createClient(
        { organizationId: 'org-1', name: 'Globex Corporation' },
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
      expect(result.name).toBe('Globex Corporation');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createClient({
          organizationId: 'org-1',
          name: 'Globex Corporation',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      repository.findByOrganizationAndName.mockResolvedValue(
        createClientFixture(),
      );

      await expect(
        service.createClient({
          organizationId: 'org-1',
          name: 'Globex Corporation',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the account manager belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createClient({
          organizationId: 'org-1',
          accountManagerId: 'employee-1',
          name: 'Globex Corporation',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates the client with a matching account manager', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      employeesService.getEmployeeOrThrow.mockResolvedValue(
        createEmployeeFixture({ organizationId: 'org-1' }),
      );
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(
        createClientFixture({ accountManagerId: 'employee-1' }),
      );

      const result = await service.createClient({
        organizationId: 'org-1',
        accountManagerId: 'employee-1',
        name: 'Globex Corporation',
      });

      expect(result.accountManagerId).toBe('employee-1');
    });
  });

  describe('updateClient', () => {
    it('updates a client when found and name is free', async () => {
      repository.findById.mockResolvedValue(createClientFixture());
      repository.findByOrganizationAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createClientFixture({ description: 'Updated' }),
      );

      const result = await service.updateClient(
        'client-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the client does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateClient('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another client in the same organization', async () => {
      repository.findById.mockResolvedValue(createClientFixture());
      repository.findByOrganizationAndName.mockResolvedValue(
        createClientFixture({ id: 'other-client' }),
      );

      await expect(
        service.updateClient('client-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteClient', () => {
    it('soft-deletes a client', async () => {
      repository.findById.mockResolvedValue(createClientFixture());
      repository.softDelete.mockResolvedValue(
        createClientFixture({ isActive: false }),
      );

      await service.deleteClient('client-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('client-1', 'admin-1');
    });

    it('throws NotFoundException when the client does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteClient('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreClient', () => {
    it('restores a soft-deleted client', async () => {
      repository.findById.mockResolvedValue(
        createClientFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createClientFixture());

      const result = await service.restoreClient('client-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('client-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
