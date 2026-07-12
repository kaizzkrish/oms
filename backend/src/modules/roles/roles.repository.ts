import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Permission,
  RolePermission,
  User,
  UserRole,
} from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { RoleSortField } from './dto/query-roles.dto';
import type { RoleWithUserCount } from './entities/role.entity';

export interface CreateRoleData {
  name: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyRolesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  sortBy: RoleSortField;
  sortOrder: 'asc' | 'desc';
}

const WITH_USER_COUNT = {
  include: { _count: { select: { userRoles: true } } },
} as const;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<RoleWithUserCount | null> {
    return this.prisma.role.findUnique({ where: { id }, ...WITH_USER_COUNT });
  }

  findByName(name: string): Promise<RoleWithUserCount | null> {
    return this.prisma.role.findUnique({
      where: { name },
      ...WITH_USER_COUNT,
    });
  }

  create(data: CreateRoleData): Promise<RoleWithUserCount> {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
      ...WITH_USER_COUNT,
    });
  }

  update(id: string, data: UpdateRoleData): Promise<RoleWithUserCount> {
    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
      ...WITH_USER_COUNT,
    });
  }

  softDelete(id: string, deletedBy?: string): Promise<RoleWithUserCount> {
    return this.prisma.role.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
      ...WITH_USER_COUNT,
    });
  }

  restore(id: string, updatedBy?: string): Promise<RoleWithUserCount> {
    return this.prisma.role.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
      ...WITH_USER_COUNT,
    });
  }

  private buildWhere(
    options: Pick<FindManyRolesOptions, 'search' | 'isActive' | 'isSystem'>,
  ): Prisma.RoleWhereInput {
    const where: Prisma.RoleWhereInput = {};
    if (options.isActive === false) {
      // Mirrors the Users module fix: surface soft-deleted roles too when
      // explicitly browsing inactive ones, otherwise they'd be unrestorable.
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
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyRolesOptions,
  ): Promise<[RoleWithUserCount[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
        ...WITH_USER_COUNT,
      }),
      this.prisma.role.count({ where }),
    ]);
    return [items, total];
  }

  findAssignment(userId: string, roleId: string): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  assignUser(
    roleId: string,
    userId: string,
    assignedBy?: string,
  ): Promise<UserRole> {
    return this.prisma.userRole.create({
      data: { roleId, userId, assignedBy },
    });
  }

  async unassignUser(roleId: string, userId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async findUsersForRole(
    roleId: string,
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      userRoles: { some: { roleId } },
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return [items, total];
  }

  findPermissionAssignment(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  assignPermission(
    roleId: string,
    permissionId: string,
    assignedBy?: string,
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data: { roleId, permissionId, assignedBy },
    });
  }

  async unassignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  async findPermissionsForRole(
    roleId: string,
    skip: number,
    take: number,
  ): Promise<[Permission[], number]> {
    const where: Prisma.PermissionWhereInput = {
      deletedAt: null,
      rolePermissions: { some: { roleId } },
    };
    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);
    return [items, total];
  }
}
