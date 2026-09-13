import assert from 'node:assert/strict';
import test from 'node:test';
import {
  escapePlaygroundSource,
  playgroundSource,
  presetPlaygroundValues,
  resetPlaygroundValues,
  validatePlaygroundValues,
} from '../packages/components/src/playground/helpers.ts';

const definition = {
  id: 'chart',
  name: 'Chart',
  importPath: '@alkemdotdev/alkemist-components/chart',
  defaults: {
    title: 'Signal',
    bins: 12,
    showGrid: true,
    config: { color: 'blue' },
  },
  controls: [
    { name: 'title', type: 'text' },
    { name: 'bins', type: 'number', min: 1, max: 20 },
    { name: 'showGrid', type: 'boolean' },
    { name: 'config', type: 'json' },
  ],
  presets: [{ label: 'Dense', values: { bins: 20 } }],
};

test('source escapes display content and imports extensionless component paths', () => {
  assert.equal(
    escapePlaygroundSource('<script>"&'),
    '&lt;script&gt;&quot;&amp;',
  );
  const source = playgroundSource(definition, {
    ...definition.defaults,
    title: '<img src=x>',
  });
  assert.match(
    source,
    /import Chart from "@alkemdotdev\/alkemist-components\/chart"/,
  );
  assert.match(source, /title=\{"<img src=x>"\}/);
  assert.ok(!source.includes('<img src=x>\n'));
});

test('a definition without an import has safe generic HTML until its native frame renders source', () => {
  const source = playgroundSource(
    { ...definition, importPath: undefined, name: '<video>' },
    definition.defaults,
  );
  assert.match(source, /^<div data-component="&lt;video&gt;"/);
  assert.ok(!source.includes('<video>'));
});

test('validation rejects malformed controls while reset and presets do not mutate defaults', () => {
  const invalid = validatePlaygroundValues(definition, {
    ...definition.defaults,
    bins: 21,
    config: Symbol('bad'),
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.bins, /no greater/);
  assert.match(invalid.errors.config, /JSON-compatible/);
  const reset = resetPlaygroundValues(definition);
  reset.config.color = 'red';
  assert.equal(definition.defaults.config.color, 'blue');
  assert.deepEqual(presetPlaygroundValues(definition, definition.presets[0]), {
    ...definition.defaults,
    bins: 20,
  });
});

test('optional object fields are accepted and omitted by JSON source generation', () => {
  const value = { label: 'Leaf', children: undefined };
  const optionalDefinition = {
    ...definition,
    defaults: { config: value },
    controls: [{ name: 'config', type: 'json' }],
  };
  const result = validatePlaygroundValues(optionalDefinition, {
    config: value,
  });
  assert.equal(result.valid, true);
  const source = playgroundSource(optionalDefinition, result.values);
  assert.match(source, /"label":"Leaf"/);
  assert.doesNotMatch(source, /children/);
});

test('component slot source remains copyable markup, rendered as text by the shell', () => {
  const definition = {
    id: 'layout',
    name: 'Layout',
    importPath: 'example/layout',
    defaults: { title: 'Notes' },
    controls: [],
    slot: '<h1>Notes</h1>\n<p>Content</p>',
  };
  const source = playgroundSource(definition, definition.defaults);
  assert.ok(source.includes('<h1>Notes</h1>'));
  assert.ok(!source.includes('&lt;h1&gt;'));
});

test('text-slot examples escape template syntax and preserve whitespace-sensitive source props', async () => {
  const { runInNewContext } = await import('node:vm');
  const { resolveCodeSource } =
    await import('../packages/components/src/code-source.ts');
  const example = {
    id: 'code',
    name: 'Code',
    importPath: 'example/code',
    defaults: {},
    controls: [],
    textSlotProp: 'code',
  };
  const source =
    'const value = `<tag>${unknown}</tag>`;\nconst pattern = /\\d+/;';
  const generated = playgroundSource(example, {
    code: source,
    lang: 'typescript',
  });
  assert.doesNotMatch(generated, /  code=/);
  assert.match(generated, /<\/Code>$/);
  const expression = generated.slice(
    generated.indexOf('>{') + 2,
    generated.lastIndexOf('}</Code>'),
  );
  const renderedText = runInNewContext(expression);
  assert.equal(
    resolveCodeSource({ slotHtml: escapePlaygroundSource(renderedText) }),
    source,
  );
  for (const exact of [
    '',
    '\n  keep indentation\n',
    '  leading',
    'trailing ',
  ]) {
    const output = playgroundSource(example, { code: exact });
    assert(output.includes(`code={${JSON.stringify(exact)}}`));
    assert(output.endsWith('/>'));
  }
  assert.throws(
    () => playgroundSource({ ...example, slot: '<p>other</p>' }, { code: 'x' }),
    /choose markup slot or textSlotProp/,
  );
});
