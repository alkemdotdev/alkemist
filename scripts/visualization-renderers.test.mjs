import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderChart,
  renderModel,
  renderShader,
} from '../packages/components/src/visualization-renderers.ts';

const chart = {
  src: '/data/series.csv',
  type: 'line',
  x: 'time',
  y: 'value',
  title: 'Signal',
  description: 'A reading',
};

test('visualization renderers import and render without browser globals', () => {
  assert.equal(typeof globalThis.HTMLElement, 'undefined');
  assert.match(renderChart(chart), /<alk-chart/);
  assert.match(renderShader({}), /<alk-shader/);
});

test('chart markup escapes configuration and retains the non-zoom fallback', () => {
  const markup = renderChart({
    ...chart,
    type: 'bar',
    title: '<img src=x>',
    description: '" onmouseover="run()',
    height: Number.NaN,
  });
  assert.match(markup, /aria-label="&lt;img src=x&gt;"/);
  assert.match(markup, /&quot; onmouseover=&quot;run\(\)/);
  assert.match(markup, /min-height: 300px/);
  assert.doesNotMatch(markup, /data-chart-reset/);
  assert.doesNotMatch(markup, /<img src=x>|onmouseover="run/);
});

test('visualization asset links reject executable and non-web URL schemes', () => {
  for (const source of [
    'javascript:alert(1)',
    'data:text/html,boom',
    'vbscript:msgbox(1)',
    'ftp://example.test/model.glb',
    'file:///private/asset.glb',
  ]) {
    assert.throws(
      () => renderModel({ src: source, title: 'Asset' }),
      /HTTP\(S\) or relative asset URL/,
      source,
    );
  }
  assert.match(
    renderModel({ src: 'https://cdn.example.test/asset.glb', title: 'Asset' }),
    /data-src="https:\/\/cdn\.example\.test\/asset\.glb"/,
  );
  assert.match(renderChart(chart), /href="\/data\/series\.csv" download/);
});

test('optional visualization classes are omitted instead of serialized as text', () => {
  const model = renderModel({ src: '/asset.glb', title: 'Model' });
  const shader = renderShader({});
  assert.doesNotMatch(model, /undefined/);
  assert.doesNotMatch(shader, /undefined/);
  assert.match(
    renderModel({
      src: '/asset.glb',
      title: '<Model>',
      class: 'wide" onclick="run()',
    }),
    /class="alk-model wide&quot; onclick=&quot;run\(\)"/,
  );
});
