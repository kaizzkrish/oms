import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PROJECT_STATUSES } from '../projects/constants/project-status';
import { TASK_STATUSES } from '../tasks/constants/task-status';
import { DELIVERABLE_STATUSES } from '../deliverables/constants/deliverable-status';
import {
  DashboardSummaryEntity,
  DeliverablesSummaryEntity,
  DocumentsSummaryEntity,
  ProjectsSummaryEntity,
  TasksSummaryEntity,
} from './entities/dashboard-summary.entity';

function buildStatusMap<T extends string>(
  statuses: readonly T[],
  groups: { status: string; _count: number }[],
): Record<T, number> {
  const map = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<T, number>;
  for (const group of groups) {
    map[group.status as T] = group._count;
  }
  return map;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId?: string): Promise<DashboardSummaryEntity> {
    const orgFilter = organizationId ? { organizationId } : {};

    const [
      organizations,
      employees,
      projectTotal,
      projectGroups,
      taskTotal,
      taskGroups,
      deliverableTotal,
      deliverableGroups,
      documentAggregate,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.employee.count({
        where: { deletedAt: null, ...orgFilter },
      }),
      this.prisma.project.count({ where: { deletedAt: null, ...orgFilter } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...orgFilter },
        _count: true,
      }),
      this.prisma.task.count({ where: { deletedAt: null, ...orgFilter } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...orgFilter },
        _count: true,
      }),
      this.prisma.deliverable.count({
        where: { deletedAt: null, ...orgFilter },
      }),
      this.prisma.deliverable.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...orgFilter },
        _count: true,
      }),
      this.prisma.document.aggregate({
        where: { deletedAt: null, ...orgFilter },
        _count: true,
        _sum: { sizeBytes: true },
      }),
    ]);

    return new DashboardSummaryEntity({
      organizations,
      employees,
      projects: new ProjectsSummaryEntity({
        total: projectTotal,
        byStatus: buildStatusMap(PROJECT_STATUSES, projectGroups),
      }),
      tasks: new TasksSummaryEntity({
        total: taskTotal,
        byStatus: buildStatusMap(TASK_STATUSES, taskGroups),
      }),
      deliverables: new DeliverablesSummaryEntity({
        total: deliverableTotal,
        byStatus: buildStatusMap(DELIVERABLE_STATUSES, deliverableGroups),
      }),
      documents: new DocumentsSummaryEntity({
        total: documentAggregate._count,
        totalSizeBytes: documentAggregate._sum.sizeBytes ?? 0,
      }),
    });
  }
}
