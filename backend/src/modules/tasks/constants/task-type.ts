export const TASK_TYPES = ['TASK', 'BUG', 'STORY', 'SUBTASK'] as const;

export type TaskType = (typeof TASK_TYPES)[number];
