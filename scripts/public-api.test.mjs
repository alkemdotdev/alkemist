import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { interferenceFragment } from '../packages/components/src/shader-helpers.ts';
import { preparePostListItems } from '../packages/components/src/post-list-helpers.ts';

test('component package exposes only explicit extensionless entry points', async () => {
  const root = new URL('../packages/components/', import.meta.url);
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.deepEqual(Object.keys(pkg.exports).sort(), [
    './chart',
    './code',
    './code-copy',
    './code-theme',
    './layout',
    './math',
    './model',
    './post-list',
    './search',
    './shader',
  ]);
  await Promise.all(
    Object.values(pkg.exports).map((entry) => access(new URL(entry, root))),
  );
});

test('pure post and shader helpers import without browser globals', () => {
  assert.equal(typeof globalThis.HTMLElement, 'undefined');
  assert.equal(typeof interferenceFragment, 'string');
  assert.ok(interferenceFragment.includes('void main'));
  assert.deepEqual(preparePostListItems([]), []);
});
