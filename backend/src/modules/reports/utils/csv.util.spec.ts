import { buildCsv } from './csv.util';

describe('buildCsv', () => {
  it('builds a header row and one row per record', () => {
    const csv = buildCsv(
      [
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
      ],
      [
        { name: 'Website Redesign', status: 'IN_PROGRESS' },
        { name: 'Mobile App', status: 'PLANNING' },
      ],
    );

    expect(csv).toBe(
      'Name,Status\r\nWebsite Redesign,IN_PROGRESS\r\nMobile App,PLANNING',
    );
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    const csv = buildCsv(
      [{ key: 'name', label: 'Name' }],
      [
        { name: 'Contains, a comma' },
        { name: 'Has "quotes"' },
        { name: 'Multi\nline' },
      ],
    );

    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"Contains, a comma"');
    expect(lines[2]).toBe('"Has ""quotes"""');
    expect(lines[3]).toBe('"Multi\nline"');
  });

  it('renders null and undefined values as empty strings', () => {
    const csv = buildCsv(
      [{ key: 'value', label: 'Value' }],
      [{ value: null }, { value: undefined }],
    );

    expect(csv).toBe('Value\r\n\r\n');
  });

  it('serializes Date values as ISO strings', () => {
    const date = new Date('2026-04-23T00:00:00.000Z');
    const csv = buildCsv(
      [{ key: 'dueDate', label: 'Due Date' }],
      [{ dueDate: date }],
    );

    expect(csv).toBe('Due Date\r\n2026-04-23T00:00:00.000Z');
  });

  it('returns just the header row when there are no records', () => {
    const csv = buildCsv([{ key: 'name', label: 'Name' }], []);

    expect(csv).toBe('Name');
  });
});
