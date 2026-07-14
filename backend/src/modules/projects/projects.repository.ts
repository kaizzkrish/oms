import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Project } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { ProjectSortField } from './dto/query-projects.dto';
import type { ProjectPriority } from './constants/project-priority';
import type { ProjectStatus } from './constants/project-status';

export interface CreateProjectData {
  organizationId: string;
  clientId?: string;
  departmentId?: string;
  projectManagerId?: string;
  teamId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateProjectData {
  organizationId?: string;
  clientId?: string | null;
  departmentId?: string | null;
  projectManagerId?: string | null;
  teamId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date | null;
  endDate?: Date | null;
  budget?: number | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyProjectsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  clientId?: string;
  departmentId?: string;
  projectManagerId?: string;
  teamId?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  sortBy: ProjectSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }

  create(data: CreateProjectData): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  update(id: string, data: UpdateProjectData): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyProjectsOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'clientId'
      | 'departmentId'
      | 'projectManagerId'
      | 'teamId'
      | 'status'
      | 'priority'
    >,
  ): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {};
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
    if (options.clientId) {
      where.clientId = options.clientId;
    }
    if (options.departmentId) {
      where.departmentId = options.departmentId;
    }
    if (options.projectManagerId) {
      where.projectManagerId = options.projectManagerId;
    }
    if (options.teamId) {
      where.teamId = options.teamId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.priority) {
      where.priority = options.priority;
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
    options: FindManyProjectsOptions,
  ): Promise<[Project[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.project.count({ where }),
    ]);
    return [items, total];
  }
}
