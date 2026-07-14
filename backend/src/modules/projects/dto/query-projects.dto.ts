import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  PROJECT_PRIORITIES,
  type ProjectPriority,
} from '../constants/project-priority';
import {
  PROJECT_STATUSES,
  type ProjectStatus,
} from '../constants/project-status';

export const PROJECT_SORT_FIELDS = ['name', 'startDate', 'createdAt'] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

export class QueryProjectsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by client id' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by department id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project manager (employee) id',
  })
  @IsOptional()
  @IsUUID()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Filter by team id' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PROJECT_PRIORITIES })
  @IsOptional()
  @IsIn(PROJECT_PRIORITIES)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ enum: PROJECT_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(PROJECT_SORT_FIELDS)
  sortBy: ProjectSortField = 'name';
}
