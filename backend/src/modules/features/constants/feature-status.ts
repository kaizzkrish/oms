export const FEATURE_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
