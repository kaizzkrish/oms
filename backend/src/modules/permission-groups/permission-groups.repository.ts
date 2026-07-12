import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { PermissionGroupSortField } from './dto/query-permission-groups.dto';
import type { PermissionGroupWithCount } from './entities/permission-group.entity';

export interface CreatePermissionGroupData {
  name: string;
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdatePermissionGroupData {
  name?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyPermissionGroupsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  sortBy: PermissionGroupSortField;
  sortOrder: 'asc' | 'desc';
}

const WITH_PERMISSION_COUNT = {
  // Prisma's relation _count includes soft-deleted rows unless filtered
  // explicitly — a group containing only soft-deleted permissions should
  // still be deletable, so the count that guards deletion must exclude them.
  include: {
    _count: { select: { permissions: { where: { deletedAt: null } } } },
  },
} as const;

@Injectable()
export class PermissionGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<PermissionGroupWithCount | null> {
    return this.prisma.permissionGroup.findUnique({
      where: { id },
      ...WITH_PERMISSION_COUNT,
    });
  }

  findByName(name: string): Promise<PermissionGroupWithCount | null> {
    return this.prisma.permissionGroup.findUnique({
      where: { name },
      ...WITH_PERMISSION_COUNT,
    });
  }

  create(data: CreatePermissionGroupData): Promise<PermissionGroupWithCount> {
    return this.prisma.permissionGroup.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
      ...WITH_PERMISSION_COUNT,
    });
  }

  update(
    id: string,
    data: UpdatePermissionGroupData,
  ): Promise<PermissionGroupWithCount> {
    return this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
      ...WITH_PERMISSION_COUNT,
    });
  }

  softDelete(
    id: string,
    deletedBy?: string,
  ): Promise<PermissionGroupWithCount> {
    return this.prisma.permissionGroup.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
      ...WITH_PERMISSION_COUNT,
    });
  }

  restore(id: string, updatedBy?: string): Promise<PermissionGroupWithCount> {
    return this.prisma.permissionGroup.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
      ...WITH_PERMISSION_COUNT,
    });
  }

  private buildWhere(
    options: Pick<FindManyPermissionGroupsOptions, 'search' | 'isActive'>,
  ): Prisma.PermissionGroupWhereInput {
    const where: Prisma.PermissionGroupWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyPermissionGroupsOptions,
  ): Promise<[PermissionGroupWithCount[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
        ...WITH_PERMISSION_COUNT,
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);
    return [items, total];
  }
}
