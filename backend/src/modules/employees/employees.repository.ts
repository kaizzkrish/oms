import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { EmployeeSortField } from './dto/query-employees.dto';
import type { EmployeeWithUser } from './entities/employee.entity';
import type { EmploymentType } from './constants/employment-type';

export interface CreateEmployeeData {
  userId: string;
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  reportingManagerId?: string;
  employeeCode: string;
  employmentType?: EmploymentType;
  dateOfJoining: Date;
  dateOfLeaving?: Date;
  phone?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateEmployeeData {
  organizationId?: string;
  departmentId?: string | null;
  designationId?: string | null;
  officeId?: string | null;
  reportingManagerId?: string | null;
  employeeCode?: string;
  employmentType?: EmploymentType;
  dateOfJoining?: Date;
  dateOfLeaving?: Date | null;
  phone?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyEmployeesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  reportingManagerId?: string;
  employmentType?: EmploymentType;
  sortBy: EmployeeSortField;
  sortOrder: 'asc' | 'desc';
}

const WITH_USER = {
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
    },
  },
} as const;

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<EmployeeWithUser | null> {
    return this.prisma.employee.findUnique({ where: { id }, ...WITH_USER });
  }

  findByUserId(userId: string): Promise<EmployeeWithUser | null> {
    return this.prisma.employee.findUnique({ where: { userId }, ...WITH_USER });
  }

  findByOrganizationAndCode(
    organizationId: string,
    employeeCode: string,
  ): Promise<EmployeeWithUser | null> {
    return this.prisma.employee.findUnique({
      where: { organizationId_employeeCode: { organizationId, employeeCode } },
      ...WITH_USER,
    });
  }

  create(data: CreateEmployeeData): Promise<EmployeeWithUser> {
    return this.prisma.employee.create({ data, ...WITH_USER });
  }

  update(id: string, data: UpdateEmployeeData): Promise<EmployeeWithUser> {
    return this.prisma.employee.update({ where: { id }, data, ...WITH_USER });
  }

  softDelete(id: string, deletedBy?: string): Promise<EmployeeWithUser> {
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
      ...WITH_USER,
    });
  }

  restore(id: string, updatedBy?: string): Promise<EmployeeWithUser> {
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
      ...WITH_USER,
    });
  }

  private buildWhere(
    options: Pick<
      FindManyEmployeesOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'departmentId'
      | 'designationId'
      | 'officeId'
      | 'reportingManagerId'
      | 'employmentType'
    >,
  ): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {};
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
    if (options.designationId) {
      where.designationId = options.designationId;
    }
    if (options.officeId) {
      where.officeId = options.officeId;
    }
    if (options.reportingManagerId) {
      where.reportingManagerId = options.reportingManagerId;
    }
    if (options.employmentType) {
      where.employmentType = options.employmentType;
    }
    if (options.search) {
      where.OR = [
        { employeeCode: { contains: options.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: options.search, mode: 'insensitive' } },
              { lastName: { contains: options.search, mode: 'insensitive' } },
              { email: { contains: options.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyEmployeesOptions,
  ): Promise<[EmployeeWithUser[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
        ...WITH_USER,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return [items, total];
  }
}
