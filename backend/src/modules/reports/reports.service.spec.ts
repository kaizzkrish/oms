import { NotFoundException } from '@nestjs/common';
import type { Report } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../common/storage/storage.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

function createReportFixture(overrides: Partial<Report> = {}): Report {
  return {
    id: 'report-1',
    organizationId: 'org-1',
    name: 'Tasks Report - 2026-04-23',
    type: 'TASKS',
    format: 'CSV',
    fileName: 'tasks-123.csv',
    storagePath: 'reports/org-1/uuid-tasks-123.csv',
    mimeType: 'text/csv',
    sizeBytes: 256,
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

function createPrismaMock() {
  return {
    project: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    deliverable: { findMany: jest.fn() },
    employee: { findMany: jest.fn() },
  } as unknown as jest.Mocked<PrismaService> & {
    project: { findMany: jest.Mock };
    task: { findMany: jest.Mock };
    deliverable: { findMany: jest.Mock };
    employee: { findMany: jest.Mock };
  };
}

describe('ReportsService', () => {
  let repository: jest.Mocked<ReportsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let storageService: jest.Mocked<StorageService>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ReportsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    storageService = {
      save: jest.fn(),
      getAbsolutePath: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    prisma = createPrismaMock();

    service = new ReportsService(
      repository,
      organizationsService,
      storageService,
      prisma,
    );
  });

  describe('generateReport', () => {
    it('generates a TASKS report once the organization is verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          name: 'Build hero banner',
          code: 'HERO-1',
          type: 'TASK',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: new Date('2026-01-24'),
          estimatedHours: 12,
          actualHours: null,
          createdAt: new Date('2026-01-01'),
        },
      ]);
      storageService.save.mockResolvedValue('reports/org-1/uuid-tasks-1.csv');
      repository.create.mockResolvedValue(createReportFixture());

      const result = await service.generateReport(
        { organizationId: 'org-1', type: 'TASKS' },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1', deletedAt: null },
        }),
      );
      expect(storageService.save).toHaveBeenCalledWith(
        expect.any(Buffer),
        'reports/org-1',
        expect.stringMatching(/^tasks-\d+\.csv$/),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          type: 'TASKS',
          format: 'CSV',
          mimeType: 'text/csv',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Tasks Report - 2026-04-23');
    });

    it('defaults the report name using the type and current date', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      prisma.project.findMany.mockResolvedValue([]);
      storageService.save.mockResolvedValue('reports/org-1/uuid-projects.csv');
      repository.create.mockResolvedValue(createReportFixture());

      await service.generateReport({
        organizationId: 'org-1',
        type: 'PROJECTS',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^Projects Report - \d{4}-\d{2}-\d{2}$/),
        }),
      );
    });

    it('uses a caller-provided name when given', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      prisma.deliverable.findMany.mockResolvedValue([]);
      storageService.save.mockResolvedValue(
        'reports/org-1/uuid-deliverables.csv',
      );
      repository.create.mockResolvedValue(createReportFixture());

      await service.generateReport({
        organizationId: 'org-1',
        type: 'DELIVERABLES',
        name: 'Q1 Deliverables Snapshot',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Q1 Deliverables Snapshot' }),
      );
    });

    it('includes the linked user fields for an EMPLOYEES report', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'employee-1',
          employeeCode: 'EMP-0001',
          employmentType: 'FULL_TIME',
          dateOfJoining: new Date('2025-01-06'),
          createdAt: new Date('2025-01-06'),
          user: {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
          },
        },
      ]);
      storageService.save.mockResolvedValue('reports/org-1/uuid-employees.csv');
      repository.create.mockResolvedValue(
        createReportFixture({ type: 'EMPLOYEES' }),
      );

      await service.generateReport({
        organizationId: 'org-1',
        type: 'EMPLOYEES',
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { user: true } }),
      );
      expect(storageService.save).toHaveBeenCalledWith(
        expect.any(Buffer),
        'reports/org-1',
        expect.any(String),
      );
      const savedBuffer = storageService.save.mock.calls[0][0];
      expect(savedBuffer.toString()).toContain('Jane');
      expect(savedBuffer.toString()).toContain('jane.doe@example.com');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.generateReport({ organizationId: 'org-1', type: 'TASKS' }),
      ).rejects.toThrow(NotFoundException);
      expect(storageService.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteReport', () => {
    it('soft-deletes a report', async () => {
      repository.findById.mockResolvedValue(createReportFixture());
      repository.softDelete.mockResolvedValue(
        createReportFixture({ isActive: false }),
      );

      await service.deleteReport('report-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith('report-1', 'admin-1');
    });

    it('throws NotFoundException when the report does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteReport('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreReport', () => {
    it('restores a soft-deleted report', async () => {
      repository.findById.mockResolvedValue(
        createReportFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createReportFixture());

      const result = await service.restoreReport('report-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('report-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('getDownloadInfo', () => {
    it('returns the absolute path, file name, and mime type', async () => {
      repository.findById.mockResolvedValue(createReportFixture());
      storageService.getAbsolutePath.mockReturnValue(
        '/app/storage/reports/org-1/uuid-tasks-123.csv',
      );

      const result = await service.getDownloadInfo('report-1');

      expect(storageService.getAbsolutePath).toHaveBeenCalledWith(
        'reports/org-1/uuid-tasks-123.csv',
      );
      expect(result).toEqual({
        absolutePath: '/app/storage/reports/org-1/uuid-tasks-123.csv',
        fileName: 'tasks-123.csv',
        mimeType: 'text/csv',
      });
    });

    it('throws NotFoundException when the report does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getDownloadInfo('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
