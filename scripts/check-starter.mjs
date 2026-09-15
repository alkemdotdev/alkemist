import {
  appendFile,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
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
function installedPackageFile(packageName, ...segments) {
  return join(site, 'node_modules', ...packageName.split('/'), ...segments);
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
async function configureSections(configuration) {
  const source = await readFile(join(site, 'src/lib/site.ts'), 'utf8');
  const replacement = `export const sections = ${JSON.stringify(configuration, null, 2)} as const;`;
  const configured = source.replace(
    /export const sections = \{[\s\S]*?\} as const;/,
    replacement,
  );
  assert.notEqual(
    configured,
    source,
    'Starter section configuration was not found.',
  );
  await writeFile(join(site, 'src/lib/site.ts'), configured);
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
  await writeFile(
    join(site, 'src/content/logs/draft.md'),
    `---
title: Unpublished log
description: This note must not become a public feed entry.
published: '2026-09-12'
draft: true
---

This draft stays out of the feed and its detail route.\n`,
  );
  await writeFile(
    join(site, 'src/content/book/draft.md'),
    `---
title: Unpublished chapter
description: This chapter must not become a public guide entry.
order: 99
draft: true
---

This draft stays out of the guide and its detail route.\n`,
  );
  await writeFile(
    join(site, 'src/content/slides/draft.md'),
    `---
title: Unpublished deck
description: This deck must not become a public route.
format: slides
draft: true
---

# Unpublished slide
`,
  );
  await writeFile(
    join(site, 'src/content/slides/interactive.mdx'),
    `---
title: Interactive fixture
description: An auto-imported widget and note in a generated site.
format: slides
---

# Synthetic signal

<Chart id="starter-chart" src={import.meta.env.BASE_URL + 'data/oscillation.csv'} type="line" x="time" y="position" title="Starter oscillator" description="Synthetic teaching data." sample />

<Note for="starter-chart">The source fixture is synthetic.</Note>
`,
  );
  await writeFile(
    join(site, 'src/content/logs/later-reading.md'),
    `---
title: Later reading
description: A newer note proves the feed order.
published: '2026-09-13'
---

This entry appears before the first reading.\n`,
  );
  await writeFile(
    join(site, 'src/content/blog/thumbnail-only.md'),
    `---
title: A thumbnail without an article cover
description: The listing and article can make different presentation choices.
published: '2026-09-12'
cover:
  src: ./assets/first-experiment-cover.svg
  alt: A blue oscillation on an orange measurement grid.
  fit: contain
  focalX: 25
  showInPost: false
---

The thumbnail remains in the listing.\n`,
  );
  await writeFile(
    join(site, 'src/content/blog/text-only.md'),
    `---
title: A post without an image
description: A cover is optional.
published: '2026-09-12'
---

This entry uses a text-only listing.\n`,
  );
  run(['run', 'verify']);
  const imageListing = await readFile(
    join(site, 'dist/blog/index.html'),
    'utf8',
  );
  const withCover = await readFile(
    join(site, 'dist/blog/first-experiment/index.html'),
    'utf8',
  );
  const thumbnailOnly = await readFile(
    join(site, 'dist/blog/thumbnail-only/index.html'),
    'utf8',
  );
  const textOnly = await readFile(
    join(site, 'dist/blog/text-only/index.html'),
    'utf8',
  );
  assert(imageListing.includes('alk-post-thumbnail'));
  assert(imageListing.includes('data-fit="contain"'));
  assert(imageListing.includes('A post without an image'));
  assert(withCover.includes('lab-cover--article'));
  assert.match(withCover, /data-layout-kind="article"/);
  assert(!thumbnailOnly.includes('lab-cover--article'));
  assert(!textOnly.includes('lab-cover--article'));
  const defaultLogs = await readFile(
    join(site, 'dist/logs/index.html'),
    'utf8',
  );
  const defaultBook = await readFile(
    join(site, 'dist/book/index.html'),
    'utf8',
  );
  const defaultSlides = await readFile(
    join(site, 'dist/slides/index.html'),
    'utf8',
  );
  const firstTalk = await readFile(
    join(site, 'dist/slides/first-talk/index.html'),
    'utf8',
  );
  const interactiveTalk = await readFile(
    join(site, 'dist/slides/interactive/index.html'),
    'utf8',
  );
  assert(!defaultLogs.includes('Unpublished log'));
  assert(!defaultBook.includes('Unpublished chapter'));
  assert(defaultSlides.includes('First talk'));
  assert(defaultSlides.includes('Interactive fixture'));
  assert(!defaultSlides.includes('Unpublished deck'));
  assert.match(firstTalk, /<alk-slides/);
  assert.match(firstTalk, /data-layout-kind="deck"/);
  assert.match(interactiveTalk, /<alk-chart id="starter-chart"/);
  assert.match(interactiveTalk, /data-note-target="starter-chart"/);
  assert(defaultLogs.includes('Later reading'));
  assert(defaultLogs.includes('First reading'));
  assert(
    defaultLogs.indexOf('Later reading') < defaultLogs.indexOf('First reading'),
  );
  await assert.rejects(readFile(join(site, 'dist/logs/draft/index.html')));
  await assert.rejects(readFile(join(site, 'dist/book/draft/index.html')));
  await assert.rejects(readFile(join(site, 'dist/slides/draft/index.html')));
  for (const snapshot of initial.packages) {
    assert(
      !(
        await readFile(
          installedPackageFile(snapshot.name, 'package.json'),
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
    join(fixture, 'packages/theme/src/theme.css'),
    '\n/* Consumer upgrade fixture: changed package bytes. */\n',
  );
  const updated = await createSite({
    destination: site,
    update: true,
    sourceRoot: fixture,
  });
  const themePackage = initial.packages.find((pkg) =>
    pkg.name.endsWith('alkemist-theme'),
  );
  assert(themePackage, 'Starter did not include an Alkemist theme package.');
  const updatedThemePackage = updated.packages.find(
    (pkg) => pkg.name === themePackage.name,
  );
  assert(
    updatedThemePackage,
    'Updated starter did not include the original theme package.',
  );
  assert.notEqual(themePackage.sha256, updatedThemePackage.sha256);
  run(['install', '--no-audit', '--no-fund']);
  assert(
    (
      await readFile(
        installedPackageFile(themePackage.name, 'src', 'theme.css'),
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
  const sectionEnv = { ...baseEnv, BASE_PATH: '/sections/' };
  await configureSections({
    blog: { enabled: false, label: 'Blog' },
    logs: { enabled: false, label: 'Logs' },
    labs: { enabled: false, label: 'Labs' },
    docs: { enabled: false, label: 'Docs' },
    book: { enabled: false, label: 'Book' },
    slides: { enabled: false, label: 'Slides' },
    info: { enabled: false, label: 'Info' },
  });
  run(['run', 'verify'], sectionEnv);
  for (const section of [
    'blog',
    'logs',
    'labs',
    'docs',
    'book',
    'slides',
    'info',
  ])
    assert.equal(
      (await readdir(join(site, 'dist'))).includes(section),
      false,
      `Disabled ${section} route was emitted.`,
    );
  const disabledHome = await readFile(join(site, 'dist/index.html'), 'utf8');
  for (const section of [
    'blog',
    'logs',
    'labs',
    'docs',
    'book',
    'slides',
    'info',
  ])
    assert(!disabledHome.includes(`/sections/${section}/`));
  await configureSections({
    docs: { enabled: true, label: 'Reference' },
    book: { enabled: true, label: 'Guide' },
    blog: { enabled: true, label: 'Writing' },
    logs: { enabled: true, label: 'Field notes' },
    labs: { enabled: true, label: 'Apps' },
    slides: { enabled: true, label: 'Talks' },
    info: { enabled: true, label: 'Project' },
  });
  run(['run', 'verify'], sectionEnv);
  const configuredHome = await readFile(join(site, 'dist/index.html'), 'utf8');
  assert(configuredHome.includes('Reference'));
  assert(configuredHome.includes('Field notes'));
  assert(
    configuredHome.indexOf('Reference') < configuredHome.indexOf('Writing'),
  );
  assert(configuredHome.includes('Talks'));
  const configuredSlides = await readFile(
    join(site, 'dist/slides/index.html'),
    'utf8',
  );
  assert(configuredSlides.includes('<title>Talks'));
  assert(configuredSlides.includes('/sections/slides/first-talk/'));
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
