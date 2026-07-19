import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Deliverable } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { DeliverableSortField } from './dto/query-deliverables.dto';
import type { DeliverableStatus } from './constants/deliverable-status';
import type { DeliverableType } from './constants/deliverable-type';

export interface CreateDeliverableData {
  organizationId: string;
  projectId: string;
  milestoneId?: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  dueDate?: Date;
  submittedDate?: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateDeliverableData {
  organizationId?: string;
  projectId?: string;
  milestoneId?: string | null;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  dueDate?: Date | null;
  submittedDate?: Date | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyDeliverablesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  milestoneId?: string;
  ownerId?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  sortBy: DeliverableSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class DeliverablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Deliverable | null> {
    return this.prisma.deliverable.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<Deliverable | null> {
    return this.prisma.deliverable.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateDeliverableData): Promise<Deliverable> {
    return this.prisma.deliverable.create({ data });
  }

  update(id: string, data: UpdateDeliverableData): Promise<Deliverable> {
    return this.prisma.deliverable.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Deliverable> {
    return this.prisma.deliverable.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Deliverable> {
    return this.prisma.deliverable.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyDeliverablesOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'milestoneId'
      | 'ownerId'
      | 'type'
      | 'status'
    >,
  ): Prisma.DeliverableWhereInput {
    const where: Prisma.DeliverableWhereInput = {};
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
    if (options.milestoneId) {
      where.milestoneId = options.milestoneId;
    }
    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }
    if (options.type) {
      where.type = options.type;
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
    options: FindManyDeliverablesOptions,
  ): Promise<[Deliverable[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.deliverable.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.deliverable.count({ where }),
    ]);
    return [items, total];
  }
}
