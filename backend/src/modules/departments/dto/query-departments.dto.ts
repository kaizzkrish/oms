import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const DEPARTMENT_SORT_FIELDS = ['name', 'createdAt'] as const;
export type DepartmentSortField = (typeof DEPARTMENT_SORT_FIELDS)[number];

export class QueryDepartmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by office id' })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional({ enum: DEPARTMENT_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(DEPARTMENT_SORT_FIELDS)
  sortBy: DepartmentSortField = 'name';
}
