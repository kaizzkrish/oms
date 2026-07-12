import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const ROLE_SORT_FIELDS = ['name', 'createdAt'] as const;
export type RoleSortField = (typeof ROLE_SORT_FIELDS)[number];

export class QueryRolesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by system/custom role' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ enum: ROLE_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(ROLE_SORT_FIELDS)
  sortBy: RoleSortField = 'name';
}
