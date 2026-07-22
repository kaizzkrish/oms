export const REPORT_TYPES = [
  'PROJECTS',
  'TASKS',
  'DELIVERABLES',
  'EMPLOYEES',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
