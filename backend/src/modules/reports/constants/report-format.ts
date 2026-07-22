export const REPORT_FORMATS = ['CSV'] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];
