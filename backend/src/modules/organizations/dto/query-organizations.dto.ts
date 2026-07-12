import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const ORGANIZATION_SORT_FIELDS = ['name', 'createdAt'] as const;
export type OrganizationSortField = (typeof ORGANIZATION_SORT_FIELDS)[number];

export class QueryOrganizationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ORGANIZATION_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(ORGANIZATION_SORT_FIELDS)
  sortBy: OrganizationSortField = 'name';
}
