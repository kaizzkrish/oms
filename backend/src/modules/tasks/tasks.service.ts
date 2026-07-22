import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Task } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { FeaturesService } from '../features/features.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectModulesService } from '../project-modules/project-modules.service';
import { ProjectsService } from '../projects/projects.service';
import { SprintsService } from '../sprints/sprints.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { QueryTasksDto } from './dto/query-tasks.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly projectModulesService: ProjectModulesService,
    private readonly featuresService: FeaturesService,
    private readonly sprintsService: SprintsService,
    private readonly employeesService: EmployeesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTaskOrThrow(id: string): Promise<Task> {
    const task = await this.tasksRepository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    return task;
  }

  async listTasks(query: QueryTasksDto): Promise<PaginatedResult<Task>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.tasksRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      moduleId: query.moduleId,
      featureId: query.featureId,
      sprintId: query.sprintId,
      assigneeId: query.assigneeId,
      type: query.type,
      status: query.status,
      priority: query.priority,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectsService.getProjectOrThrow(projectId);
    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected project does not belong to this organization',
      );
    }
  }

  private async assertModuleBelongsToProject(
    moduleId: string,
    projectId: string,
  ): Promise<void> {
    const projectModule =
      await this.projectModulesService.getProjectModuleOrThrow(moduleId);
    if (projectModule.projectId !== projectId) {
      throw new BadRequestException(
        'The selected module does not belong to this project',
      );
    }
  }

  private async assertFeatureBelongsToProject(
    featureId: string,
    projectId: string,
  ): Promise<void> {
    const feature = await this.featuresService.getFeatureOrThrow(featureId);
    if (feature.projectId !== projectId) {
      throw new BadRequestException(
        'The selected feature does not belong to this project',
      );
    }
  }

  private async assertSprintBelongsToProject(
    sprintId: string,
    projectId: string,
  ): Promise<void> {
    const sprint = await this.sprintsService.getSprintOrThrow(sprintId);
    if (sprint.projectId !== projectId) {
      throw new BadRequestException(
        'The selected sprint does not belong to this project',
      );
    }
  }

  private async assertAssigneeBelongsToOrganization(
    assigneeId: string,
    organizationId: string,
  ): Promise<void> {
    const employee = await this.employeesService.getEmployeeOrThrow(assigneeId);
    if (employee.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected assignee does not belong to this organization',
      );
    }
  }

  /**
   * Notifies a newly (re)assigned employee's user account. The one
   * concrete producer wired into the Notifications module (Module 28) —
   * documented in docs/modules/28-notifications.md.
   */
  private async notifyAssignee(
    assigneeId: string,
    task: Task,
    actingUserId?: string,
  ): Promise<void> {
    const employee = await this.employeesService.getEmployeeOrThrow(assigneeId);
    await this.notificationsService.notifyUser(
      employee.userId,
      {
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `You were assigned to "${task.name}"`,
        link: '/tasks',
      },
      actingUserId,
    );
  }

  async createTask(dto: CreateTaskDto, createdBy?: string): Promise<Task> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    if (dto.moduleId) {
      await this.assertModuleBelongsToProject(dto.moduleId, dto.projectId);
    }
    if (dto.featureId) {
      await this.assertFeatureBelongsToProject(dto.featureId, dto.projectId);
    }
    if (dto.sprintId) {
      await this.assertSprintBelongsToProject(dto.sprintId, dto.projectId);
    }
    if (dto.assigneeId) {
      await this.assertAssigneeBelongsToOrganization(
        dto.assigneeId,
        dto.organizationId,
      );
    }

    const task = await this.tasksRepository.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy,
    });

    if (dto.assigneeId) {
      await this.notifyAssignee(dto.assigneeId, task, createdBy);
    }

    return task;
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    updatedBy?: string,
  ): Promise<Task> {
    const existing = await this.getTaskOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;
    const projectId = dto.projectId ?? existing.projectId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.projectId) {
      await this.assertProjectBelongsToOrganization(
        dto.projectId,
        organizationId,
      );
    }
    if (dto.moduleId) {
      await this.assertModuleBelongsToProject(dto.moduleId, projectId);
    }
    if (dto.featureId) {
      await this.assertFeatureBelongsToProject(dto.featureId, projectId);
    }
    if (dto.sprintId) {
      await this.assertSprintBelongsToProject(dto.sprintId, projectId);
    }
    if (dto.assigneeId) {
      await this.assertAssigneeBelongsToOrganization(
        dto.assigneeId,
        organizationId,
      );
    }

    const task = await this.tasksRepository.update(id, {
      ...dto,
      dueDate:
        dto.dueDate === null
          ? null
          : dto.dueDate
            ? new Date(dto.dueDate)
            : undefined,
      updatedBy,
    });

    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.notifyAssignee(dto.assigneeId, task, updatedBy);
    }

    return task;
  }

  async deleteTask(id: string, deletedBy?: string): Promise<void> {
    await this.getTaskOrThrow(id);
    await this.tasksRepository.softDelete(id, deletedBy);
  }

  async restoreTask(id: string, updatedBy?: string): Promise<Task> {
    await this.getTaskOrThrow(id);
    return this.tasksRepository.restore(id, updatedBy);
  }
}
