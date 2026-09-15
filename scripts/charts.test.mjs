import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import {
  createChartSpec,
  prepareChartRows,
} from '../packages/components/src/charts.ts';
import { INKS } from '../packages/theme/src/palette.ts';

const theme = {
  text: '#111111',
  rule: '#aaaaaa',
  inks: Object.fromEntries(INKS.map(({ id, hex }) => [id, hex])),
};
const base = {
  src: '/test.csv',
  title: 'Chart regression',
  description: 'Synthetic regression data.',
  type: 'bar',
  x: 'category',
  y: 'value',
};

test('narrow vertical category labels rotate and avoid overlap without rotating horizontal labels', () => {
  const rows = [
    { category: 'Aluminium', value: 2 },
    { category: 'Composite', value: 3 },
  ];
  const narrow = createChartSpec(base, rows, theme, 335);
  assert.equal(narrow.encoding.x.axis.labelAngle, -55);
  assert.equal(narrow.encoding.x.axis.labelLimit, 70);
  assert.equal(narrow.encoding.x.axis.labelOverlap, 'greedy');
  const horizontal = createChartSpec(
    { ...base, horizontal: true },
    rows,
    theme,
    335,
  );
  assert.equal(horizontal.encoding.y.axis.labelAngle, 0);
  const wide = createChartSpec(base, rows, theme, 800);
  assert.equal(wide.encoding.x.axis.labelAngle, 0);
});

async function rendered(config, raw, check) {
  const rows = prepareChartRows(raw, config);
  const spec = createChartSpec(config, rows, theme, 640);
  const view = await new View(parse(compile(spec).spec), {
    renderer: 'none',
  }).runAsync();
  try {
    await check(view);
  } finally {
    view.finalize();
  }
}

function barItems(view) {
  const bars = [];
  function visit(node) {
    if (node.marktype === 'rect' && node.role === 'mark')
      bars.push(...node.items);
    for (const item of node.items ?? []) visit(item);
  }
  visit(view.scenegraph().root);
  return bars;
}

for (const horizontal of [false, true]) {
  test(`${horizontal ? 'horizontal' : 'vertical'} category coloring preserves full bar thickness`, async () => {
    const raw = [
      { category: 'A', value: '2' },
      { category: 'B', value: '3' },
      { category: 'C', value: '4' },
    ];
    for (const color of [undefined, 'category']) {
      await rendered({ ...base, horizontal, color }, raw, (view) => {
        const bandwidth = view.scale(horizontal ? 'y' : 'x').bandwidth();
        const bars = barItems(view);
        assert.equal(bars.length, raw.length);
        for (const bar of bars)
          assert.ok(
            bar[horizontal ? 'height' : 'width'] / bandwidth > 0.8,
            'coloring the category must not subdivide its band',
          );
      });
    }
  });

  test(`${horizontal ? 'horizontal' : 'vertical'} distinct series remain grouped side by side`, async () => {
    const raw = [
      { category: 'A', series: 'First', value: '2' },
      { category: 'A', series: 'Second', value: '3' },
      { category: 'B', series: 'First', value: '4' },
      { category: 'B', series: 'Second', value: '5' },
    ];
    await rendered({ ...base, horizontal, color: 'series' }, raw, (view) => {
      const bandwidth = view.scale(horizontal ? 'y' : 'x').bandwidth();
      const bars = barItems(view);
      assert.equal(bars.length, raw.length);
      for (const bar of bars)
        assert.ok(
          bar[horizontal ? 'height' : 'width'] / bandwidth < 0.6,
          'two series must share each category band',
        );
      const category = bars.filter((bar) => bar.datum.category === 'A');
      assert.notEqual(
        category[0][horizontal ? 'y' : 'x'],
        category[1][horizontal ? 'y' : 'x'],
      );
    });
  });
}

test('numeric categories retain their identity in the rendered color scale', async () => {
  await rendered(
    { ...base, xType: 'quantitative', color: 'category' },
    [
      { category: '1', value: '2' },
      { category: '2', value: '3' },
    ],
    (view) => {
      assert.deepEqual(view.scale('color').domain(), [1, 2]);
      assert.equal(view.scale('color')(1), theme.inks.cobalt);
      assert.equal(view.scale('color')(2), theme.inks.cyan);
      assert.ok(barItems(view).every((bar) => typeof bar.fill === 'string'));
    },
  );
});

