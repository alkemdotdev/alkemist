import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chartExportFilename,
  chartRowsToCsv,
  chartTablePage,
} from '../packages/components/src/chart-data.ts';

const rows = Array.from({ length: 27 }, (_, index) => ({
  label: index === 0 ? '=SUM(A1:A2)' : `row ${index + 1}`,
  value: index,
}));

test('chart tables page prepared rows with bounded page sizes', () => {
  const first = chartTablePage(rows, 0);
  const last = chartTablePage(rows, 999);
  assert.equal(first.rows.length, 25);
  assert.equal(first.pageCount, 2);
  assert.equal(last.page, 1);
  assert.equal(last.rows.length, 2);
  assert.equal(last.total, 27);
  for (const invalid of [Number.NaN, Infinity, -Infinity])
    assert.throws(() => chartTablePage(rows, invalid), /finite number/);
});

test('chart CSV exports prepared rows with formula and CSV escaping', () => {
  const csv = chartRowsToCsv([
    {
      label: '=SUM(A1:A2)',
      note: 'a, "quoted" value',
      empty: null,
      negative: -3.5,
    },
  ]);
  assert.equal(
    chartRowsToCsv([{ value: '\n =1+1' }]),
    'value\r\n\"\'\n =1+1\"',
  );
  assert.equal(
    csv,
    'label,note,empty,negative\r\n\'=SUM(A1:A2),"a, ""quoted"" value",,-3.5',
  );
});

test('chart export names are stable and safe for downloads', () => {
  assert.equal(
    chartExportFilename('Field / signal?', 'svg'),
    'field-signal.svg',
  );
  assert.equal(chartExportFilename('   ', 'png'), 'chart.png');
});
