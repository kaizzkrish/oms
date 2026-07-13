import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const CLIENT_SORT_FIELDS = ['name', 'createdAt'] as const;
export type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number];

export class QueryClientsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active/inactive status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by account manager (employee) id',
  })
  @IsOptional()
  @IsUUID()
  accountManagerId?: string;

  @ApiPropertyOptional({ enum: CLIENT_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS)
  sortBy: ClientSortField = 'name';
}
