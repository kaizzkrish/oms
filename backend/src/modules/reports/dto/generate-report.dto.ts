import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { REPORT_FORMATS, type ReportFormat } from '../constants/report-format';
import { REPORT_TYPES, type ReportType } from '../constants/report-type';

export class GenerateReportDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ enum: REPORT_TYPES })
  @IsIn(REPORT_TYPES)
  type!: ReportType;

  @ApiProperty({
    required: false,
    description: 'Defaults to "<Type> Report - <date>" when omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiProperty({ enum: REPORT_FORMATS, default: 'CSV', required: false })
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format?: ReportFormat;
}
