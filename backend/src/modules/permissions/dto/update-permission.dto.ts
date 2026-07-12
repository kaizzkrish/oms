import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  PERMISSION_NAME_MESSAGE,
  PERMISSION_NAME_REGEX,
} from '../validators/permission-name';

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: 'Project.Create' })
  @IsOptional()
  @IsString()
  @Matches(PERMISSION_NAME_REGEX, { message: PERMISSION_NAME_MESSAGE })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass null to remove the permission from its group',
  })
  @IsOptional()
  @ValidateIf((_object: UpdatePermissionDto, value: unknown) => value !== null)
  @IsUUID()
  groupId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
