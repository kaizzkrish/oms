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
  EMPLOYMENT_TYPES,
  type EmploymentType,
} from '../constants/employment-type';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'The user account this employee profile belongs to',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  reportingManagerId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  employeeCode!: string;

  @ApiProperty({
    enum: EMPLOYMENT_TYPES,
    default: 'FULL_TIME',
    required: false,
  })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiProperty()
  @IsDateString()
  dateOfJoining!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfLeaving?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
