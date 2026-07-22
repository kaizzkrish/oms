import { createReadStream } from 'node:fs';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportEntity } from './entities/report.entity';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @RequirePermissions('Reports.Export')
  @ApiOperation({
    summary:
      'Generate a new report snapshot (CSV) of projects, tasks, deliverables, or employees for an organization',
  })
  async generate(
    @Body() dto: GenerateReportDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ReportEntity> {
    const report = await this.reportsService.generateReport(
      dto,
      currentUser.sub,
    );
    return ReportEntity.fromPrisma(report);
  }

  @Get()
  @RequirePermissions('Reports.View')
  @ApiOperation({
    summary:
      'List previously generated reports with pagination, search, filtering (by organization/type), and sorting',
  })
  @ApiPaginatedResponse(ReportEntity)
  async findAll(
    @Query() query: QueryReportsDto,
  ): Promise<{ items: ReportEntity[]; meta: unknown }> {
    const result = await this.reportsService.listReports(query);
    return {
      items: result.items.map((report) => ReportEntity.fromPrisma(report)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Reports.View')
  @ApiOperation({ summary: 'Get a report by id' })
  async findOne(@Param('id') id: string): Promise<ReportEntity> {
    const report = await this.reportsService.getReportOrThrow(id);
    return ReportEntity.fromPrisma(report);
  }

  @Get(':id/download')
  @RequirePermissions('Reports.View')
  @SkipTransform()
  @ApiOperation({ summary: 'Download the generated report file' })
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const { absolutePath, fileName, mimeType } =
      await this.reportsService.getDownloadInfo(id);
    return new StreamableFile(createReadStream(absolutePath), {
      type: mimeType,
      disposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
  }

  @Delete(':id')
  @RequirePermissions('Reports.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a report' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.reportsService.deleteReport(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Reports.Delete')
  @ApiOperation({ summary: 'Restore a soft-deleted report' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ReportEntity> {
    const report = await this.reportsService.restoreReport(id, currentUser.sub);
    return ReportEntity.fromPrisma(report);
  }
}
