import { ApiProperty } from '@nestjs/swagger';
import type { Task } from '../../../generated/prisma/client';
import type { TaskPriority } from '../constants/task-priority';
import type { TaskStatus } from '../constants/task-status';
import type { TaskType } from '../constants/task-type';

export class TaskEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  moduleId: string | null;

  @ApiProperty({ nullable: true })
  featureId: string | null;

  @ApiProperty({ nullable: true })
  sprintId: string | null;

  @ApiProperty({ nullable: true })
  assigneeId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  type: TaskType;

  @ApiProperty()
  status: TaskStatus;

  @ApiProperty()
  priority: TaskPriority;

  @ApiProperty({ nullable: true })
  dueDate: Date | null;

  @ApiProperty({ nullable: true })
  estimatedHours: number | null;

  @ApiProperty({ nullable: true })
  actualHours: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: TaskEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.moduleId = props.moduleId;
    this.featureId = props.featureId;
    this.sprintId = props.sprintId;
    this.assigneeId = props.assigneeId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.type = props.type;
    this.status = props.status;
    this.priority = props.priority;
    this.dueDate = props.dueDate;
    this.estimatedHours = props.estimatedHours;
    this.actualHours = props.actualHours;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(task: Task): TaskEntity {
    return new TaskEntity({
      id: task.id,
      organizationId: task.organizationId,
      projectId: task.projectId,
      moduleId: task.moduleId,
      featureId: task.featureId,
      sprintId: task.sprintId,
      assigneeId: task.assigneeId,
      name: task.name,
      code: task.code,
      description: task.description,
      type: task.type as TaskType,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      estimatedHours:
        task.estimatedHours === null ? null : Number(task.estimatedHours),
      actualHours: task.actualHours === null ? null : Number(task.actualHours),
      isActive: task.isActive,
      createdAt: task.createdAt,
    });
  }
}
