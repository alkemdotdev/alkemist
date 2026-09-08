import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import {
  createAlkChartSpec,
  prepareAlkChartRows,
} from '../packages/ui/src/charts.ts';
import { ALK_INKS } from '../packages/ui/src/palette.ts';

const theme = {
  text: '#111111',
  rule: '#aaaaaa',
  inks: Object.fromEntries(ALK_INKS.map(({ id, hex }) => [id, hex])),
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
  const narrow = createAlkChartSpec(base, rows, theme, 335);
  assert.equal(narrow.encoding.x.axis.labelAngle, -55);
  assert.equal(narrow.encoding.x.axis.labelLimit, 70);
  assert.equal(narrow.encoding.x.axis.labelOverlap, 'greedy');
  const horizontal = createAlkChartSpec(
    { ...base, horizontal: true },
    rows,
    theme,
    335,
  );
  assert.equal(horizontal.encoding.y.axis.labelAngle, 0);
  const wide = createAlkChartSpec(base, rows, theme, 800);
  assert.equal(wide.encoding.x.axis.labelAngle, 0);
});

async function rendered(config, raw, check) {
  const rows = prepareAlkChartRows(raw, config);
  const spec = createAlkChartSpec(config, rows, theme, 640);
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
    () => prepareAlkChartRows([{ category: 'A', value: 'oops' }], base),
    /finite number/,
  );
  assert.throws(
    () => prepareAlkChartRows([{ category: 'A' }], base),
    /missing.*value/,
  );
  assert.throws(
    () => prepareAlkChartRows([{ category: 'A', value: '' }], base),
    /no numeric values/,
  );
  assert.throws(
    () =>
      prepareAlkChartRows([{ category: 'A', value: '-1' }], {
        ...base,
        type: 'pie',
      }),
    /negative/,
  );
  assert.throws(
    () =>
      prepareAlkChartRows([{ category: 'A', value: '0' }], {
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
  assert.equal(prepareAlkChartRows(raw, config)[0].category, null);
  await rendered(config, raw, (view) => {
    assert.deepEqual(view.scale('x').domain().map(Number), [
      Date.parse(raw[1].category),
      Date.parse(raw[2].category),
    ]);
  });
  assert.throws(
    () => prepareAlkChartRows([{ category: 'not-a-date', value: '1' }], config),
    /valid date/,
  );
  assert.throws(
    () => prepareAlkChartRows([{ category: '  ', value: '1' }], config),
    /no dates/,
  );
});
