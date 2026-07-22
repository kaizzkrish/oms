import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Report } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { StorageService } from '../../common/storage/storage.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { ReportType } from './constants/report-type';
import type { GenerateReportDto } from './dto/generate-report.dto';
import type { QueryReportsDto } from './dto/query-reports.dto';
import { ReportsRepository } from './reports.repository';
import { buildCsv } from './utils/csv.util';

export interface ReportDownloadInfo {
  absolutePath: string;
  fileName: string;
  mimeType: string;
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  PROJECTS: 'Projects',
  TASKS: 'Tasks',
  DELIVERABLES: 'Deliverables',
  EMPLOYEES: 'Employees',
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async getReportOrThrow(id: string): Promise<Report> {
    const report = await this.reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with id "${id}" not found`);
    }
    return report;
  }

  async listReports(query: QueryReportsDto): Promise<PaginatedResult<Report>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.reportsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      type: query.type,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async buildReportCsv(
    type: ReportType,
    organizationId: string,
  ): Promise<string> {
    switch (type) {
      case 'PROJECTS': {
        const rows = await this.prisma.project.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        return buildCsv(
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'budget', label: 'Budget' },
            { key: 'createdAt', label: 'Created At' },
          ],
          rows,
        );
      }
      case 'TASKS': {
        const rows = await this.prisma.task.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        return buildCsv(
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'code', label: 'Code' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
            { key: 'dueDate', label: 'Due Date' },
            { key: 'estimatedHours', label: 'Estimated Hours' },
            { key: 'actualHours', label: 'Actual Hours' },
            { key: 'createdAt', label: 'Created At' },
          ],
          rows,
        );
      }
      case 'DELIVERABLES': {
        const rows = await this.prisma.deliverable.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        return buildCsv(
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'code', label: 'Code' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'dueDate', label: 'Due Date' },
            { key: 'submittedDate', label: 'Submitted Date' },
            { key: 'createdAt', label: 'Created At' },
          ],
          rows,
        );
      }
      case 'EMPLOYEES': {
        const employees = await this.prisma.employee.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { employeeCode: 'asc' },
          include: { user: true },
        });
        const rows = employees.map((employee) => ({
          id: employee.id,
          employeeCode: employee.employeeCode,
          firstName: employee.user.firstName,
          lastName: employee.user.lastName,
          email: employee.user.email,
          employmentType: employee.employmentType,
          dateOfJoining: employee.dateOfJoining,
          createdAt: employee.createdAt,
        }));
        return buildCsv(
          [
            { key: 'id', label: 'ID' },
            { key: 'employeeCode', label: 'Employee Code' },
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email' },
            { key: 'employmentType', label: 'Employment Type' },
            { key: 'dateOfJoining', label: 'Date of Joining' },
            { key: 'createdAt', label: 'Created At' },
          ],
          rows,
        );
      }
    }
  }

  async generateReport(
    dto: GenerateReportDto,
    createdBy?: string,
  ): Promise<Report> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);

    const format = dto.format ?? 'CSV';
    const csv = await this.buildReportCsv(dto.type, dto.organizationId);
    const buffer = Buffer.from(csv, 'utf-8');
    const name =
      dto.name ??
      `${REPORT_TYPE_LABELS[dto.type]} Report - ${new Date().toISOString().slice(0, 10)}`;
    const fileName = `${dto.type.toLowerCase()}-${Date.now()}.csv`;

    const storagePath = await this.storageService.save(
      buffer,
      `reports/${dto.organizationId}`,
      fileName,
    );

    return this.reportsRepository.create({
      organizationId: dto.organizationId,
      name,
      type: dto.type,
      format,
      fileName,
      storagePath,
      mimeType: 'text/csv',
      sizeBytes: buffer.byteLength,
      createdBy,
    });
  }

  async deleteReport(id: string, deletedBy?: string): Promise<void> {
    await this.getReportOrThrow(id);
    await this.reportsRepository.softDelete(id, deletedBy);
  }

  async restoreReport(id: string, updatedBy?: string): Promise<Report> {
    await this.getReportOrThrow(id);
    return this.reportsRepository.restore(id, updatedBy);
  }

  async getDownloadInfo(id: string): Promise<ReportDownloadInfo> {
    const report = await this.getReportOrThrow(id);
    return {
      absolutePath: this.storageService.getAbsolutePath(report.storagePath),
      fileName: report.fileName,
      mimeType: report.mimeType,
    };
  }
}
