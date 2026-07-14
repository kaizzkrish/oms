import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Milestone } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { MilestoneSortField } from './dto/query-milestones.dto';
import type { MilestoneStatus } from './constants/milestone-status';

export interface CreateMilestoneData {
  organizationId: string;
  projectId: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate: Date;
  achievedDate?: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateMilestoneData {
  organizationId?: string;
  projectId?: string;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate?: Date;
  achievedDate?: Date | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyMilestonesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  ownerId?: string;
  status?: MilestoneStatus;
  sortBy: MilestoneSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class MilestonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Milestone | null> {
    return this.prisma.milestone.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<Milestone | null> {
    return this.prisma.milestone.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateMilestoneData): Promise<Milestone> {
    return this.prisma.milestone.create({ data });
  }

  update(id: string, data: UpdateMilestoneData): Promise<Milestone> {
    return this.prisma.milestone.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Milestone> {
    return this.prisma.milestone.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Milestone> {
    return this.prisma.milestone.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyMilestonesOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'ownerId'
      | 'status'
    >,
  ): Prisma.MilestoneWhereInput {
    const where: Prisma.MilestoneWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }
    if (options.projectId) {
      where.projectId = options.projectId;
    }
    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyMilestonesOptions,
  ): Promise<[Milestone[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.milestone.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.milestone.count({ where }),
    ]);
    return [items, total];
  }
}
