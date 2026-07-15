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
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from '../constants/milestone-status';

export class CreateMilestoneDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

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
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: MILESTONE_STATUSES,
    default: 'PENDING',
    required: false,
  })
  @IsOptional()
  @IsIn(MILESTONE_STATUSES)
  status?: MilestoneStatus;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  achievedDate?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
