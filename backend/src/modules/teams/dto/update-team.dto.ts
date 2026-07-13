import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the department',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTeamDto, value: unknown) => value !== null)
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to unassign the team leader',
  })
  @IsOptional()
  @ValidateIf((_object: UpdateTeamDto, value: unknown) => value !== null)
  @IsUUID()
  teamLeaderId?: string | null;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
