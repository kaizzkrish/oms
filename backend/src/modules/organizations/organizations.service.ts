import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { CreateOrganizationDto } from './dto/create-organization.dto';
import type { QueryOrganizationsDto } from './dto/query-organizations.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { OrganizationWithOfficeCount } from './entities/organization.entity';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async getOrganizationOrThrow(
    id: string,
  ): Promise<OrganizationWithOfficeCount> {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with id "${id}" not found`);
    }
    return organization;
  }

  findByName(name: string): Promise<OrganizationWithOfficeCount | null> {
    return this.organizationsRepository.findByName(name);
  }

  async listOrganizations(
    query: QueryOrganizationsDto,
  ): Promise<PaginatedResult<OrganizationWithOfficeCount>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.organizationsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createOrganization(
    dto: CreateOrganizationDto,
    createdBy?: string,
  ): Promise<OrganizationWithOfficeCount> {
    const existing = await this.organizationsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        'An organization with this name already exists',
      );
    }
    return this.organizationsRepository.create({ ...dto, createdBy });
  }

  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDto,
    updatedBy?: string,
  ): Promise<OrganizationWithOfficeCount> {
    await this.getOrganizationOrThrow(id);

    if (dto.name) {
      const existing = await this.organizationsRepository.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'An organization with this name already exists',
        );
      }
    }

    return this.organizationsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteOrganization(id: string, deletedBy?: string): Promise<void> {
    const organization = await this.getOrganizationOrThrow(id);
    if (organization._count.offices > 0) {
      throw new ConflictException(
        `Cannot delete an organization with ${organization._count.offices} office(s). Delete them first.`,
      );
    }
    await this.organizationsRepository.softDelete(id, deletedBy);
  }

  async restoreOrganization(
    id: string,
    updatedBy?: string,
  ): Promise<OrganizationWithOfficeCount> {
    await this.getOrganizationOrThrow(id);
    return this.organizationsRepository.restore(id, updatedBy);
  }
}
