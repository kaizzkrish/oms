export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
