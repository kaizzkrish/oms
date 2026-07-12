import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Permission } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { PermissionSortField } from './dto/query-permissions.dto';

export interface CreatePermissionData {
  name: string;
  description?: string;
  groupId?: string;
  isSystem?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdatePermissionData {
  name?: string;
  description?: string;
  groupId?: string | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyPermissionsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  groupId?: string;
  sortBy: PermissionSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { name } });
  }

  create(data: CreatePermissionData): Promise<Permission> {
    return this.prisma.permission.create({
      data: {
        name: data.name,
        description: data.description,
        groupId: data.groupId,
        isSystem: data.isSystem,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
    });
  }

  update(id: string, data: UpdatePermissionData): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        groupId: data.groupId,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
    });
  }

  softDelete(id: string, deletedBy?: string): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyPermissionsOptions,
      'search' | 'isActive' | 'isSystem' | 'groupId'
    >,
  ): Prisma.PermissionWhereInput {
    const where: Prisma.PermissionWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.isSystem !== undefined) {
      where.isSystem = options.isSystem;
    }
    if (options.groupId !== undefined) {
      where.groupId = options.groupId;
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
    options: FindManyPermissionsOptions,
  ): Promise<[Permission[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.permission.count({ where }),
    ]);
    return [items, total];
  }

  countRoleAssignments(permissionId: string): Promise<number> {
    return this.prisma.rolePermission.count({ where: { permissionId } });
  }

  /** Every permission name granted to `userId` through an active role's active permissions. */
  async findEffectivePermissionNames(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, role: { isActive: true, deletedAt: null } },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: {
                permission: { isActive: true, deletedAt: null },
              },
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    const names = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        names.add(rolePermission.permission.name);
      }
    }
    return [...names];
  }
}
