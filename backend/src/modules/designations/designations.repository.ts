import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Designation } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { DesignationSortField } from './dto/query-designations.dto';

export interface CreateDesignationData {
  organizationId: string;
  departmentId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateDesignationData {
  organizationId?: string;
  departmentId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyDesignationsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  sortBy: DesignationSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class DesignationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Designation | null> {
    return this.prisma.designation.findUnique({ where: { id } });
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Designation | null> {
    return this.prisma.designation.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }

  create(data: CreateDesignationData): Promise<Designation> {
    return this.prisma.designation.create({ data });
  }

  update(id: string, data: UpdateDesignationData): Promise<Designation> {
    return this.prisma.designation.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Designation> {
    return this.prisma.designation.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Designation> {
    return this.prisma.designation.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyDesignationsOptions,
      'search' | 'isActive' | 'organizationId' | 'departmentId'
    >,
  ): Prisma.DesignationWhereInput {
    const where: Prisma.DesignationWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }
    if (options.departmentId) {
      where.departmentId = options.departmentId;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyDesignationsOptions,
  ): Promise<[Designation[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.designation.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.designation.count({ where }),
    ]);
    return [items, total];
  }
}
