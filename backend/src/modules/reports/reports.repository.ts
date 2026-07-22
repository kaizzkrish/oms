import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Report } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { ReportSortField } from './dto/query-reports.dto';
import type { ReportFormat } from './constants/report-format';
import type { ReportType } from './constants/report-type';

export interface CreateReportData {
  organizationId: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdBy?: string;
}

export interface FindManyReportsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  type?: ReportType;
  sortBy: ReportSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({ where: { id } });
  }

  create(data: CreateReportData): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Report> {
    return this.prisma.report.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Report> {
    return this.prisma.report.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyReportsOptions,
      'search' | 'isActive' | 'organizationId' | 'type'
    >,
  ): Prisma.ReportWhereInput {
    const where: Prisma.ReportWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }
    if (options.type) {
      where.type = options.type;
    }
    if (options.search) {
      where.name = { contains: options.search, mode: 'insensitive' };
    }
    return where;
  }

  async findMany(options: FindManyReportsOptions): Promise<[Report[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.report.count({ where }),
    ]);
    return [items, total];
  }
}
