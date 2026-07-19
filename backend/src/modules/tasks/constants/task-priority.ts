export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
