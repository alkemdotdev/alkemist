import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReleasePackages, releaseTag } from './release.mjs';
const packages = () =>
  [
    '@alkemdotdev/alkemist-components',
    '@alkemdotdev/alkemist-theme',
    '@alkemdotdev/alkemist-astro',
    'create-alkemist',
  ].map((name) => ({
    name,
    version: '1.0.0-beta.1',
    license: 'Apache-2.0',
    publishConfig: { access: 'public' },
    repository: { url: 'git+https://github.com/alkemdotdev/alkemist.git' },
  }));
test('release tags never promote a beta to latest', () => {
  assert.equal(releaseTag('1.0.0-beta.1'), 'beta');
  assert.equal(releaseTag('1.0.0'), 'latest');
  for (const value of ['1.0.0-rc.1', '1.0.0-beta', 'garbage'])
    assert.throws(() => releaseTag(value));
});
test('reject private, mismatched and workspace-only release dependencies', () => {
  assertReleasePackages(packages());
  for (const mutate of [
    (p) => (p[0].private = true),
    (p) => (p[0].version = '1.0.1'),
    (p) => (p[0].dependencies = { astro: 'workspace:*' }),
    (p) => (p[0].dependencies = { '@alkemdotdev/alkemist-theme': '0.1.0' }),
  ]) {
    const p = packages();
    mutate(p);
    assert.throws(() => assertReleasePackages(p));
  }
});
