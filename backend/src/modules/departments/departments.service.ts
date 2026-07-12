import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Department } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { OfficesService } from '../offices/offices.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { QueryDepartmentsDto } from './dto/query-departments.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsRepository } from './departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly officesService: OfficesService,
  ) {}

  async getDepartmentOrThrow(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with id "${id}" not found`);
    }
    return department;
  }

  async listDepartments(
    query: QueryDepartmentsDto,
  ): Promise<PaginatedResult<Department>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.departmentsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      officeId: query.officeId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /** Ensures `officeId`, if given, exists and belongs to `organizationId`. */
  private async assertOfficeBelongsToOrganization(
    officeId: string,
    organizationId: string,
  ): Promise<void> {
    const office = await this.officesService.getOfficeOrThrow(officeId);
    if (office.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected office does not belong to this organization',
      );
    }
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    createdBy?: string,
  ): Promise<Department> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    if (dto.officeId) {
      await this.assertOfficeBelongsToOrganization(
        dto.officeId,
        dto.organizationId,
      );
    }

    const existing = await this.departmentsRepository.findByOrganizationAndName(
      dto.organizationId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A department with this name already exists in this organization',
      );
    }

    return this.departmentsRepository.create({ ...dto, createdBy });
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    updatedBy?: string,
  ): Promise<Department> {
    const existing = await this.getDepartmentOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.officeId) {
      await this.assertOfficeBelongsToOrganization(
        dto.officeId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner =
        await this.departmentsRepository.findByOrganizationAndName(
          organizationId,
          dto.name,
        );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A department with this name already exists in this organization',
        );
      }
    }

    return this.departmentsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteDepartment(id: string, deletedBy?: string): Promise<void> {
    await this.getDepartmentOrThrow(id);
    await this.departmentsRepository.softDelete(id, deletedBy);
  }

  async restoreDepartment(id: string, updatedBy?: string): Promise<Department> {
    await this.getDepartmentOrThrow(id);
    return this.departmentsRepository.restore(id, updatedBy);
  }
}
