import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { posix, win32 } from 'node:path';
import {
  isOutsideSource,
  npmInvocation,
  parseArguments,
} from './create-site.mjs';
import { resolveDeployment } from '../templates/site/scripts/deployment.mjs';
import {
  packages as publishedPackages,
  parseArguments as parseCreateArguments,
} from '../packages/create-alkemist/lib/create-alkemist.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('source boundary distinguishes POSIX siblings, descendants, and dot-prefixed names', () => {
  assert.equal(isOutsideSource('/work/alkemist', '/work/my-lab', posix), true);
  assert.equal(isOutsideSource('/work/alkemist', '/work', posix), true);
  assert.equal(
    isOutsideSource('/work/alkemist', '/work/alkemist', posix),
    false,
  );
  assert.equal(
    isOutsideSource('/work/alkemist', '/work/alkemist/my-lab', posix),
    false,
  );
  assert.equal(
    isOutsideSource('/work/alkemist', '/work/alkemist/..my-lab', posix),
    false,
  );
});

test('source boundary supports Windows siblings, drive changes, and case-insensitive roots', () => {
  assert.equal(
    isOutsideSource('C:\\work\\alkemist', 'C:\\work\\my-lab', win32),
    true,
  );
  assert.equal(
    isOutsideSource('C:\\work\\alkemist', 'D:\\my-lab', win32),
    true,
  );
  assert.equal(isOutsideSource('C:\\work\\alkemist', 'C:\\work', win32), true);
  assert.equal(
    isOutsideSource('C:\\work\\alkemist', 'c:\\WORK\\ALKEMIST', win32),
    false,
  );
  assert.equal(
    isOutsideSource('C:\\work\\alkemist', 'C:\\work\\alkemist\\my-lab', win32),
    false,
  );
  assert.equal(
    isOutsideSource(
      'C:\\work\\alkemist',
      'C:\\work\\alkemist\\..my-lab',
      win32,
    ),
    false,
  );
});

test('npm invocation preserves paths as argument values and never invokes Windows command shims', () => {
  const cli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
  const executable = 'C:\\Program Files\\nodejs\\node.exe';
  const args = ['pack', '--pack-destination', 'C:\\work\\a & b'];
  assert.deepEqual(
    npmInvocation(args, {
      env: { npm_execpath: cli },
      platform: 'win32',
      execPath: executable,
    }),
    {
      file: executable,
      args: [cli, ...args],
    },
  );
  assert.deepEqual(npmInvocation(args, { env: {}, platform: 'linux' }), {
    file: 'npm',
    args,
  });
  assert.throws(
    () => npmInvocation(args, { env: {}, platform: 'win32' }),
    /through npm run/,
  );
  assert.throws(
    () =>
      npmInvocation(args, {
        env: { npm_execpath: 'C:\\nodejs\\npm.cmd' },
        platform: 'win32',
      }),
    /through npm run/,
  );
});

test('starter accepts only explicit providers and a single destination', () => {
  assert.deepEqual(parseArguments(['../my-lab', '--provider', 'gitlab']), {
    destination: '../my-lab',
    provider: 'gitlab',
    update: false,
  });
  assert.throws(() => parseArguments(['../my-lab', '--provider']), /requires/);
  assert.throws(
    () => parseArguments(['../my-lab', '--provider', 'unknown']),
    /requires/,
  );
  assert.throws(() => parseArguments(['../my-lab', 'another']), /Unexpected/);
});

