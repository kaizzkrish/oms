import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Sprint } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { SprintSortField } from './dto/query-sprints.dto';
import type { SprintStatus } from './constants/sprint-status';

export interface CreateSprintData {
  organizationId: string;
  projectId: string;
  teamId?: string;
  scrumMasterId?: string;
  name: string;
  code?: string;
  goal?: string;
  status?: SprintStatus;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateSprintData {
  organizationId?: string;
  projectId?: string;
  teamId?: string | null;
  scrumMasterId?: string | null;
  name?: string;
  code?: string;
  goal?: string;
  status?: SprintStatus;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManySprintsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  teamId?: string;
  scrumMasterId?: string;
  status?: SprintStatus;
  sortBy: SprintSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class SprintsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Sprint | null> {
    return this.prisma.sprint.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<Sprint | null> {
    return this.prisma.sprint.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateSprintData): Promise<Sprint> {
    return this.prisma.sprint.create({ data });
  }

  update(id: string, data: UpdateSprintData): Promise<Sprint> {
    return this.prisma.sprint.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Sprint> {
    return this.prisma.sprint.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Sprint> {
    return this.prisma.sprint.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManySprintsOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'teamId'
      | 'scrumMasterId'
      | 'status'
    >,
  ): Prisma.SprintWhereInput {
    const where: Prisma.SprintWhereInput = {};
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
    if (options.teamId) {
      where.teamId = options.teamId;
    }
    if (options.scrumMasterId) {
      where.scrumMasterId = options.scrumMasterId;
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

  async findMany(options: FindManySprintsOptions): Promise<[Sprint[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.sprint.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.sprint.count({ where }),
    ]);
    return [items, total];
  }
}
