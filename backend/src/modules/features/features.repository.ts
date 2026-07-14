import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Feature } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { FeatureSortField } from './dto/query-features.dto';
import type { FeaturePriority } from './constants/feature-priority';
import type { FeatureStatus } from './constants/feature-status';

export interface CreateFeatureData {
  organizationId: string;
  projectId: string;
  moduleId: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateFeatureData {
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyFeaturesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  ownerId?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  sortBy: FeatureSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class FeaturesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { id } });
  }

  findByModuleAndName(moduleId: string, name: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({
      where: { moduleId_name: { moduleId, name } },
    });
  }

  create(data: CreateFeatureData): Promise<Feature> {
    return this.prisma.feature.create({ data });
  }

  update(id: string, data: UpdateFeatureData): Promise<Feature> {
    return this.prisma.feature.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Feature> {
    return this.prisma.feature.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Feature> {
    return this.prisma.feature.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyFeaturesOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'moduleId'
      | 'ownerId'
      | 'status'
      | 'priority'
    >,
  ): Prisma.FeatureWhereInput {
    const where: Prisma.FeatureWhereInput = {};
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
    if (options.moduleId) {
      where.moduleId = options.moduleId;
    }
    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.priority) {
      where.priority = options.priority;
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
    options: FindManyFeaturesOptions,
  ): Promise<[Feature[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.feature.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.feature.count({ where }),
    ]);
    return [items, total];
  }
}
