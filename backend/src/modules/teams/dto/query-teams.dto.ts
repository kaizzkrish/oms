import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from '../../../common/transformers/to-boolean.transform';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const TEAM_SORT_FIELDS = ['name', 'createdAt'] as const;
export type TeamSortField = (typeof TEAM_SORT_FIELDS)[number];

export class QueryTeamsDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by team leader (employee) id' })
  @IsOptional()
  @IsUUID()
  teamLeaderId?: string;

  @ApiPropertyOptional({ enum: TEAM_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(TEAM_SORT_FIELDS)
  sortBy: TeamSortField = 'name';
}
