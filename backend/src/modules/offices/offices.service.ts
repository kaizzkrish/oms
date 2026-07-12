import { Injectable, NotFoundException } from '@nestjs/common';
import type { Office } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateOfficeDto } from './dto/create-office.dto';
import type { QueryOfficesDto } from './dto/query-offices.dto';
import type { UpdateOfficeDto } from './dto/update-office.dto';
import { OfficesRepository } from './offices.repository';

@Injectable()
export class OfficesService {
  constructor(
    private readonly officesRepository: OfficesRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getOfficeOrThrow(id: string): Promise<Office> {
    const office = await this.officesRepository.findById(id);
    if (!office) {
      throw new NotFoundException(`Office with id "${id}" not found`);
    }
    return office;
  }

  async listOffices(query: QueryOfficesDto): Promise<PaginatedResult<Office>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.officesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createOffice(
    dto: CreateOfficeDto,
    createdBy?: string,
  ): Promise<Office> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);

    const office = await this.officesRepository.create({
      organizationId: dto.organizationId,
      name: dto.name,
      isHeadquarters: dto.isHeadquarters,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      phone: dto.phone,
      email: dto.email,
      isActive: dto.isActive,
      createdBy,
    });

    if (office.isHeadquarters) {
      await this.officesRepository.unsetOtherHeadquarters(
        office.organizationId,
        office.id,
      );
    }
    return office;
  }

  async updateOffice(
    id: string,
    dto: UpdateOfficeDto,
    updatedBy?: string,
  ): Promise<Office> {
    const existing = await this.getOfficeOrThrow(id);

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }

    const office = await this.officesRepository.update(id, {
      ...dto,
      updatedBy,
    });

    if (office.isHeadquarters) {
      await this.officesRepository.unsetOtherHeadquarters(
        dto.organizationId ?? existing.organizationId,
        office.id,
      );
    }
    return office;
  }

  async deleteOffice(id: string, deletedBy?: string): Promise<void> {
    await this.getOfficeOrThrow(id);
    await this.officesRepository.softDelete(id, deletedBy);
  }

  async restoreOffice(id: string, updatedBy?: string): Promise<Office> {
    await this.getOfficeOrThrow(id);
    return this.officesRepository.restore(id, updatedBy);
  }
}
