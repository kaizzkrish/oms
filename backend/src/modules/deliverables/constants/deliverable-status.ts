export const DELIVERABLE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
