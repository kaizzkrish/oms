import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from '../constants/deliverable-status';
import {
  DELIVERABLE_TYPES,
  type DeliverableType,
} from '../constants/deliverable-type';

export const DELIVERABLE_SORT_FIELDS = [
  'name',
  'dueDate',
  'createdAt',
] as const;
export type DeliverableSortField = (typeof DELIVERABLE_SORT_FIELDS)[number];

export class QueryDeliverablesDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by milestone id' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner (employee) id' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: DELIVERABLE_TYPES })
  @IsOptional()
  @IsIn(DELIVERABLE_TYPES)
  type?: DeliverableType;

  @ApiPropertyOptional({ enum: DELIVERABLE_STATUSES })
  @IsOptional()
  @IsIn(DELIVERABLE_STATUSES)
  status?: DeliverableStatus;

  @ApiPropertyOptional({ enum: DELIVERABLE_SORT_FIELDS, default: 'dueDate' })
  @IsOptional()
  @IsIn(DELIVERABLE_SORT_FIELDS)
  sortBy: DeliverableSortField = 'dueDate';
}
