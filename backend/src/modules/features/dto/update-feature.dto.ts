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
  FEATURE_PRIORITIES,
  type FeaturePriority,
} from '../constants/feature-priority';
import {
  FEATURE_STATUSES,
  type FeatureStatus,
} from '../constants/feature-status';

export class UpdateFeatureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the owner',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateFeatureDto, value: unknown) => value !== null)
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

  @ApiPropertyOptional({ enum: FEATURE_STATUSES })
  @IsOptional()
  @IsIn(FEATURE_STATUSES)
  status?: FeatureStatus;

  @ApiPropertyOptional({ enum: FEATURE_PRIORITIES })
  @IsOptional()
  @IsIn(FEATURE_PRIORITIES)
  priority?: FeaturePriority;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the start date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateFeatureDto, value: unknown) => value !== null)
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the end date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateFeatureDto, value: unknown) => value !== null)
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
