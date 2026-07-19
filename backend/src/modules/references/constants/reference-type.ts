export const REFERENCE_TYPES = [
  'LINK',
  'REPOSITORY',
  'DESIGN',
  'DOCUMENTATION',
  'OTHER',
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];
