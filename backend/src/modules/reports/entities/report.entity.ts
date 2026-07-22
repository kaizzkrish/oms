import { ApiProperty } from '@nestjs/swagger';
import type { Report } from '../../../generated/prisma/client';
import type { ReportFormat } from '../constants/report-format';
import type { ReportType } from '../constants/report-type';

export class ReportEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['PROJECTS', 'TASKS', 'DELIVERABLES', 'EMPLOYEES'] })
  type: ReportType;

  @ApiProperty({ enum: ['CSV'] })
  format: ReportFormat;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: ReportEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.name = props.name;
    this.type = props.type;
    this.format = props.format;
    this.fileName = props.fileName;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(report: Report): ReportEntity {
    return new ReportEntity({
      id: report.id,
      organizationId: report.organizationId,
      name: report.name,
      type: report.type as ReportType,
      format: report.format as ReportFormat,
      fileName: report.fileName,
      mimeType: report.mimeType,
      sizeBytes: report.sizeBytes,
      isActive: report.isActive,
      createdAt: report.createdAt,
    });
  }
}
