export const NOTIFICATION_TYPES = ['TASK_ASSIGNED', 'GENERAL'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
