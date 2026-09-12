import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertReleasePackages,
  canaryVersion,
  directories,
  readJson,
  root,
} from './release.mjs';

const packageFiles = directories.map((directory) =>
  join('packages', directory, 'package.json'),
);
const templateFile = 'templates/site/package.json';
const changedFiles = [...packageFiles, templateFile];
const packageNames = new Set([
  '@alkemdotdev/alkemist-astro',
  '@alkemdotdev/alkemist-components',
  '@alkemdotdev/alkemist-theme',
  'create-alkemist',
]);
const templatePackageNames = new Set(
  [...packageNames].filter((name) => name !== 'create-alkemist'),
);

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function gitStatus() {
  return execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  }).trimEnd();
}

function readHeadJson(file) {
  return JSON.parse(git(['show', `HEAD:${file}`]));
}

async function writeJson(file, value) {
  await writeFile(join(root, file), JSON.stringify(value, null, 2) + '\n');
}

function updateDependencies(manifest, names, version) {
  for (const name of names)
    if (manifest.dependencies?.[name]) manifest.dependencies[name] = version;
}

export async function prepareCanary() {
  assert.equal(
    gitStatus(),
    '',
    'Canary preparation requires a clean committed checkout',
  );
  const commit = git(['rev-parse', 'HEAD']);
  const packages = await Promise.all(
    packageFiles.map((file) => readJson(join(root, file))),
  );
  assertReleasePackages(packages);
  const version = canaryVersion(packages[0].version, commit);
  for (const [index, manifest] of packages.entries()) {
    manifest.version = version;
    updateDependencies(manifest, packageNames, version);
    await writeJson(packageFiles[index], manifest);
  }
  const template = await readJson(join(root, templateFile));
  updateDependencies(template, templatePackageNames, version);
  await writeJson(templateFile, template);
  console.log(`Prepared coordinated canary ${version} for ${commit}`);
  return { commit, version };
}

export async function assertCanarySource(version, commit) {
  assert.equal(
    git(['rev-parse', 'HEAD']),
    commit,
    'Canary checkout must match packed source revision',
  );
  const changes = gitStatus()
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), file: line.slice(3) }));
  assert.deepEqual(
    changes.map((change) => change.file).sort(),
    [...changedFiles].sort(),
    'Canary checkout contains changes beyond its version edits',
  );
  assert(changes.every((change) => change.status === ' M'));
  const packages = await Promise.all(
    packageFiles.map((file) => readJson(join(root, file))),
  );
  assertReleasePackages(packages);
  assert.equal(packages[0].version, version);
  assert.equal(
    canaryVersion(version.replace(/-canary\.[a-f0-9]{40}$/, ''), commit),
    version,
  );
  for (const [index, manifest] of packages.entries()) {
    const expected = readHeadJson(packageFiles[index]);
    expected.version = version;
    updateDependencies(expected, packageNames, version);
    assert.deepEqual(
      manifest,
      expected,
      `${packageFiles[index]} contains changes beyond the canary version`,
    );
  }
  const template = await readJson(join(root, templateFile));
  const expectedTemplate = readHeadJson(templateFile);
  updateDependencies(expectedTemplate, templatePackageNames, version);
  assert.deepEqual(
    template,
    expectedTemplate,
    'Starter template contains changes beyond the canary dependency versions',
  );
  for (const name of templatePackageNames)
    assert.equal(
      template.dependencies?.[name],
      version,
      `Starter template must use ${name}@${version}`,
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await prepareCanary();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
