import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = join(root, '.alkemist/release');
export const directories = ['theme', 'components', 'astro', 'create-alkemist'];
export const readJson = async (file) =>
  JSON.parse(await readFile(file, 'utf8'));

export function releaseTag(version) {
  assert.match(
    version,
    /^\d+\.\d+\.\d+(?:-beta\.\d+)?(?:-canary\.[a-f0-9]{40})?$/,
    'Only stable, numbered beta, or commit-addressed canary releases are supported',
  );
  if (version.includes('-canary.')) return 'canary';
  return version.includes('-') ? 'beta' : 'latest';
}

export function canaryVersion(version, commit) {
  const tag = releaseTag(version);
  assert.notEqual(
    tag,
    'canary',
    'Canary source must start from a release version',
  );
  assert.match(commit, /^[a-f0-9]{40}$/, 'Canary commits must be full SHA-1s');
  return `${version}-canary.${commit}`;
}

export function assertReleasePackages(packages) {
  assert.equal(
    new Set(packages.map((p) => p.version)).size,
    1,
    'Release versions must match',
  );
  assert.deepEqual(
    packages.map((p) => p.name).sort(),
    [
      '@alkemdotdev/alkemist-astro',
      '@alkemdotdev/alkemist-components',
      '@alkemdotdev/alkemist-theme',
      'create-alkemist',
    ].sort(),
  );
  const version = packages[0].version;
  releaseTag(version);
  for (const pkg of packages) {
    assert(!pkg.private, `${pkg.name} is private`);
    assert.equal(pkg.license, 'Apache-2.0');
    assert.equal(pkg.publishConfig?.access, 'public');
    assert.equal(
      pkg.repository?.url,
      'git+https://github.com/alkemdotdev/alkemist.git',
    );
    for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
      assert(
        !/^(file:|link:|workspace:)/.test(spec),
        `${pkg.name}: non-registry dependency ${name}`,
      );
      if (packages.some((p) => p.name === name))
        assert.equal(
          spec,
          version,
          `${pkg.name}: mismatched internal dependency`,
        );
    }
  }
}
