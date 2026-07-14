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
import {
  PROJECT_PRIORITIES,
  type ProjectPriority,
} from '../constants/project-priority';
import {
  PROJECT_STATUSES,
  type ProjectStatus,
} from '../constants/project-status';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the client',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsUUID()
  clientId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the department',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the project manager',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsUUID()
  projectManagerId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the team',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsUUID()
  teamId?: string | null;

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

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PROJECT_PRIORITIES })
  @IsOptional()
  @IsIn(PROJECT_PRIORITIES)
  priority?: ProjectPriority;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the start date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the end date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the budget',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
