import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertReleasePackages,
  canaryVersion,
  releaseTag,
  waitForRegistry,
} from './release.mjs';
test('registry verification waits for propagation but rejects changed bytes', async () => {
  const manifest = {
    tag: 'canary',
    artifacts: [
      {
        name: 'sample',
        version: '1.0.0-canary.abc',
        integrity: 'sha512-expected',
      },
    ],
  };
  const visible = {
    versions: {
      '1.0.0-canary.abc': { dist: { integrity: 'sha512-expected' } },
    },
    'dist-tags': { canary: '1.0.0-canary.abc' },
  };
  let reads = 0;
  let waits = 0;
  await waitForRegistry(manifest, {
    read: async () => (++reads === 1 ? null : visible),
    sleep: async () => {
      waits++;
    },
    attempts: 2,
  });
  assert.equal(waits, 1);
  await assert.rejects(
    waitForRegistry(manifest, {
      read: async () => null,
      sleep: async () => {},
      attempts: 2,
    }),
    /propagation did not complete/,
  );
  await assert.rejects(
    waitForRegistry(manifest, {
      read: async () => ({
        ...visible,
        versions: {
          '1.0.0-canary.abc': { dist: { integrity: 'sha512-tampered' } },
        },
      }),
      sleep: async () => assert.fail('Must not retry different bytes'),
    }),
    /registry integrity differs/,
  );
});
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
const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

async function writeJson(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}
test('release tags never promote a beta to latest', () => {
  assert.equal(releaseTag('1.0.0-beta.1'), 'beta');
  assert.equal(releaseTag('1.0.0'), 'latest');
  assert.equal(
    releaseTag('1.0.0-beta.1-canary.0123456789abcdef0123456789abcdef01234567'),
    'canary',
  );
  for (const value of ['1.0.0-rc.1', '1.0.0-beta', 'garbage'])
    assert.throws(() => releaseTag(value));
});
test('canary versions are deterministic full-commit versions', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const version = `1.0.0-beta.1-canary.${commit}`;
  assert.equal(canaryVersion('1.0.0-beta.1', commit), version);
  const canaryPackages = packages();
  for (const pkg of canaryPackages) pkg.version = version;
  canaryPackages.find(
    (pkg) => pkg.name === '@alkemdotdev/alkemist-components',
  ).dependencies = { '@alkemdotdev/alkemist-theme': version };
  canaryPackages.find(
    (pkg) => pkg.name === '@alkemdotdev/alkemist-astro',
  ).dependencies = { '@alkemdotdev/alkemist-components': version };
  assertReleasePackages(canaryPackages);
  assert.throws(() => canaryVersion('1.0.0-canary.' + commit, commit));
  assert.throws(() => canaryVersion('1.0.0', 'not-a-commit'));
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
test('canary source provenance permits only derived package edits', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'alkemist-release-canary-'));
  try {
    await mkdir(join(fixture, 'scripts'), { recursive: true });
    await writeFile(join(fixture, '.gitignore'), '.alkemist/\n');
    await Promise.all(
      ['release-contracts.mjs', 'release.mjs', 'release-canary.mjs'].map(
        (file) =>
          cp(join(scriptDirectory, file), join(fixture, 'scripts', file)),
      ),
    );
    for (const directory of ['theme', 'components', 'astro', 'create-alkemist'])
      await mkdir(join(fixture, 'packages', directory), { recursive: true });
    await mkdir(join(fixture, 'templates/site'), { recursive: true });
    const fixturePackages = packages();
    fixturePackages.find(
      (pkg) => pkg.name === '@alkemdotdev/alkemist-components',
    ).dependencies = { '@alkemdotdev/alkemist-theme': '1.0.0-beta.1' };
    fixturePackages.find(
      (pkg) => pkg.name === '@alkemdotdev/alkemist-astro',
    ).dependencies = { '@alkemdotdev/alkemist-components': '1.0.0-beta.1' };
    for (const [directory, manifest] of [
      ['theme', fixturePackages[1]],
      ['components', fixturePackages[0]],
      ['astro', fixturePackages[2]],
      ['create-alkemist', fixturePackages[3]],
    ])
      await writeJson(
        join(fixture, 'packages', directory, 'package.json'),
        manifest,
      );
    await writeJson(join(fixture, 'templates/site/package.json'), {
      dependencies: {
        '@alkemdotdev/alkemist-astro': '1.0.0-beta.1',
        '@alkemdotdev/alkemist-components': '1.0.0-beta.1',
        '@alkemdotdev/alkemist-theme': '1.0.0-beta.1',
      },
    });
    git(fixture, ['init']);
    git(fixture, ['config', 'user.email', 'fixture@example.test']);
    git(fixture, ['config', 'user.name', 'Fixture']);
    git(fixture, ['add', '.']);
    git(fixture, ['commit', '-m', 'fixture']);
    const canary = await import(
      pathToFileURL(join(fixture, 'scripts/release-canary.mjs')).href
    );
    const { commit, version } = await canary.prepareCanary();
    await canary.assertCanarySource(version, commit);
    await writeFile(join(fixture, 'unexpected.txt'), 'unexpected\n');
    await assert.rejects(
      canary.assertCanarySource(version, commit),
      /beyond its version edits/,
    );
    await rm(join(fixture, 'unexpected.txt'));
    const componentsFile = join(fixture, 'packages/components/package.json');
    const components = JSON.parse(await readFile(componentsFile, 'utf8'));
    components.description = 'tampered';
    await writeJson(componentsFile, components);
    await assert.rejects(
      canary.assertCanarySource(version, commit),
      /beyond the canary version/,
    );
    const releaseDirectory = join(fixture, '.alkemist/release');
    await mkdir(releaseDirectory, { recursive: true });
    const artifacts = await Promise.all(
      [
        ['theme', '@alkemdotdev/alkemist-theme'],
        ['components', '@alkemdotdev/alkemist-components'],
        ['astro', '@alkemdotdev/alkemist-astro'],
        ['create-alkemist', 'create-alkemist'],
      ].map(async ([directory, name]) => {
        const filename = `${directory}.tgz`;
        const bytes = Buffer.from(directory);
        await writeFile(join(releaseDirectory, filename), bytes);
        return {
          name,
          version,
          directory,
          filename,
          integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          files: ['LICENSE', 'README.md'],
        };
      }),
    );
    await writeJson(join(releaseDirectory, 'manifest.json'), {
      schemaVersion: 1,
      version,
      tag: 'canary',
      commit,
      dirty: true,
      artifacts,
    });
    assert.throws(
      () =>
        execFileSync(process.execPath, ['scripts/release.mjs', 'publish'], {
          cwd: fixture,
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      (error) =>
        error.status === 1 &&
        /contains changes beyond the canary version/.test(error.stderr) &&
        !/unsettled top-level await/.test(error.stderr),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