test('packed create-alkemist uses its own bumped version outside this source checkout', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'alkemist-create-packed-'));
  const packageDir = join(root, 'packages', 'create-alkemist');
  const stagedPackage = join(temporary, 'bumped-create-alkemist');
  const site = join(temporary, 'my-lab');
  const bumpedVersion = '9.8.7-test.0';
  try {
    execFileSync('npm', ['run', 'build'], {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await cp(packageDir, stagedPackage, { recursive: true });
    const stagedManifest = JSON.parse(
      await readFile(join(stagedPackage, 'package.json'), 'utf8'),
    );
    stagedManifest.version = bumpedVersion;
    await writeFile(
      join(stagedPackage, 'package.json'),
      `${JSON.stringify(stagedManifest, null, 2)}\n`,
    );
    const output = execFileSync(
      'npm',
      ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary],
      {
        cwd: stagedPackage,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const report = JSON.parse(output);
    const packed = Array.isArray(report)
      ? report[0]
      : report['create-alkemist'];
    assert.ok(packed?.filename, 'npm pack did not report create-alkemist');
    assert(
      packed.files.some((file) => file.path === 'template/package.json'),
      'packed create-alkemist is missing its template bundle',
    );
    execFileSync(
      'npm',
      [
        'exec',
        '--yes',
        '--package',
        join(temporary, packed.filename),
        'create-alkemist',
        '--',
        site,
        '--provider',
        'custom',
      ],
      { cwd: temporary, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const generated = JSON.parse(
      await readFile(join(site, 'package.json'), 'utf8'),
    );
    for (const name of publishedPackages)
      assert.equal(generated.dependencies[name], bumpedVersion);
    const starterManifest = JSON.parse(
      await readFile(join(site, 'alkemist.starter.json'), 'utf8'),
    );
    assert.equal(starterManifest.generatorVersion, bumpedVersion);
    await assert.rejects(readFile(join(site, 'package-lock.json')));
    await assert.rejects(readFile(join(site, 'vendor')));
    await assert.rejects(readFile(join(site, '.git')));
    assert.match(
      await readFile(join(site, '.gitignore'), 'utf8'),
      /node_modules/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('create-alkemist accepts an explicit provider and one destination', () => {
  assert.deepEqual(parseCreateArguments(['my-lab', '--provider', 'gitlab']), {
    destination: 'my-lab',
    provider: 'gitlab',
  });
  assert.throws(
    () => parseCreateArguments(['my-lab', '--update']),
    /Unexpected/,
  );
  assert.throws(
    () => parseCreateArguments(['my-lab', '--provider', 'unknown']),
    /requires/,
  );
});

test('GitLab preview uses the complete provider URL, not production overrides', () => {
  const result = resolveDeployment({
    CI_PAGES_URL: 'https://team.gitlab.io/project/mr-12/',
    CI_COMMIT_REF_NAME: 'feature',
    SITE_URL: 'https://lab.example.org',
    BASE_PATH: '/',
  });
  assert.equal(result.origin, 'https://team.gitlab.io');
  assert.equal(result.base, '/project/mr-12/');
  assert.equal(result.preview, true);
});

test('production supports unique-domain, project-path, and custom-domain Pages', () => {
  assert.equal(
    resolveDeployment({
      CI_PAGES_URL: 'https://project-123.gitlab.io/',
      CI_COMMIT_REF_NAME: 'main',
    }).base,
    '/',
  );
  assert.equal(
    resolveDeployment({
      CI_PAGES_URL: 'https://team.gitlab.io/project/',
      CI_COMMIT_REF_NAME: 'main',
    }).base,
    '/project/',
  );
  assert.equal(
    resolveDeployment({
      CI_PAGES_URL: 'https://team.gitlab.io/project/',
      CI_COMMIT_REF_NAME: 'main',
      SITE_URL: 'https://lab.example.org',
      BASE_PATH: '/',
    }).origin,
    'https://lab.example.org',
  );
});

test('custom deploy rejects malformed site/base and detects explicit previews', () => {
  assert.throws(
    () => resolveDeployment({ SITE_URL: 'https://example.org/project/' }),
    /origin/,
  );
  assert.throws(() => resolveDeployment({ BASE_PATH: 'relative' }), /absolute/);
  assert.throws(
    () => resolveDeployment({ ALK_PREVIEW: 'maybe' }),
    /true or false/,
  );
  assert.equal(
    resolveDeployment({ ALK_PREVIEW: 'true', BASE_PATH: '/my-lab' }).base,
    '/my-lab/',
  );
  assert.equal(
    resolveDeployment({ CF_PAGES_BRANCH: 'feature' }).environment,
    'preview',
  );
});
