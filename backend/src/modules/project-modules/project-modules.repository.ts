import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProjectModule } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { ModuleSortField } from './dto/query-project-modules.dto';
import type { ModuleStatus } from './constants/module-status';

export interface CreateProjectModuleData {
  organizationId: string;
  projectId: string;
  moduleLeadId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: ModuleStatus;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateProjectModuleData {
  organizationId?: string;
  projectId?: string;
  moduleLeadId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: ModuleStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyProjectModulesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleLeadId?: string;
  status?: ModuleStatus;
  sortBy: ModuleSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class ProjectModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ProjectModule | null> {
    return this.prisma.projectModule.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<ProjectModule | null> {
    return this.prisma.projectModule.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateProjectModuleData): Promise<ProjectModule> {
    return this.prisma.projectModule.create({ data });
  }

  update(id: string, data: UpdateProjectModuleData): Promise<ProjectModule> {
    return this.prisma.projectModule.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<ProjectModule> {
    return this.prisma.projectModule.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<ProjectModule> {
    return this.prisma.projectModule.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyProjectModulesOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'moduleLeadId'
      | 'status'
    >,
  ): Prisma.ProjectModuleWhereInput {
    const where: Prisma.ProjectModuleWhereInput = {};
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
    if (options.projectId) {
      where.projectId = options.projectId;
    }
    if (options.moduleLeadId) {
      where.moduleLeadId = options.moduleLeadId;
    }
    if (options.status) {
      where.status = options.status;
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
    options: FindManyProjectModulesOptions,
  ): Promise<[ProjectModule[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.projectModule.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.projectModule.count({ where }),
    ]);
    return [items, total];
  }
}
