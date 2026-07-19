export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
