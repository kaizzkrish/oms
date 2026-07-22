import { apiSlice } from '../../shared/api/apiSlice';

export const NOTIFICATION_TYPES = ['TASK_ASSIGNED', 'GENERAL'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedNotifications {
  items: NotificationRecord[];
  meta: PaginationMeta;
}

export interface ListNotificationsParams {
  page: number;
  limit: number;
  isRead?: boolean;
  isActive?: boolean;
  sortOrder: 'asc' | 'desc';
}

export interface SendNotificationBody {
  targetUserId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<PaginatedNotifications, ListNotificationsParams>({
      query: (params) => ({ url: '/notifications', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD_COUNT' },
        ...(result?.items.map((notification) => ({
          type: 'Notification' as const,
          id: notification.id,
        })) ?? []),
      ],
    }),
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => ({ url: '/notifications/unread-count', method: 'GET' }),
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),
    sendNotification: builder.mutation<NotificationRecord, SendNotificationBody>({
      query: (body) => ({ url: '/notifications', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationRead: builder.mutation<NotificationRecord, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
        { type: 'Notification', id },
      ],
    }),
    markAllNotificationsRead: builder.mutation<{ count: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
        { type: 'Notification', id },
      ],
    }),
    restoreNotification: builder.mutation<NotificationRecord, string>({
      query: (id) => ({ url: `/notifications/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
        { type: 'Notification', id },
      ],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useSendNotificationMutation,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useRestoreNotificationMutation,
} = notificationsApi;
