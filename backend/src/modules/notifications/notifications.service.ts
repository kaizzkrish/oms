import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { UsersService } from '../users/users.service';
import type { NotificationType } from './constants/notification-type';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';
import type { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationsRepository } from './notifications.repository';

export interface NotifyUserInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Looks up a notification and verifies it belongs to `userId`. Returns
   * NotFoundException (not Forbidden) when it belongs to someone else, so a
   * caller can't distinguish "doesn't exist" from "isn't yours" for another
   * user's notification id.
   */
  private async getOwnNotificationOrThrow(
    id: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }
    return notification;
  }

  async listOwnNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.notificationsRepository.findMany({
      userId,
      skip,
      take: query.limit,
      isRead: query.isRead,
      isActive: query.isActive,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  /**
   * Internal producer API for other modules to notify a user (e.g. Tasks
   * notifying an assignee) — bypasses the `Notifications.Create` permission
   * check that only gates the admin-facing "send to anyone" endpoint.
   */
  async notifyUser(
    userId: string,
    input: NotifyUserInput,
    createdBy?: string,
  ): Promise<Notification> {
    return this.notificationsRepository.create({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      createdBy,
    });
  }

  async sendNotification(
    dto: SendNotificationDto,
    createdBy?: string,
  ): Promise<Notification> {
    await this.usersService.getUserOrThrow(dto.targetUserId);
    return this.notifyUser(
      dto.targetUserId,
      {
        type: dto.type ?? 'GENERAL',
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
      createdBy,
    );
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    await this.getOwnNotificationOrThrow(id, userId);
    return this.notificationsRepository.markRead(id, userId);
  }

  markAllRead(userId: string): Promise<number> {
    return this.notificationsRepository.markAllRead(userId, userId);
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await this.getOwnNotificationOrThrow(id, userId);
    await this.notificationsRepository.softDelete(id, userId);
  }

  async restoreNotification(id: string, userId: string): Promise<Notification> {
    await this.getOwnNotificationOrThrow(id, userId);
    return this.notificationsRepository.restore(id, userId);
  }
}