test('invalid numbers, missing columns, and misleading pie values are rejected', () => {
  assert.throws(
    () => prepareChartRows([{ category: 'A', value: 'oops' }], base),
    /finite number/,
  );
  assert.throws(
    () => prepareChartRows([{ category: 'A' }], base),
    /missing.*value/,
  );
  assert.throws(
    () => prepareChartRows([{ category: 'A', value: '' }], base),
    /no numeric values/,
  );
  assert.throws(
    () =>
      prepareChartRows([{ category: 'A', value: '-1' }], {
        ...base,
        type: 'pie',
      }),
    /negative/,
  );
  assert.throws(
    () =>
      prepareChartRows([{ category: 'A', value: '0' }], {
        ...base,
        type: 'donut',
      }),
    /positive/,
  );
});

test('missing dates stay missing and never become an epoch-zero observation', async () => {
  const config = { ...base, type: 'line', xType: 'temporal' };
  const raw = [
    { category: '', value: '1' },
    { category: '2026-09-08T00:00:00Z', value: '2' },
    { category: '2026-09-09T00:00:00Z', value: '3' },
  ];
  assert.equal(prepareChartRows(raw, config)[0].category, null);
  await rendered(config, raw, (view) => {
    assert.deepEqual(view.scale('x').domain().map(Number), [
      Date.parse(raw[1].category),
      Date.parse(raw[2].category),
    ]);
  });
  assert.throws(
    () => prepareChartRows([{ category: 'not-a-date', value: '1' }], config),
    /valid date/,
  );
  assert.throws(
    () => prepareChartRows([{ category: '  ', value: '1' }], config),
    /no dates/,
  );
});

test('zoom restoration state includes only chart interaction signals', async () => {
  const config = { ...base, type: 'line', xType: 'quantitative' };
  const rows = prepareChartRows(
    [
      { category: '1', value: '2' },
      { category: '2', value: '3' },
    ],
    config,
  );
  const view = await new View(
    parse(compile(createChartSpec(config, rows, theme, 640)).spec),
    {
      renderer: 'none',
    },
  ).runAsync();
  try {
    const state = view.getState({
      signals: (name) => name.startsWith('alk_window_'),
      data: () => false,
      recurse: false,
    });
    assert.ok(
      Object.keys(state.signals).every((name) => name.startsWith('alk_window')),
    );
    assert.deepEqual(state.data, {});
    assert.equal('subcontext' in state, false);
  } finally {
    view.finalize();
  }
});

test('eligible charts retain their scale-bound interval while zoom and pan are disabled', () => {
  const enabled = createChartSpec(
    { ...base, type: 'line', xType: 'quantitative', zoom: true },
    [
      { category: 1, value: 2 },
      { category: 2, value: 3 },
    ],
    theme,
    640,
  );
  const disabled = createChartSpec(
    { ...base, type: 'line', xType: 'quantitative', zoom: false },
    [
      { category: 1, value: 2 },
      { category: 2, value: 3 },
    ],
    theme,
    640,
  );
  assert.equal(enabled.params[0].select.translate, true);
  assert.equal(enabled.params[0].select.zoom, 'wheel![event.shiftKey]');
  assert.equal(disabled.params[0].select.translate, false);
  assert.equal(disabled.params[0].select.zoom, false);
  assert.equal(disabled.params[0].bind, 'scales');
});

test('a scale-bound interval domain survives zoom controls being disabled and restored', async () => {
  const config = { ...base, type: 'line', xType: 'quantitative' };
  const rows = prepareChartRows(
    [
      { category: '1', value: '2' },
      { category: '2', value: '3' },
      { category: '3', value: '4' },
    ],
    config,
  );
  const view = async (zoom) =>
    new View(
      parse(
        compile(createChartSpec({ ...config, zoom }, rows, theme, 640)).spec,
      ),
      { renderer: 'none' },
    ).runAsync();
  const enabled = await view(true);
  const disabled = await view(false);
  const restored = await view(true);
  const domain = [1.5, 2.5];
  const signalName = `alk_window_${config.x}`;
  try {
    enabled.signal(signalName, domain);
    await enabled.runAsync();
    const state = enabled.getState({
      signals: (name) => name.startsWith('alk_window_'),
      data: () => false,
      recurse: false,
    });
    const [signal, savedDomain] = Object.entries(state.signals).find(
      ([, value]) =>
        Array.isArray(value) &&
        value.length === 2 &&
        value.every((endpoint) => typeof endpoint === 'number'),
    );
    assert.equal(signal, signalName);
    disabled.signal(signal, savedDomain);
    await disabled.runAsync();
    restored.signal(signal, savedDomain);
    await restored.runAsync();
    assert.deepEqual(disabled.scale('x').domain(), domain);
    assert.deepEqual(restored.scale('x').domain(), domain);
  } finally {
    enabled.finalize();
    disabled.finalize();
    restored.finalize();
  }
});
