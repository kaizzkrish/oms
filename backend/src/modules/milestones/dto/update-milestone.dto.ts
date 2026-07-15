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
import {
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from '../constants/milestone-status';

export class UpdateMilestoneDto {
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
    description: 'Pass null to unassign the owner',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateMilestoneDto, value: unknown) => value !== null)
  @IsUUID()
  ownerId?: string | null;

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

  @ApiPropertyOptional({ enum: MILESTONE_STATUSES })
  @IsOptional()
  @IsIn(MILESTONE_STATUSES)
  status?: MilestoneStatus;

  @ApiPropertyOptional({
    description: 'A milestone always has a due date; omit to leave unchanged',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the achieved date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateMilestoneDto, value: unknown) => value !== null)
  @IsDateString()
  achievedDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
