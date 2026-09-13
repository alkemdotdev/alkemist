import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import {
  definitions,
  groups,
  nativeContent,
} from '../apps/site/src/lib/playground/definitions.ts';
const contracts = {
  midi: ['midi.ts', 'MidiProps'],
  audio: ['media.ts', 'AudioProps'],
  video: ['media.ts', 'VideoProps'],
  chart: ['charts.ts', 'ChartProps'],
  model: ['model.astro', 'ModelProps'],
  shader: ['shader.astro', 'ShaderProps'],
  math: ['math.astro', 'MathProps'],
  code: ['code.astro', 'CodeProps'],
  navigation: ['navigation.astro', 'NavigationProps'],
  'table-of-contents': ['table-of-contents.astro', 'TableOfContentsProps'],
  'post-list': ['post-list-helpers.ts', 'PostListProps'],
  search: ['search.astro', 'SearchProps'],
  layout: ['layout.astro', 'LayoutProps'],
};
test('every published content component prop has a playground control and default', async () => {
  for (const [id, [file, name]] of Object.entries(contracts)) {
    let source = await readFile(
      new URL(`../packages/components/src/${file}`, import.meta.url),
      'utf8',
    );
    if (file.endsWith('.astro')) source = source.split('---')[1];
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const declaration = tree.statements.find(
      (s) => ts.isInterfaceDeclaration(s) && s.name.text === name,
    );
    assert.ok(declaration, `Missing interface ${name}`);
    function members(node) {
      const own = node.members.map((m) => m.name.getText(tree));
      const inherited = (node.heritageClauses ?? []).flatMap((clause) =>
        clause.types.flatMap((base) => {
          const name = base.expression.getText(tree);
          const parent = tree.statements.find(
            (s) => ts.isInterfaceDeclaration(s) && s.name.text === name,
          );
          assert.ok(parent, `Missing inherited interface ${name}`);
          return members(parent);
        }),
      );
      return [...inherited, ...own];
    }
    const expected = members(declaration).sort();
    assert.deepEqual(
      definitions[id].controls.map((c) => c.name).sort(),
      expected,
      `${id} controls drifted from public props`,
    );
    assert.deepEqual(
      Object.keys(definitions[id].defaults).sort(),
      expected,
      `${id} defaults drifted`,
    );
  }
});
test('four component categories and the native reference cover every specimen once', () => {
  assert.deepEqual(
    groups.map((g) => g.title),
    ['Content', 'Visualization', 'Graphics', 'Website'],
  );
  const ids = [...groups, nativeContent].flatMap((g) => g.examples);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.keys(definitions).sort());
});
