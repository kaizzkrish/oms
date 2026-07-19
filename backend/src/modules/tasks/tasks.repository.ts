import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Task } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { TaskSortField } from './dto/query-tasks.dto';
import type { TaskPriority } from './constants/task-priority';
import type { TaskStatus } from './constants/task-status';
import type { TaskType } from './constants/task-type';

export interface CreateTaskData {
  organizationId: string;
  projectId: string;
  moduleId?: string;
  featureId?: string;
  sprintId?: string;
  assigneeId?: string;
  name: string;
  code?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateTaskData {
  organizationId?: string;
  projectId?: string;
  moduleId?: string | null;
  featureId?: string | null;
  sprintId?: string | null;
  assigneeId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyTasksOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  featureId?: string;
  sprintId?: string;
  assigneeId?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy: TaskSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  create(data: CreateTaskData): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  update(id: string, data: UpdateTaskData): Promise<Task> {
    return this.prisma.task.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyTasksOptions,
      | 'search'
      | 'isActive'
      | 'organizationId'
      | 'projectId'
      | 'moduleId'
      | 'featureId'
      | 'sprintId'
      | 'assigneeId'
      | 'type'
      | 'status'
      | 'priority'
    >,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};
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
    if (options.moduleId) {
      where.moduleId = options.moduleId;
    }
    if (options.featureId) {
      where.featureId = options.featureId;
    }
    if (options.sprintId) {
      where.sprintId = options.sprintId;
    }
    if (options.assigneeId) {
      where.assigneeId = options.assigneeId;
    }
    if (options.type) {
      where.type = options.type;
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

  async findMany(options: FindManyTasksOptions): Promise<[Task[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.task.count({ where }),
    ]);
    return [items, total];
  }
}
