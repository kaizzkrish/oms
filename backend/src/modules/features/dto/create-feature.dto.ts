import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  FEATURE_PRIORITIES,
  type FeaturePriority,
} from '../constants/feature-priority';
import {
  FEATURE_STATUSES,
  type FeatureStatus,
} from '../constants/feature-status';

export class CreateFeatureDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty()
  @IsUUID()
  moduleId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

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

  @ApiProperty({ enum: FEATURE_STATUSES, default: 'PLANNING', required: false })
  @IsOptional()
  @IsIn(FEATURE_STATUSES)
  status?: FeatureStatus;

  @ApiProperty({
    enum: FEATURE_PRIORITIES,
    default: 'MEDIUM',
    required: false,
  })
  @IsOptional()
  @IsIn(FEATURE_PRIORITIES)
  priority?: FeaturePriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
