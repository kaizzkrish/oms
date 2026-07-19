export const SPRINT_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];
