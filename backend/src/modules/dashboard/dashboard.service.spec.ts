import type { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

function createPrismaMock() {
  return {
    organization: { count: jest.fn() },
    employee: { count: jest.fn() },
    project: { count: jest.fn(), groupBy: jest.fn() },
    task: { count: jest.fn(), groupBy: jest.fn() },
    deliverable: { count: jest.fn(), groupBy: jest.fn() },
    document: { aggregate: jest.fn() },
  } as unknown as jest.Mocked<PrismaService> & {
    organization: { count: jest.Mock };
    employee: { count: jest.Mock };
    project: { count: jest.Mock; groupBy: jest.Mock };
    task: { count: jest.Mock; groupBy: jest.Mock };
    deliverable: { count: jest.Mock; groupBy: jest.Mock };
    document: { aggregate: jest.Mock };
  };
}

describe('DashboardService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: DashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DashboardService(prisma);
  });

  describe('getSummary', () => {
    it('aggregates counts and status breakdowns with zero-filled statuses', async () => {
      prisma.organization.count.mockResolvedValue(3);
      prisma.employee.count.mockResolvedValue(42);
      prisma.project.count.mockResolvedValue(10);
      prisma.project.groupBy.mockResolvedValue([
        { status: 'IN_PROGRESS', _count: 6 },
        { status: 'COMPLETED', _count: 4 },
      ]);
      prisma.task.count.mockResolvedValue(50);
      prisma.task.groupBy.mockResolvedValue([
        { status: 'TODO', _count: 20 },
        { status: 'DONE', _count: 30 },
      ]);
      prisma.deliverable.count.mockResolvedValue(8);
      prisma.deliverable.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 8 },
      ]);
      prisma.document.aggregate.mockResolvedValue({
        _count: 5,
        _sum: { sizeBytes: 10240 },
      });

      const result = await service.getSummary();

      expect(result.organizations).toBe(3);
      expect(result.employees).toBe(42);
      expect(result.projects).toEqual({
        total: 10,
        byStatus: {
          PLANNING: 0,
          IN_PROGRESS: 6,
          ON_HOLD: 0,
          COMPLETED: 4,
          CANCELLED: 0,
        },
      });
      expect(result.tasks.byStatus).toEqual({
        TODO: 20,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 30,
        BLOCKED: 0,
        CANCELLED: 0,
      });
      expect(result.deliverables.byStatus).toEqual({
        PENDING: 8,
        IN_PROGRESS: 0,
        SUBMITTED: 0,
        ACCEPTED: 0,
        REJECTED: 0,
      });
      expect(result.documents).toEqual({ total: 5, totalSizeBytes: 10240 });
    });

    it('defaults totalSizeBytes to 0 when there are no documents', async () => {
      prisma.organization.count.mockResolvedValue(0);
      prisma.employee.count.mockResolvedValue(0);
      prisma.project.count.mockResolvedValue(0);
      prisma.project.groupBy.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);
      prisma.task.groupBy.mockResolvedValue([]);
      prisma.deliverable.count.mockResolvedValue(0);
      prisma.deliverable.groupBy.mockResolvedValue([]);
      prisma.document.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { sizeBytes: null },
      });

      const result = await service.getSummary();

      expect(result.documents).toEqual({ total: 0, totalSizeBytes: 0 });
    });

    it('scopes every query by organizationId when provided', async () => {
      prisma.organization.count.mockResolvedValue(3);
      prisma.employee.count.mockResolvedValue(5);
      prisma.project.count.mockResolvedValue(2);
      prisma.project.groupBy.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(4);
      prisma.task.groupBy.mockResolvedValue([]);
      prisma.deliverable.count.mockResolvedValue(1);
      prisma.deliverable.groupBy.mockResolvedValue([]);
      prisma.document.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { sizeBytes: 100 },
      });

      await service.getSummary('org-1');

      expect(prisma.employee.count).toHaveBeenCalledWith({
        where: { deletedAt: null, organizationId: 'org-1' },
      });
      expect(prisma.project.count).toHaveBeenCalledWith({
        where: { deletedAt: null, organizationId: 'org-1' },
      });
      expect(prisma.task.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, organizationId: 'org-1' },
        }),
      );
      expect(prisma.deliverable.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, organizationId: 'org-1' },
        }),
      );
      expect(prisma.document.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, organizationId: 'org-1' },
        }),
      );
      // Organizations count is always global, never scoped.
      expect(prisma.organization.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });
});
