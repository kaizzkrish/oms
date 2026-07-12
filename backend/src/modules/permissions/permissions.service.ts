import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { Permission } from '../../generated/prisma/client';
import { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { QueryPermissionsDto } from './dto/query-permissions.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsRepository } from './permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
    private readonly permissionGroupsService: PermissionGroupsService,
  ) {}

  async getPermissionOrThrow(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }
    return permission;
  }

  findByName(name: string): Promise<Permission | null> {
    return this.permissionsRepository.findByName(name);
  }

  async listPermissions(
    query: QueryPermissionsDto,
  ): Promise<PaginatedResult<Permission>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.permissionsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      isSystem: query.isSystem,
      groupId: query.groupId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createPermission(
    dto: CreatePermissionDto,
    createdBy?: string,
  ): Promise<Permission> {
    const existing = await this.permissionsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('A permission with this name already exists');
    }
    if (dto.groupId) {
      await this.permissionGroupsService.getGroupOrThrow(dto.groupId);
    }
    return this.permissionsRepository.create({
      name: dto.name,
      description: dto.description,
      groupId: dto.groupId,
      isActive: dto.isActive,
      createdBy,
    });
  }

  /** isSystem is deliberately absent from CreatePermissionDto; only the seed script calls this. */
  createSystemPermission(
    name: string,
    description: string,
    groupId?: string,
  ): Promise<Permission> {
    return this.permissionsRepository.create({
      name,
      description,
      groupId,
      isSystem: true,
      isActive: true,
    });
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    updatedBy?: string,
  ): Promise<Permission> {
    const permission = await this.getPermissionOrThrow(id);

    if (
      permission.isSystem &&
      dto.name !== undefined &&
      dto.name !== permission.name
    ) {
      throw new BadRequestException('System permissions cannot be renamed');
    }
    if (permission.isSystem && dto.isActive === false) {
      throw new BadRequestException('System permissions cannot be deactivated');
    }
    if (dto.name) {
      const existing = await this.permissionsRepository.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A permission with this name already exists',
        );
      }
    }
    if (dto.groupId) {
      await this.permissionGroupsService.getGroupOrThrow(dto.groupId);
    }

    return this.permissionsRepository.update(id, {
      name: dto.name,
      description: dto.description,
      groupId: dto.groupId,
      isActive: dto.isActive,
      updatedBy,
    });
  }

  async deletePermission(id: string, deletedBy?: string): Promise<void> {
    const permission = await this.getPermissionOrThrow(id);
    if (permission.isSystem) {
      throw new BadRequestException('System permissions cannot be deleted');
    }
    const roleCount = await this.permissionsRepository.countRoleAssignments(id);
    if (roleCount > 0) {
      throw new ConflictException(
        `Cannot delete a permission assigned to ${roleCount} role(s). Unassign them first.`,
      );
    }
    await this.permissionsRepository.softDelete(id, deletedBy);
  }

  async restorePermission(id: string, updatedBy?: string): Promise<Permission> {
    await this.getPermissionOrThrow(id);
    return this.permissionsRepository.restore(id, updatedBy);
  }

  async getEffectivePermissionNames(userId: string): Promise<Set<string>> {
    const names =
      await this.permissionsRepository.findEffectivePermissionNames(userId);
    return new Set(names);
  }
}
