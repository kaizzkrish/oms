import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import type { QueryPermissionGroupsDto } from './dto/query-permission-groups.dto';
import type { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import type { PermissionGroupWithCount } from './entities/permission-group.entity';
import { PermissionGroupsRepository } from './permission-groups.repository';

@Injectable()
export class PermissionGroupsService {
  constructor(
    private readonly permissionGroupsRepository: PermissionGroupsRepository,
  ) {}

  findByName(name: string): Promise<PermissionGroupWithCount | null> {
    return this.permissionGroupsRepository.findByName(name);
  }

  async getGroupOrThrow(id: string): Promise<PermissionGroupWithCount> {
    const group = await this.permissionGroupsRepository.findById(id);
    if (!group) {
      throw new NotFoundException(`Permission group with id "${id}" not found`);
    }
    return group;
  }

  async listGroups(
    query: QueryPermissionGroupsDto,
  ): Promise<PaginatedResult<PermissionGroupWithCount>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.permissionGroupsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createGroup(
    dto: CreatePermissionGroupDto,
    createdBy?: string,
  ): Promise<PermissionGroupWithCount> {
    const existing = await this.permissionGroupsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        'A permission group with this name already exists',
      );
    }
    return this.permissionGroupsRepository.create({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      createdBy,
    });
  }

  async updateGroup(
    id: string,
    dto: UpdatePermissionGroupDto,
    updatedBy?: string,
  ): Promise<PermissionGroupWithCount> {
    await this.getGroupOrThrow(id);

    if (dto.name) {
      const existing = await this.permissionGroupsRepository.findByName(
        dto.name,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A permission group with this name already exists',
        );
      }
    }

    return this.permissionGroupsRepository.update(id, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      updatedBy,
    });
  }

  async deleteGroup(id: string, deletedBy?: string): Promise<void> {
    const group = await this.getGroupOrThrow(id);
    if (group._count.permissions > 0) {
      throw new ConflictException(
        `Cannot delete a permission group containing ${group._count.permissions} permission(s). Move or delete them first.`,
      );
    }
    await this.permissionGroupsRepository.softDelete(id, deletedBy);
  }

  async restoreGroup(
    id: string,
    updatedBy?: string,
  ): Promise<PermissionGroupWithCount> {
    await this.getGroupOrThrow(id);
    return this.permissionGroupsRepository.restore(id, updatedBy);
  }
}
