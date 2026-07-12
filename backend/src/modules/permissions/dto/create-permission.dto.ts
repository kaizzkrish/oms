import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PERMISSION_NAME_MESSAGE,
  PERMISSION_NAME_REGEX,
} from '../validators/permission-name';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Project.Create' })
  @IsString()
  @Matches(PERMISSION_NAME_REGEX, { message: PERMISSION_NAME_MESSAGE })
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
