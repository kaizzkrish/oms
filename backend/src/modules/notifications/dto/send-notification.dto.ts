import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../constants/notification-type';

export class SendNotificationDto {
  @ApiProperty({ description: 'The user who should receive the notification' })
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({
    enum: NOTIFICATION_TYPES,
    default: 'GENERAL',
    required: false,
  })
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  message!: string;

  @ApiProperty({
    required: false,
    description: 'Optional relative link to deep-link into the app',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  link?: string;
}
