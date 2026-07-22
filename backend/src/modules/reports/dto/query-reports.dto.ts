import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { REPORT_TYPES, type ReportType } from '../constants/report-type';

export const REPORT_SORT_FIELDS = ['name', 'createdAt'] as const;
export type ReportSortField = (typeof REPORT_SORT_FIELDS)[number];

export class QueryReportsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: REPORT_TYPES })
  @IsOptional()
  @IsIn(REPORT_TYPES)
  type?: ReportType;

  @ApiPropertyOptional({ enum: REPORT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(REPORT_SORT_FIELDS)
  sortBy: ReportSortField = 'createdAt';
}
