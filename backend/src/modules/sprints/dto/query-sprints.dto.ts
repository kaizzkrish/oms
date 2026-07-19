import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SPRINT_STATUSES, type SprintStatus } from '../constants/sprint-status';

export const SPRINT_SORT_FIELDS = ['name', 'startDate', 'createdAt'] as const;
export type SprintSortField = (typeof SPRINT_SORT_FIELDS)[number];

export class QuerySprintsDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by team id' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Filter by scrum master (employee) id' })
  @IsOptional()
  @IsUUID()
  scrumMasterId?: string;

  @ApiPropertyOptional({ enum: SPRINT_STATUSES })
  @IsOptional()
  @IsIn(SPRINT_STATUSES)
  status?: SprintStatus;

  @ApiPropertyOptional({ enum: SPRINT_SORT_FIELDS, default: 'startDate' })
  @IsOptional()
  @IsIn(SPRINT_SORT_FIELDS)
  sortBy: SprintSortField = 'startDate';
}
