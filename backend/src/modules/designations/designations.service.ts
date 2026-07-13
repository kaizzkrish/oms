import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Designation } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { DepartmentsService } from '../departments/departments.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateDesignationDto } from './dto/create-designation.dto';
import type { QueryDesignationsDto } from './dto/query-designations.dto';
import type { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationsRepository } from './designations.repository';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly designationsRepository: DesignationsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async getDesignationOrThrow(id: string): Promise<Designation> {
    const designation = await this.designationsRepository.findById(id);
    if (!designation) {
      throw new NotFoundException(`Designation with id "${id}" not found`);
    }
    return designation;
  }

  async listDesignations(
    query: QueryDesignationsDto,
  ): Promise<PaginatedResult<Designation>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.designationsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      departmentId: query.departmentId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /** Ensures `departmentId`, if given, exists and belongs to `organizationId`. */
  private async assertDepartmentBelongsToOrganization(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const department =
      await this.departmentsService.getDepartmentOrThrow(departmentId);
    if (department.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected department does not belong to this organization',
      );
    }
  }

  async createDesignation(
    dto: CreateDesignationDto,
    createdBy?: string,
  ): Promise<Designation> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        dto.organizationId,
      );
    }

    const existing =
      await this.designationsRepository.findByOrganizationAndName(
        dto.organizationId,
        dto.name,
      );
    if (existing) {
      throw new ConflictException(
        'A designation with this name already exists in this organization',
      );
    }

    return this.designationsRepository.create({ ...dto, createdBy });
  }

  async updateDesignation(
    id: string,
    dto: UpdateDesignationDto,
    updatedBy?: string,
  ): Promise<Designation> {
    const existing = await this.getDesignationOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner =
        await this.designationsRepository.findByOrganizationAndName(
          organizationId,
          dto.name,
        );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A designation with this name already exists in this organization',
        );
      }
    }

    return this.designationsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteDesignation(id: string, deletedBy?: string): Promise<void> {
    await this.getDesignationOrThrow(id);
    await this.designationsRepository.softDelete(id, deletedBy);
  }

  async restoreDesignation(
    id: string,
    updatedBy?: string,
  ): Promise<Designation> {
    await this.getDesignationOrThrow(id);
    return this.designationsRepository.restore(id, updatedBy);
  }
}
