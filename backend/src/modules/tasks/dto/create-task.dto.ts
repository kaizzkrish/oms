import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';
import { TASK_PRIORITIES, type TaskPriority } from '../constants/task-priority';
import { TASK_STATUSES, type TaskStatus } from '../constants/task-status';
import { TASK_TYPES, type TaskType } from '../constants/task-type';

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  featureId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: TASK_TYPES, default: 'TASK', required: false })
  @IsOptional()
  @IsIn(TASK_TYPES)
  type?: TaskType;

  @ApiProperty({ enum: TASK_STATUSES, default: 'TODO', required: false })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiProperty({ enum: TASK_PRIORITIES, default: 'MEDIUM', required: false })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualHours?: number;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
