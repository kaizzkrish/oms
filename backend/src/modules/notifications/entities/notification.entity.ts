import { ApiProperty } from '@nestjs/swagger';
import type { Notification } from '../../../generated/prisma/client';
import type { NotificationType } from '../constants/notification-type';

export class NotificationEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['TASK_ASSIGNED', 'GENERAL'] })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ nullable: true })
  link: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: NotificationEntity) {
    this.id = props.id;
    this.userId = props.userId;
    this.type = props.type;
    this.title = props.title;
    this.message = props.message;
    this.link = props.link;
    this.isRead = props.isRead;
    this.readAt = props.readAt;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(notification: Notification): NotificationEntity {
    return new NotificationEntity({
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
      readAt: notification.readAt,
      isActive: notification.isActive,
      createdAt: notification.createdAt,
    });
  }
}
