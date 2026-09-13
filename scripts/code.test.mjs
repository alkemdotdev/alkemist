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

test('rich code features preserve source while rendering semantic folds and safe annotations', async () => {
  const source =
    'const alphabet = 1;\nconst beta = alphabet + 1;\nreturn beta;\n';
  const html = await codeToHtml(
    source,
    options('title="proof.ts" focus={2} ins={2} del={3} collapse={2-3}', {
      annotations: [{ line: 1, text: '<note>' }],
      highlightText: ['const alphabet'],
      wrap: true,
    }),
  );
  assert.match(html, /data-alk-source="const%20alphabet%20%3D%201%3B%0A/);
  assert.equal(
    decodeURIComponent(html.match(/data-alk-source="([^"]+)"/)?.[1] ?? ''),
    source,
  );
  assert.match(html, /<details class="alk-code-fold">/);
  assert.match(html, /<summary>2 lines collapsed<\/summary>/);
  assert.match(html, /alk-code-added/);
  assert.match(html, /alk-code-removed/);
  assert.match(html, /alk-code-dim/);
  assert.match(html, /alk-code-text-highlight/);
  assert.match(
    html,
    /class="alk-code-annotation-marker" aria-label="Note: <note>"/,
  );
  assert.match(html, /role="tooltip">&#x3C;note>/);
  assert.match(html, /data-diff="\+"/);
  assert.match(html, /data-diff="−"/);
  assert.doesNotMatch(html, /alk-code-language/);
  assert.match(html, /alk-code-wrap/);
});

test('overlapping and out-of-bounds folds fail explicitly', async () => {
  await assert.rejects(
    codeToHtml(
      'a\nb\nc',
      options('', {
        collapsedRanges: [
          { start: 1, end: 2 },
          { start: 2, end: 3 },
        ],
      }),
    ),
    /collapse ranges cannot overlap/,
  );
  await assert.rejects(
    codeToHtml('a\nb', options('collapse={2-3}')),
    /exceeds the 2-line source/,
  );
});

test('fence wrap and malformed array options have explicit configuration errors', async () => {
  const wrapped = await codeToHtml('a', options('wrap'));
  assert.match(wrapped, /alk-code-wrap/);
  await assert.rejects(
    codeToHtml('a', options('', { collapsedRanges: null })),
    /collapsedRanges must be an array/,
  );
  await assert.rejects(
    codeToHtml('a', options('', { focusLines: '1' })),
    /focusLines must be an array/,
  );
});
