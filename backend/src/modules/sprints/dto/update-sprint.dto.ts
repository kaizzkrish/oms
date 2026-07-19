import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SPRINT_STATUSES, type SprintStatus } from '../constants/sprint-status';

export class UpdateSprintDto {
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
    description: 'Pass null to unassign the team',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateSprintDto, value: unknown) => value !== null)
  @IsUUID()
  teamId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the scrum master',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateSprintDto, value: unknown) => value !== null)
  @IsUUID()
  scrumMasterId?: string | null;

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

  @ApiPropertyOptional({ description: 'The sprint goal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string;

  @ApiPropertyOptional({ enum: SPRINT_STATUSES })
  @IsOptional()
  @IsIn(SPRINT_STATUSES)
  status?: SprintStatus;

  @ApiPropertyOptional({
    description: 'A sprint always has a start date; omit to leave unchanged',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'A sprint always has an end date; omit to leave unchanged',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
