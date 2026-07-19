import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions('Tasks.Create')
  @ApiOperation({ summary: 'Create a new task' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TaskEntity> {
    const task = await this.tasksService.createTask(dto, currentUser.sub);
    return TaskEntity.fromPrisma(task);
  }

  @Get()
  @RequirePermissions('Tasks.View')
  @ApiOperation({
    summary:
      'List tasks with pagination, search, filtering (by organization/project/module/feature/sprint/assignee/type/status/priority), and sorting',
  })
  @ApiPaginatedResponse(TaskEntity)
  async findAll(
    @Query() query: QueryTasksDto,
  ): Promise<{ items: TaskEntity[]; meta: unknown }> {
    const result = await this.tasksService.listTasks(query);
    return {
      items: result.items.map((task) => TaskEntity.fromPrisma(task)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Tasks.View')
  @ApiOperation({ summary: 'Get a task by id' })
  async findOne(@Param('id') id: string): Promise<TaskEntity> {
    const task = await this.tasksService.getTaskOrThrow(id);
    return TaskEntity.fromPrisma(task);
  }

  @Patch(':id')
  @RequirePermissions('Tasks.Update')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TaskEntity> {
    const task = await this.tasksService.updateTask(id, dto, currentUser.sub);
    return TaskEntity.fromPrisma(task);
  }

  @Delete(':id')
  @RequirePermissions('Tasks.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a task' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.tasksService.deleteTask(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Tasks.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TaskEntity> {
    const task = await this.tasksService.restoreTask(id, currentUser.sub);
    return TaskEntity.fromPrisma(task);
  }
}
