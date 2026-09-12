import assert from 'node:assert/strict';
import test from 'node:test';
import { codeToHast, codeToHtml } from 'shiki';
import {
  codeTheme,
  createCodeTransformer,
} from '../packages/components/src/code-theme.ts';

function nodes(root) {
  return [root, ...(root.children ?? []).flatMap(nodes)];
}

function text(node) {
  return node.type === 'text'
    ? node.value
    : (node.children ?? []).map(text).join('');
}

function hasClass(node, name) {
  const classes = node.properties?.className ?? node.properties?.class ?? '';
  return (Array.isArray(classes) ? classes : classes.split(/\s+/)).includes(
    name,
  );
}

function options(meta, props = {}) {
  return {
    lang: 'typescript',
    theme: codeTheme,
    meta: { __raw: meta },
    transformers: [createCodeTransformer(props)],
  };
}

test('quoted titles keep braces and flag words inert', async () => {
  const root = await codeToHast(
    'const x = 1;\nconst y = 2;',
    options('title="State {x} and no-line-numbers here"'),
  );
  const tree = nodes(root);
  assert.equal(
    text(tree.find((node) => hasClass(node, 'alk-code-title'))),
    'State {x} and no-line-numbers here',
  );
  assert.ok(
    tree
      .find((node) => node.tagName === 'pre')
      .properties.class.includes('alk-code-numbered'),
  );
  assert.ok(!tree.some((node) => hasClass(node, 'alk-code-highlight')));

  const flagged = nodes(
    await codeToHast(
      'const x = 1;\nconst y = 2;',
      options('title="State {x} and no-line-numbers here" {2} no-line-numbers'),
    ),
  );
  assert.ok(
    !flagged
      .find((node) => node.tagName === 'pre')
      .properties.class.includes('alk-code-numbered'),
  );
  assert.deepEqual(
    flagged
      .filter((node) => hasClass(node, 'alk-code-highlight'))
      .map((node) => node.properties.dataLine),
    ['2'],
  );
});

test('source and captions stay text through syntax highlighting and HTML serialization', async () => {
  const source =
    'const html = "<script>alert(1)</script>";\nconsole.log("& < > \\"");\n';
  const title = '<script> & " autofocus onfocus="alert(1)';
  const config = options('', { title, highlightLines: [2] });
  const root = await codeToHast(source, config);
  const tree = nodes(root);
  assert.equal(text(tree.find((node) => node.tagName === 'code')), source);
  assert.equal(
    text(tree.find((node) => hasClass(node, 'alk-code-title'))),
    title,
  );
  assert.ok(!tree.some((node) => node.tagName === 'script'));
  assert.ok(
    !tree.some((node) =>
      Object.keys(node.properties ?? {}).some((name) => /^on/i.test(name)),
    ),
  );
  const html = await codeToHtml(source, config);
  assert.match(html, /&#x3C;script>/);
  assert.match(html, /&#x22; autofocus onfocus=&#x22;/);
  assert.equal((html.match(/tabindex=/g) ?? []).length, 1);
});

test('malformed line ranges fail explicitly while component options remain authoritative', async () => {
  await assert.rejects(
    codeToHtml('x', options('{3-1}')),
    /positive, increasing/,
  );
  await assert.rejects(
    codeToHtml('x', options('{two}')),
    /invalid code highlight range/,
  );
  await assert.rejects(
    codeToHtml('x', options('', { highlightLines: [0] })),
    /positive integer/,
  );
  const tree = nodes(
    await codeToHast(
      'x\ny',
      options('{1} no-line-numbers', {
        highlightLines: [2],
        lineNumbers: true,
      }),
    ),
  );
  assert.ok(
    tree
      .find((node) => node.tagName === 'pre')
      .properties.class.includes('alk-code-numbered'),
  );
  assert.deepEqual(
    tree
      .filter((node) => hasClass(node, 'alk-code-highlight'))
      .map((node) => node.properties.dataLine),
    ['2'],
  );
});
