import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  @ApiOperation({ summary: "Get the current user's unread notification count" })
  async unreadCount(
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(
      currentUser.sub,
    );
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({
    summary: "Mark all of the current user's notifications as read",
  })
  async markAllRead(
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.markAllRead(currentUser.sub);
    return { count };
  }

  @Post()
  @RequirePermissions('Notifications.Create')
  @ApiOperation({ summary: 'Send a notification to a specific user' })
  async send(
    @Body() dto: SendNotificationDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsService.sendNotification(
      dto,
      currentUser.sub,
    );
    return NotificationEntity.fromPrisma(notification);
  }

  @Get()
  @ApiOperation({
    summary:
      "List the current user's own notifications with pagination, filtering (by read/active status), and sorting",
  })
  @ApiPaginatedResponse(NotificationEntity)
  async findAll(
    @Query() query: QueryNotificationsDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<{ items: NotificationEntity[]; meta: unknown }> {
    const result = await this.notificationsService.listOwnNotifications(
      currentUser.sub,
      query,
    );
    return {
      items: result.items.map((notification) =>
        NotificationEntity.fromPrisma(notification),
      ),
      meta: result.meta,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of your own notifications as read' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsService.markRead(
      id,
      currentUser.sub,
    );
    return NotificationEntity.fromPrisma(notification);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dismiss (soft-delete) one of your own notifications',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.notificationsService.deleteNotification(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a dismissed notification of your own' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsService.restoreNotification(
      id,
      currentUser.sub,
    );
    return NotificationEntity.fromPrisma(notification);
  }
}
