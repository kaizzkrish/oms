export const DOCUMENT_TYPES = [
  'CONTRACT',
  'INVOICE',
  'REPORT',
  'SPECIFICATION',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
