import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @ApiPropertyOptional({
    description: 'Scope the summary to a single organization',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
