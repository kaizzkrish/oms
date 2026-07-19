import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from '../constants/deliverable-status';
import {
  DELIVERABLE_TYPES,
  type DeliverableType,
} from '../constants/deliverable-type';

export class CreateDeliverableDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: DELIVERABLE_TYPES,
    default: 'DOCUMENT',
    required: false,
  })
  @IsOptional()
  @IsIn(DELIVERABLE_TYPES)
  type?: DeliverableType;

  @ApiProperty({
    enum: DELIVERABLE_STATUSES,
    default: 'PENDING',
    required: false,
  })
  @IsOptional()
  @IsIn(DELIVERABLE_STATUSES)
  status?: DeliverableStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  submittedDate?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
