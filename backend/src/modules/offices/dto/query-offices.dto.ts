import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const OFFICE_SORT_FIELDS = ['name', 'city', 'createdAt'] as const;
export type OfficeSortField = (typeof OFFICE_SORT_FIELDS)[number];

export class QueryOfficesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: OFFICE_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(OFFICE_SORT_FIELDS)
  sortBy: OfficeSortField = 'name';
}
