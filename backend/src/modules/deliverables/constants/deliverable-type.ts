export const DELIVERABLE_TYPES = [
  'DOCUMENT',
  'SOFTWARE',
  'DESIGN',
  'REPORT',
  'OTHER',
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
