function toStringValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = toStringValue(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Builds an RFC 4180 CSV document (CRLF row endings, quoted fields
 * containing commas/quotes/newlines) from a header row and record objects.
 */
export function buildCsv<T extends Record<string, unknown>>(
  columns: { key: keyof T; label: string }[],
  rows: T[],
): string {
  const header = columns.map((column) => escapeCsvValue(column.label));
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])),
  );
  return [header, ...lines].map((line) => line.join(',')).join('\r\n');
}
