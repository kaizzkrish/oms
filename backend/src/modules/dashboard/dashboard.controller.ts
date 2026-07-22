import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { DashboardSummaryEntity } from './entities/dashboard-summary.entity';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions('Dashboard.View')
  @ApiOperation({
    summary:
      'Get organization/employee/project/task/deliverable/document summary counts, optionally scoped to one organization',
  })
  async getSummary(
    @Query() query: QueryDashboardDto,
  ): Promise<DashboardSummaryEntity> {
    return this.dashboardService.getSummary(query.organizationId);
  }
}
