import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FEATURE_PRIORITIES,
  type FeaturePriority,
} from '../constants/feature-priority';
import {
  FEATURE_STATUSES,
  type FeatureStatus,
} from '../constants/feature-status';

export const FEATURE_SORT_FIELDS = ['name', 'startDate', 'createdAt'] as const;
export type FeatureSortField = (typeof FEATURE_SORT_FIELDS)[number];

export class QueryFeaturesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by project id' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by module id' })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner (employee) id' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: FEATURE_STATUSES })
  @IsOptional()
  @IsIn(FEATURE_STATUSES)
  status?: FeatureStatus;

  @ApiPropertyOptional({ enum: FEATURE_PRIORITIES })
  @IsOptional()
  @IsIn(FEATURE_PRIORITIES)
  priority?: FeaturePriority;

  @ApiPropertyOptional({ enum: FEATURE_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(FEATURE_SORT_FIELDS)
  sortBy: FeatureSortField = 'name';
}
