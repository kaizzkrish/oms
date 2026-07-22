import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Notification } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { NotificationType } from './constants/notification-type';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdBy?: string;
}

export interface FindManyNotificationsOptions {
  userId: string;
  skip: number;
  take: number;
  isRead?: boolean;
  isActive?: boolean;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  create(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  markRead(id: string, updatedBy?: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date(), updatedBy },
    });
  }

  async markAllRead(userId: string, updatedBy?: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date(), updatedBy },
    });
    return result.count;
  }

  softDelete(id: string, deletedBy?: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyNotificationsOptions,
      'userId' | 'isRead' | 'isActive'
    >,
  ): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = { userId: options.userId };
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.isRead !== undefined) {
      where.isRead = options.isRead;
    }
    return where;
  }

  async findMany(
    options: FindManyNotificationsOptions,
  ): Promise<[Notification[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: options.sortOrder },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return [items, total];
  }
}
