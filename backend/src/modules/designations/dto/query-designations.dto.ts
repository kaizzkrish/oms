import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const DESIGNATION_SORT_FIELDS = ['name', 'createdAt'] as const;
export type DesignationSortField = (typeof DESIGNATION_SORT_FIELDS)[number];

export class QueryDesignationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by department id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: DESIGNATION_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(DESIGNATION_SORT_FIELDS)
  sortBy: DesignationSortField = 'name';
}
