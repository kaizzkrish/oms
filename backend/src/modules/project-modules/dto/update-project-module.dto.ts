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
import { MODULE_STATUSES, type ModuleStatus } from '../constants/module-status';

export class UpdateProjectModuleDto {
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
    description: 'Pass null to unassign the module lead',
  })
  @IsOptional()
  @ValidateIf(
    (_object: UpdateProjectModuleDto, value: unknown) => value !== null,
  )
  @IsUUID()
  moduleLeadId?: string | null;

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
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: MODULE_STATUSES })
  @IsOptional()
  @IsIn(MODULE_STATUSES)
  status?: ModuleStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the start date',
  })
  @IsOptional()
  @ValidateIf(
    (_object: UpdateProjectModuleDto, value: unknown) => value !== null,
  )
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the end date',
  })
  @IsOptional()
  @ValidateIf(
    (_object: UpdateProjectModuleDto, value: unknown) => value !== null,
  )
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
