import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from '../constants/deliverable-status';
import {
  DELIVERABLE_TYPES,
  type DeliverableType,
} from '../constants/deliverable-type';

export class UpdateDeliverableDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the milestone',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateDeliverableDto, value: unknown) => value !== null)
  @IsUUID()
  milestoneId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the owner',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateDeliverableDto, value: unknown) => value !== null)
  @IsUUID()
  ownerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: DELIVERABLE_TYPES })
  @IsOptional()
  @IsIn(DELIVERABLE_TYPES)
  type?: DeliverableType;

  @ApiPropertyOptional({ enum: DELIVERABLE_STATUSES })
  @IsOptional()
  @IsIn(DELIVERABLE_STATUSES)
  status?: DeliverableStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the due date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateDeliverableDto, value: unknown) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the submitted date',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateDeliverableDto, value: unknown) => value !== null)
  @IsDateString()
  submittedDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
