export const MILESTONE_STATUSES = [
  'PENDING',
  'AT_RISK',
  'ACHIEVED',
  'MISSED',
  'CANCELLED',
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
