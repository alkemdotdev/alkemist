import type { ChartRow } from './charts';

/** A small page prevents large datasets from becoming an unbounded accessibility tree. */
export const chartTablePageSize = 25;

export interface ChartTablePage {
  fields: string[];
  rows: ChartRow[];
  page: number;
  pageCount: number;
  total: number;
}

export function chartFields(rows: readonly ChartRow[]): string[] {
  return rows.length ? Object.keys(rows[0]) : [];
}

export function chartTablePage(
  rows: readonly ChartRow[],
  page: number,
  size = chartTablePageSize,
): ChartTablePage {
  if (!Number.isInteger(size) || size < 1)
    throw new Error('Chart table page size must be a positive integer.');
  if (!Number.isFinite(page))
    throw new Error('Chart table page must be a finite number.');
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(0, Math.trunc(page)), pageCount - 1);
  return {
    fields: chartFields(rows),
    rows: rows.slice(current * size, (current + 1) * size),
    page: current,
    pageCount,
    total: rows.length,
  };
}

/**
 * Spreadsheet applications may execute cells starting with these characters.
 * Prefixing an apostrophe retains the displayed value while making downloaded
 * data inert when it is opened as CSV.
 */
export function csvCell(value: ChartRow[string]): string {
  let text = value === null ? '' : String(value);
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Serialize the already prepared values used by Vega, never the source response. */
export function chartRowsToCsv(rows: readonly ChartRow[]): string {
  const fields = chartFields(rows);
  return [
    fields.map((field) => csvCell(field)).join(','),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(',')),
  ].join('\r\n');
}

export function chartExportFilename(
  title: string,
  extension: 'csv' | 'svg' | 'png',
) {
  const stem = title
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${stem || 'chart'}.${extension}`;
}
