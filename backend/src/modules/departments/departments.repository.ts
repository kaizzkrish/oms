import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Department } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { DepartmentSortField } from './dto/query-departments.dto';

export interface CreateDepartmentData {
  organizationId: string;
  officeId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateDepartmentData {
  organizationId?: string;
  officeId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyDepartmentsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  officeId?: string;
  sortBy: DepartmentSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({ where: { id } });
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Department | null> {
    return this.prisma.department.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }

  create(data: CreateDepartmentData): Promise<Department> {
    return this.prisma.department.create({ data });
  }

  update(id: string, data: UpdateDepartmentData): Promise<Department> {
    return this.prisma.department.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyDepartmentsOptions,
      'search' | 'isActive' | 'organizationId' | 'officeId'
    >,
  ): Prisma.DepartmentWhereInput {
    const where: Prisma.DepartmentWhereInput = {};
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
    if (options.officeId) {
      where.officeId = options.officeId;
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
    options: FindManyDepartmentsOptions,
  ): Promise<[Department[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.department.count({ where }),
    ]);
    return [items, total];
  }
}
