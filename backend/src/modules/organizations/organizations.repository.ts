import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { OrganizationSortField } from './dto/query-organizations.dto';
import type { OrganizationWithOfficeCount } from './entities/organization.entity';

export interface CreateOrganizationData {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  legalName?: string;
  registrationNumber?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyOrganizationsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  sortBy: OrganizationSortField;
  sortOrder: 'asc' | 'desc';
}

const WITH_OFFICE_COUNT = {
  include: { _count: { select: { offices: { where: { deletedAt: null } } } } },
} as const;

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<OrganizationWithOfficeCount | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      ...WITH_OFFICE_COUNT,
    });
  }

  findByName(name: string): Promise<OrganizationWithOfficeCount | null> {
    return this.prisma.organization.findUnique({
      where: { name },
      ...WITH_OFFICE_COUNT,
    });
  }

  create(data: CreateOrganizationData): Promise<OrganizationWithOfficeCount> {
    return this.prisma.organization.create({
      data: {
        name: data.name,
        legalName: data.legalName,
        registrationNumber: data.registrationNumber,
        industry: data.industry,
        website: data.website,
        email: data.email,
        phone: data.phone,
        logoUrl: data.logoUrl,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
      ...WITH_OFFICE_COUNT,
    });
  }

  update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<OrganizationWithOfficeCount> {
    return this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        legalName: data.legalName,
        registrationNumber: data.registrationNumber,
        industry: data.industry,
        website: data.website,
        email: data.email,
        phone: data.phone,
        logoUrl: data.logoUrl,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
      ...WITH_OFFICE_COUNT,
    });
  }

  softDelete(
    id: string,
    deletedBy?: string,
  ): Promise<OrganizationWithOfficeCount> {
    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
      ...WITH_OFFICE_COUNT,
    });
  }

  restore(
    id: string,
    updatedBy?: string,
  ): Promise<OrganizationWithOfficeCount> {
    return this.prisma.organization.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
      ...WITH_OFFICE_COUNT,
    });
  }

  private buildWhere(
    options: Pick<FindManyOrganizationsOptions, 'search' | 'isActive'>,
  ): Prisma.OrganizationWhereInput {
    const where: Prisma.OrganizationWhereInput = {};
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
        { legalName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyOrganizationsOptions,
  ): Promise<[OrganizationWithOfficeCount[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
        ...WITH_OFFICE_COUNT,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return [items, total];
  }
}
