import { NotFoundException } from '@nestjs/common';
import type { Notification, User } from '../../generated/prisma/client';
import type { UsersService } from '../users/users.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

function createNotificationFixture(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'GENERAL',
    title: 'Welcome',
    message: 'Welcome to the system',
    link: null,
    isRead: false,
    readAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user-2',
    email: 'target@example.com',
    passwordHash: 'hash',
    firstName: 'Target',
    lastName: 'User',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let repository: jest.Mocked<NotificationsRepository>;
  let usersService: jest.Mocked<UsersService>;
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      countUnread: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<NotificationsRepository>;

    usersService = {
      getUserOrThrow: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new NotificationsService(repository, usersService);
  });

  describe('sendNotification', () => {
    it('creates a notification once the target user is verified', async () => {
      usersService.getUserOrThrow.mockResolvedValue(createUserFixture());
      repository.create.mockResolvedValue(
        createNotificationFixture({ userId: 'user-2' }),
      );

      const result = await service.sendNotification(
        {
          targetUserId: 'user-2',
          title: 'Welcome',
          message: 'Welcome to the system',
        },
        'admin-1',
      );

      expect(usersService.getUserOrThrow).toHaveBeenCalledWith('user-2');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'GENERAL',
          title: 'Welcome',
          message: 'Welcome to the system',
          createdBy: 'admin-1',
        }),
      );
      expect(result.userId).toBe('user-2');
    });

    it('propagates NotFoundException when the target user does not exist', async () => {
      usersService.getUserOrThrow.mockRejectedValue(
        new NotFoundException('User with id "user-2" not found'),
      );

      await expect(
        service.sendNotification({
          targetUserId: 'user-2',
          title: 'Welcome',
          message: 'Welcome to the system',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyUser', () => {
    it('creates a notification directly without checking permissions', async () => {
      repository.create.mockResolvedValue(createNotificationFixture());

      await service.notifyUser(
        'user-1',
        {
          type: 'TASK_ASSIGNED',
          title: 'New task assigned',
          message: 'You were assigned to "Build hero banner"',
          link: '/tasks',
        },
        'admin-1',
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: 'You were assigned to "Build hero banner"',
        link: '/tasks',
        createdBy: 'admin-1',
      });
    });
  });

  describe('listOwnNotifications', () => {
    it('scopes the query to the given user', async () => {
      repository.findMany.mockResolvedValue([[createNotificationFixture()], 1]);

      const result = await service.listOwnNotifications('user-1', {
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('delegates to the repository', async () => {
      repository.countUnread.mockResolvedValue(3);

      const count = await service.getUnreadCount('user-1');

      expect(repository.countUnread).toHaveBeenCalledWith('user-1');
      expect(count).toBe(3);
    });
  });

  describe('markRead', () => {
    it('marks an owned notification as read', async () => {
      repository.findById.mockResolvedValue(createNotificationFixture());
      repository.markRead.mockResolvedValue(
        createNotificationFixture({ isRead: true, readAt: new Date() }),
      );

      const result = await service.markRead('notification-1', 'user-1');

      expect(repository.markRead).toHaveBeenCalledWith(
        'notification-1',
        'user-1',
      );
      expect(result.isRead).toBe(true);
    });

    it('throws NotFoundException when the notification does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.markRead('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the notification belongs to another user', async () => {
      repository.findById.mockResolvedValue(
        createNotificationFixture({ userId: 'other-user' }),
      );

      await expect(
        service.markRead('notification-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.markRead).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('delegates to the repository with the acting user as both owner and actor', async () => {
      repository.markAllRead.mockResolvedValue(5);

      const count = await service.markAllRead('user-1');

      expect(repository.markAllRead).toHaveBeenCalledWith('user-1', 'user-1');
      expect(count).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('soft-deletes an owned notification', async () => {
      repository.findById.mockResolvedValue(createNotificationFixture());
      repository.softDelete.mockResolvedValue(
        createNotificationFixture({ isActive: false }),
      );

      await service.deleteNotification('notification-1', 'user-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'notification-1',
        'user-1',
      );
    });

    it('throws NotFoundException when the notification belongs to another user', async () => {
      repository.findById.mockResolvedValue(
        createNotificationFixture({ userId: 'other-user' }),
      );

      await expect(
        service.deleteNotification('notification-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restoreNotification', () => {
    it('restores an owned, soft-deleted notification', async () => {
      repository.findById.mockResolvedValue(
        createNotificationFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createNotificationFixture());

      const result = await service.restoreNotification(
        'notification-1',
        'user-1',
      );

      expect(repository.restore).toHaveBeenCalledWith(
        'notification-1',
        'user-1',
      );
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when the notification belongs to another user', async () => {
      repository.findById.mockResolvedValue(
        createNotificationFixture({ userId: 'other-user' }),
      );

      await expect(
        service.restoreNotification('notification-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.restore).not.toHaveBeenCalled();
    });
  });
});
