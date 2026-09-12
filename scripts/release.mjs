import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = join(root, '.alkemist/release');
export const directories = ['theme', 'components', 'astro', 'create-alkemist'];
const registry = 'https://registry.npmjs.org';
export const readJson = async (file) =>
  JSON.parse(await readFile(file, 'utf8'));
export function runNpm(args, cwd = root, inherit = false) {
  const cli = process.env.npm_execpath;
  return execFileSync(
    cli ? process.execPath : 'npm',
    cli ? [cli, ...args] : args,
    {
      cwd,
      encoding: 'utf8',
      maxBuffer: 24 * 1024 * 1024,
      stdio: inherit ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    },
  );
}
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
export async function pack() {
  await mkdir(output, { recursive: true });
  const packages = await Promise.all(
    directories.map((d) => readJson(join(root, 'packages', d, 'package.json'))),
  );
  assertReleasePackages(packages);
  runNpm(['run', 'build', '--workspace', 'create-alkemist']);
  const artifacts = [];
  for (const [i, directory] of directories.entries()) {
    const report = JSON.parse(
      runNpm(
        ['pack', '--json', '--ignore-scripts', '--pack-destination', output],
        join(root, 'packages', directory),
      ),
    );
    const packed = Array.isArray(report) ? report[0] : report[packages[i].name];
    assert(packed?.filename && basename(packed.filename) === packed.filename);
    const files = packed.files.map((f) => f.path);
    assert(files.includes('LICENSE'), `${directory}: missing LICENSE`);
    assert(files.includes('README.md'), `${directory}: missing README`);
    assert(
      !files.some((f) =>
        /(^|\/)(node_modules|\.env|\.npmrc|\.git)(\/|$)/.test(f),
      ),
      'Unexpected private/generated files',
    );
    const bytes = await readFile(join(output, packed.filename));
    artifacts.push({
      name: packages[i].name,
      version: packages[i].version,
      directory,
      filename: packed.filename,
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      files,
    });
  }
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const dirty = Boolean(
    execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
  );
  const manifest = {
    schemaVersion: 1,
    version: packages[0].version,
    tag: releaseTag(packages[0].version),
    commit,
    dirty,
    artifacts,
  };
  await writeFile(
    join(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(
    `Packed ${artifacts.length} packages at ${manifest.version} (${manifest.tag}) in ${output}`,
  );
  return manifest;
}
export async function readManifest() {
  const manifest = await readJson(join(output, 'manifest.json'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.tag, releaseTag(manifest.version));
  assert.deepEqual(
    manifest.artifacts.map((a) => a.name).sort(),
    [
      '@alkemdotdev/alkemist-astro',
      '@alkemdotdev/alkemist-components',
      '@alkemdotdev/alkemist-theme',
      'create-alkemist',
    ].sort(),
  );
  assert.deepEqual(
    manifest.artifacts.map((a) => a.directory).sort(),
    [...directories].sort(),
  );
  for (const artifact of manifest.artifacts) {
    const expectedName =
      artifact.directory === 'create-alkemist'
        ? 'create-alkemist'
        : '@alkemdotdev/alkemist-' + artifact.directory;
    assert.equal(
      artifact.name,
      expectedName,
      'Artifact name and directory disagree',
    );
  }
  for (const artifact of manifest.artifacts) {
    assert.equal(basename(artifact.filename), artifact.filename);
    const bytes = await readFile(join(output, artifact.filename));
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      artifact.sha256,
      'Packed artifact changed',
    );
    assert.equal(
      `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      artifact.integrity,
    );
    assert.equal(artifact.version, manifest.version);
  }
  return manifest;
}
async function registryPackage(name) {
  const response = await fetch(`${registry}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(20000),
    headers: { accept: 'application/json' },
  });
  if (response.status === 404) return null;
  assert(response.ok, `Registry query failed for ${name}: ${response.status}`);
  return response.json();
}
export async function publish() {
  const manifest = await readManifest();
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  assert.equal(
    sha,
    manifest.commit,
    'Checkout must match packed release revision',
  );
  assert(
    !manifest.dirty || manifest.tag === 'canary',
    'Publish only artifacts packed from a clean committed revision',
  );
  const worktree = execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  if (manifest.tag === 'canary')
    assert(
      worktree,
      'Canary publication requires its constrained version edits',
    );
  else assert.equal(worktree, '', 'Publish requires a clean worktree');
  if (manifest.tag === 'canary') {
    const { assertCanarySource } = await import('./release-canary.mjs');
    await assertCanarySource(manifest.version, manifest.commit);
  }
  const pending = (await readdir(join(root, '.changeset'))).filter(
    (f) => f.endsWith('.md') && f !== 'README.md',
  );
  if (manifest.tag !== 'canary')
    assert.equal(
      pending.length,
      0,
      'Version pending changesets before publishing',
    );
  const sourcePackages = await Promise.all(
    directories.map((d) => readJson(join(root, 'packages', d, 'package.json'))),
  );
  assertReleasePackages(sourcePackages);
  assert.equal(sourcePackages[0].version, manifest.version);
  const result = [];
  for (const artifact of manifest.artifacts) {
    const metadata = await registryPackage(artifact.name);
    const existing = metadata?.versions?.[artifact.version];
    if (existing) {
      assert.equal(
        existing.dist.integrity,
        artifact.integrity,
        `${artifact.name}: published version contains different bytes; create a new version`,
      );
      console.log(`Already published: ${artifact.name}@${artifact.version}`);
    } else {
      console.log(
        `Publishing ${artifact.name}@${artifact.version} to ${manifest.tag}`,
      );
      runNpm(
        [
          'publish',
          join(output, artifact.filename),
          '--access',
          'public',
          '--tag',
          manifest.tag,
          '--registry',
          registry,
          '--ignore-scripts',
        ],
        root,
        true,
      );
    }
    result.push({ name: artifact.name, version: artifact.version });
  }
  await verify();
  if (process.env.GITHUB_OUTPUT) {
    await import('node:fs/promises').then((fs) =>
      fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `version=${manifest.version}\ntag=${manifest.tag}\n`,
      ),
    );
  }
  console.log(JSON.stringify(result));
}
export async function verify() {
  const manifest = await readManifest();
  for (const artifact of manifest.artifacts) {
    const metadata = await registryPackage(artifact.name);
    assert.equal(
      metadata?.versions?.[artifact.version]?.dist?.integrity,
      artifact.integrity,
      `${artifact.name}: registry integrity differs or missing`,
    );
    assert.equal(
      metadata?.['dist-tags']?.[manifest.tag],
      artifact.version,
      `${artifact.name}: wrong release tag`,
    );
    if (manifest.tag === 'beta')
      assert(
        !metadata?.['dist-tags']?.latest?.includes('-'),
        `${artifact.name}: prerelease accidentally tagged latest`,
      );
    console.log(
      `Verified ${artifact.name}@${artifact.version}: registry integrity and ${manifest.tag}`,
    );
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const command = process.argv[2];
    if (command === 'pack') await pack();
    else if (command === 'publish') await publish();
    else if (command === 'verify') await verify();
    else throw new Error('Usage: node scripts/release.mjs pack|publish|verify');
  } catch (error) {
    // npm may include authentication URLs, but never print environment/config values.
    if (error.stderr) process.stderr.write(error.stderr);
    console.error(error.message);
    process.exitCode = 1;
  }
}
