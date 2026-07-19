import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TASK_PRIORITIES, type TaskPriority } from '../constants/task-priority';
import { TASK_STATUSES, type TaskStatus } from '../constants/task-status';
import { TASK_TYPES, type TaskType } from '../constants/task-type';

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the module',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsUUID()
  moduleId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the feature',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsUUID()
  featureId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the sprint',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsUUID()
  sprintId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the assignee',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: TASK_TYPES })
  @IsOptional()
  @IsIn(TASK_TYPES)
  type?: TaskType;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the due date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the estimated hours',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedHours?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the actual hours',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
