import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DOCUMENT_TYPES, type DocumentType } from '../constants/document-type';

export const DOCUMENT_SORT_FIELDS = ['name', 'sizeBytes', 'createdAt'] as const;
export type DocumentSortField = (typeof DOCUMENT_SORT_FIELDS)[number];

export class QueryDocumentsDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: DOCUMENT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(DOCUMENT_SORT_FIELDS)
  sortBy: DocumentSortField = 'createdAt';
}
