export const PROJECT_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
