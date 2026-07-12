import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const PERMISSION_SORT_FIELDS = ['name', 'createdAt'] as const;
export type PermissionSortField = (typeof PERMISSION_SORT_FIELDS)[number];

export class QueryPermissionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by system/custom permission' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Filter by permission group id' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ enum: PERMISSION_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(PERMISSION_SORT_FIELDS)
  sortBy: PermissionSortField = 'name';
}
