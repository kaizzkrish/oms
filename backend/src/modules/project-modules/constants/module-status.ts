export const MODULE_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ModuleStatus = (typeof MODULE_STATUSES)[number];
