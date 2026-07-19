import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  REFERENCE_TYPES,
  type ReferenceType,
} from '../constants/reference-type';

export const REFERENCE_SORT_FIELDS = ['name', 'createdAt'] as const;
export type ReferenceSortField = (typeof REFERENCE_SORT_FIELDS)[number];

export class QueryReferencesDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: REFERENCE_TYPES })
  @IsOptional()
  @IsIn(REFERENCE_TYPES)
  type?: ReferenceType;

  @ApiPropertyOptional({ enum: REFERENCE_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(REFERENCE_SORT_FIELDS)
  sortBy: ReferenceSortField = 'name';
}
