import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MODULE_STATUSES, type ModuleStatus } from '../constants/module-status';

export const MODULE_SORT_FIELDS = ['name', 'startDate', 'createdAt'] as const;
export type ModuleSortField = (typeof MODULE_SORT_FIELDS)[number];

export class QueryProjectModulesDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by module lead (employee) id' })
  @IsOptional()
  @IsUUID()
  moduleLeadId?: string;

  @ApiPropertyOptional({ enum: MODULE_STATUSES })
  @IsOptional()
  @IsIn(MODULE_STATUSES)
  status?: ModuleStatus;

  @ApiPropertyOptional({ enum: MODULE_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(MODULE_SORT_FIELDS)
  sortBy: ModuleSortField = 'name';
}
