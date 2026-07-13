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
  EMPLOYMENT_TYPES,
  type EmploymentType,
} from '../constants/employment-type';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the department',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateEmployeeDto, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the designation',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateEmployeeDto, value: unknown) => value !== null)
  @IsUUID()
  designationId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the office',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateEmployeeDto, value: unknown) => value !== null)
  @IsUUID()
  officeId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the reporting manager',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateEmployeeDto, value: unknown) => value !== null)
  @IsUUID()
  reportingManagerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  employeeCode?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to clear the date of leaving',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateEmployeeDto, value: unknown) => value !== null)
  @IsDateString()
  dateOfLeaving?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
