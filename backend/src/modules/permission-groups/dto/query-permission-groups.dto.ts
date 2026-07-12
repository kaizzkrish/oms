import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const PERMISSION_GROUP_SORT_FIELDS = ['name', 'createdAt'] as const;
export type PermissionGroupSortField =
  (typeof PERMISSION_GROUP_SORT_FIELDS)[number];

export class QueryPermissionGroupsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: PERMISSION_GROUP_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(PERMISSION_GROUP_SORT_FIELDS)
  sortBy: PermissionGroupSortField = 'name';
}
