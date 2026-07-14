export const FEATURE_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];
