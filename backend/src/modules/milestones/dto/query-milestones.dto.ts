import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from '../constants/milestone-status';

export const MILESTONE_SORT_FIELDS = ['name', 'dueDate', 'createdAt'] as const;
export type MilestoneSortField = (typeof MILESTONE_SORT_FIELDS)[number];

export class QueryMilestonesDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by owner (employee) id' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: MILESTONE_STATUSES })
  @IsOptional()
  @IsIn(MILESTONE_STATUSES)
  status?: MilestoneStatus;

  @ApiPropertyOptional({ enum: MILESTONE_SORT_FIELDS, default: 'dueDate' })
  @IsOptional()
  @IsIn(MILESTONE_SORT_FIELDS)
  sortBy: MilestoneSortField = 'dueDate';
}
