import {
  appendFile,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createSite, npmInvocation } from './create-site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'alkemist-consumer-'));
const site = join(temporary, 'my-lab');
const keep = process.argv.includes('--keep');
const baseEnv = {
  ...process.env,
  SITE_URL: 'https://example.org',
  BASE_PATH: '/',
  ALK_PREVIEW: 'false',
};
for (const name of [
  'CI_PAGES_URL',
  'CF_PAGES_BRANCH',
  'CI_COMMIT_REF_NAME',
  'CI_MERGE_REQUEST_IID',
  'CF_PAGES_COMMIT_SHA',
  'CI_COMMIT_SHA',
])
  delete baseEnv[name];
function run(args, env = baseEnv) {
  try {
    const invocation = npmInvocation(args, { env });
    return execFileSync(invocation.file, invocation.args, {
      cwd: site,
      env,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    console.error(error.stdout, error.stderr);
    throw error;
  }
}
async function snapshot(directory) {
  const result = {};
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) await walk(file);
      else
        result[relative(directory, file)] = createHash('sha256')
          .update(await readFile(file))
          .digest('hex');
    }
  }
  await walk(directory);
  return result;
}
try {
  const initial = await createSite({ destination: site, provider: 'custom' });
  await assert.rejects(createSite({ destination: site }), /not empty/);
  assert(
    !Object.keys(await snapshot(site)).some(
      (file) => file.startsWith(`.git${sep}`) || file.startsWith(`infra${sep}`),
    ),
  );
  console.log('Installing actual npm pack tarballs outside the workspace…');
  run(['install', '--no-audit', '--no-fund']);
  run(['run', 'verify']);
  for (const name of ['astro', 'ui']) {
    assert(
      !(
        await readFile(
          join(site, `node_modules/@alkemist/${name}/package.json`),
          'utf8',
        )
      ).includes('workspace:'),
    );
  }
  await appendFile(
    join(site, 'src/content/blog/first-experiment.mdx'),
    '\nA user-owned observation that must survive package updates.\n',
  );
  await appendFile(
    join(site, 'src/styles/site.css'),
    '\n:root { --user-owned-accent: #1982f2; }\n',
  );
  const contentBefore = await snapshot(join(site, 'src'));
  const publicBefore = await snapshot(join(site, 'public'));
  const configBefore = await readFile(join(site, 'astro.config.ts'), 'utf8');
  // Change a package's bytes in an isolated source fixture. This verifies a real
  // snapshot replacement, not the stronger claim of arbitrary release compatibility.
  const fixture = join(temporary, 'updated-source');
  await cp(join(root, 'packages'), join(fixture, 'packages'), {
    recursive: true,
    filter: (source) => !source.split(sep).includes('node_modules'),
  });
  await appendFile(
    join(fixture, 'packages/ui/src/theme.css'),
    '\n/* Consumer upgrade fixture: changed package bytes. */\n',
  );
  const updated = await createSite({
    destination: site,
    update: true,
    sourceRoot: fixture,
  });
  assert.notEqual(
    initial.packages.find((pkg) => pkg.name === '@alkemist/ui').sha256,
    updated.packages.find((pkg) => pkg.name === '@alkemist/ui').sha256,
  );
  run(['install', '--no-audit', '--no-fund']);
  assert(
    (
      await readFile(
        join(site, 'node_modules/@alkemist/ui/src/theme.css'),
        'utf8',
      )
    ).includes('Consumer upgrade fixture'),
  );
  assert.deepEqual(await snapshot(join(site, 'src')), contentBefore);
  assert.deepEqual(await snapshot(join(site, 'public')), publicBefore);
  assert.equal(
    await readFile(join(site, 'astro.config.ts'), 'utf8'),
    configBefore,
  );
  console.log(
    'Replacement package installed; user content, assets, and config are byte-for-byte preserved.',
  );
  const previewEnv = {
    ...baseEnv,
    SITE_URL: 'https://production.example.org',
    BASE_PATH: '/wrong-production-base/',
    ALK_PREVIEW: 'true',
    CI_PAGES_URL: 'https://example.gitlab.io/my-lab/mr-7/',
    CI_COMMIT_REF_NAME: 'feature',
    CI_COMMIT_SHA: 'consumer-fixture-commit',
  };
  run(['run', 'verify'], previewEnv);
  const metadata = JSON.parse(
    await readFile(join(site, 'dist/build.json'), 'utf8'),
  );
  assert.equal(metadata.base, '/my-lab/mr-7/');
  assert.equal(metadata.environment, 'preview');
  assert.equal(metadata.commit, 'consumer-fixture-commit');
  assert(
    (await readFile(join(site, 'dist/robots.txt'), 'utf8')).includes(
      'Disallow: /',
    ),
  );
  // Reinstall from the lockfile just as provider CI will, then build a root site
  // for optional browser inspection at the printed --keep location.
  run(['ci', '--no-audit', '--no-fund']);
  run(['run', 'verify']);
  for (const provider of ['gitlab', 'cloudflare']) {
    const destination = join(temporary, provider);
    await createSite({ destination, provider });
    const entries = await readdir(destination);
    assert.equal(entries.includes('.gitlab-ci.yml'), provider === 'gitlab');
    assert(
      (await readFile(join(destination, 'HOSTING.md'), 'utf8')).includes(
        provider === 'gitlab' ? 'GitLab Pages' : 'Cloudflare Pages',
      ),
    );
  }
  console.log(
    'Starter passed: packed install, changed-snapshot upgrade, production and GitLab preview subpaths, lockfile reinstall, and provider scaffolds.',
  );
  if (keep) console.log(`Browser-review site retained at ${site}`);
} finally {
  if (!keep) await rm(temporary, { recursive: true, force: true });
}
