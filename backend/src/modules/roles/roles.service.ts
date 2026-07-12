import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { User } from '../../generated/prisma/client';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UsersService } from '../users/users.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { QueryRolesDto } from './dto/query-roles.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import type { RoleWithUserCount } from './entities/role.entity';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersService: UsersService,
  ) {}

  findByName(name: string): Promise<RoleWithUserCount | null> {
    return this.rolesRepository.findByName(name);
  }

  async hasUserRole(userId: string, roleId: string): Promise<boolean> {
    const assignment = await this.rolesRepository.findAssignment(
      userId,
      roleId,
    );
    return assignment !== null;
  }

  async getRoleOrThrow(id: string): Promise<RoleWithUserCount> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return role;
  }

  async listRoles(
    query: QueryRolesDto,
  ): Promise<PaginatedResult<RoleWithUserCount>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.rolesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      isSystem: query.isSystem,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createRole(
    dto: CreateRoleDto,
    createdBy?: string,
  ): Promise<RoleWithUserCount> {
    const existing = await this.rolesRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }
    return this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      createdBy,
    });
  }

  // isSystem is deliberately absent from CreateRoleDto; only the seed script calls this.
  createSystemRole(
    name: string,
    description?: string,
  ): Promise<RoleWithUserCount> {
    return this.rolesRepository.create({
      name,
      description,
      isSystem: true,
      isActive: true,
    });
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    updatedBy?: string,
  ): Promise<RoleWithUserCount> {
    const role = await this.getRoleOrThrow(id);

    if (role.isSystem && dto.name !== undefined && dto.name !== role.name) {
      throw new BadRequestException('System roles cannot be renamed');
    }
    if (role.isSystem && dto.isActive === false) {
      throw new BadRequestException('System roles cannot be deactivated');
    }
    if (dto.name) {
      const existing = await this.rolesRepository.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    return this.rolesRepository.update(id, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      updatedBy,
    });
  }

  async deleteRole(id: string, deletedBy?: string): Promise<void> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (role._count.userRoles > 0) {
      throw new ConflictException(
        `Cannot delete a role assigned to ${role._count.userRoles} user(s). Unassign them first.`,
      );
    }
    await this.rolesRepository.softDelete(id, deletedBy);
  }

  async restoreRole(
    id: string,
    updatedBy?: string,
  ): Promise<RoleWithUserCount> {
    await this.getRoleOrThrow(id);
    return this.rolesRepository.restore(id, updatedBy);
  }

  async assignUser(
    roleId: string,
    userId: string,
    assignedBy?: string,
  ): Promise<void> {
    const role = await this.getRoleOrThrow(roleId);
    if (!role.isActive) {
      throw new BadRequestException('Cannot assign users to an inactive role');
    }
    await this.usersService.getUserOrThrow(userId);

    const existing = await this.rolesRepository.findAssignment(userId, roleId);
    if (existing) {
      throw new ConflictException('This user already has this role');
    }
    await this.rolesRepository.assignUser(roleId, userId, assignedBy);
  }

  async unassignUser(roleId: string, userId: string): Promise<void> {
    await this.getRoleOrThrow(roleId);
    const existing = await this.rolesRepository.findAssignment(userId, roleId);
    if (!existing) {
      throw new NotFoundException('This user does not have this role');
    }
    await this.rolesRepository.unassignUser(roleId, userId);
  }

  async listUsersForRole(
    roleId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<User>> {
    await this.getRoleOrThrow(roleId);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.rolesRepository.findUsersForRole(
      roleId,
      skip,
      query.limit,
    );
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}
