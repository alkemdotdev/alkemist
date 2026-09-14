import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { interferenceFragment } from '../packages/components/src/shader-helpers.ts';
import { preparePostListItems } from '../packages/components/src/post-list-helpers.ts';

test('component package exposes only explicit extensionless entry points', async () => {
  const root = new URL('../packages/components/', import.meta.url);
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.deepEqual(Object.keys(pkg.exports).sort(), [
    './annotations',
    './audio',
    './chart',
    './code',
    './code-copy',
    './code-theme',
    './diagram',
    './diagram-client',
    './layout',
    './math',
    './midi',
    './model',
    './navigation',
    './note',
    './playground',
    './playground/renderers',
    './post-list',
    './search',
    './shader',
    './slides',
    './speaker-notes',
    './step',
    './table-of-contents',
    './video',
  ]);
  await Promise.all(
    Object.values(pkg.exports).map((entry) => access(new URL(entry, root))),
  );
});

test('navigation helpers match pages exactly and reject unsafe hrefs', async () => {
  const { navigationContainsCurrent, navigationHref, pagePath } =
    await import('../packages/components/src/navigation/helpers.ts');
  assert.equal(pagePath('/docs/guide/#intro'), '/docs/guide');
  assert.equal(pagePath('/'), '/');
  assert.equal(navigationHref('javascript:alert(1)'), undefined);
  assert.equal(navigationHref('/docs/guide/#intro'), '/docs/guide/#intro');
  assert.equal(
    navigationContainsCurrent(
      {
        label: 'Docs',
        href: '/docs/',
        children: [{ label: 'Guide', href: '/docs/guide/' }],
      },
      '/docs/guide#setup',
    ),
    true,
  );
});

test('pure post and shader helpers import without browser globals', () => {
  assert.equal(typeof globalThis.HTMLElement, 'undefined');
  assert.equal(typeof interferenceFragment, 'string');
  assert.ok(interferenceFragment.includes('void main'));
  assert.deepEqual(preparePostListItems([]), []);
});

test('navigation reveals one child level and deeper active branches', async () => {
  const { navigationIsExpanded } =
    await import('../packages/components/src/navigation/helpers.ts');
  const branch = {
    label: 'Guides',
    href: '/guides/',
    children: [{ label: 'Leaf', href: '/guides/leaf/' }],
  };
  assert.equal(navigationIsExpanded(branch, '/elsewhere/', 0), true);
  assert.equal(navigationIsExpanded(branch, '/elsewhere/', 1), false);
  assert.equal(navigationIsExpanded(branch, '/guides/leaf/', 2), true);
  assert.equal(navigationIsExpanded(branch, '/elsewhere/', 0, 0), false);
  assert.equal(navigationIsExpanded(branch, '/elsewhere/', 1, 2), true);
});
