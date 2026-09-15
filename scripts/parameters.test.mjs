import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exposedParameters,
  renderParameters,
  validateParameters,
} from '../packages/components/src/parameters.ts';
import { chartCanZoom } from '../packages/components/src/charts.ts';
import {
  renderChart,
  renderShader,
} from '../packages/components/src/visualization-renderers.ts';

const controls = [
  {
    name: 'frequency',
    label: 'Frequency',
    type: 'number',
    min: 3,
    max: 18,
    step: 0.1,
  },
  { name: 'ink', label: 'Ink', type: 'select', options: ['cobalt', 'violet'] },
  { name: 'grid', label: 'Grid', type: 'boolean' },
];

test('parameters only render declared exposed controls and escape labels', () => {
  assert.equal(
    renderParameters(exposedParameters(controls, false, true), {}),
    '',
  );
  const html = renderParameters(exposedParameters(controls, ['ink'], false), {
    ink: 'cobalt',
  });
  assert.match(html, /data-parameter="ink"/);
  assert.doesNotMatch(html, /data-parameter="frequency"/);
  assert.match(
    renderParameters([{ ...controls[1], label: '<Ink>' }], { ink: 'cobalt' }),
    /&lt;Ink&gt;/,
  );
  assert.doesNotMatch(renderShader({ parameters: false }), /data-parameter=/);
  assert.match(
    renderShader({ frequency: 9.05 }),
    /value="9\.1"[^>]*data-frequency/,
  );
  assert.throws(
    () => exposedParameters(controls, ['unknown'], false),
    /Unknown/,
  );
  assert.throws(
    () => exposedParameters(controls, 'frequency', false),
    /must be true, false, or an array/,
  );
});

test('parameter patches reject unknown, non-finite, out-of-range, and invalid values', () => {
  assert.deepEqual(validateParameters(controls, { frequency: 9, grid: true }), {
    frequency: 9,
    grid: true,
  });
  for (const patch of [
    { unknown: 1 },
    { frequency: Number.NaN },
    { frequency: 18.1 },
    { frequency: 9.05 },
    { ink: 'rose' },
    { grid: 'true' },
  ])
    assert.throws(() => validateParameters(controls, patch));
});

test('chart zoom eligibility is structural, so a disabled initial zoom can be exposed', () => {
  const base = {
    src: '/fixture.csv',
    type: 'line',
    x: 'time',
    y: 'value',
    title: 'Signal',
    description: 'Fixture.',
  };
  assert.equal(chartCanZoom({ ...base, zoom: false }), true);
  assert.equal(chartCanZoom({ ...base, type: 'bar' }), false);
  assert.equal(chartCanZoom({ ...base, xType: 'nominal' }), false);
  const html = renderChart({ ...base, zoom: false, parameters: true });
  assert.match(html, /data-chart-reset hidden/);
  assert.match(html, /data-chart-hint hidden/);
  assert.match(html, /data-parameter="zoom"/);
});
