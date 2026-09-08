import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { redirects } from '../apps/site/redirects.mjs';

const [base, expectedCommit, expectedBranch] = process.argv.slice(2);
if (!base || !/^[a-f0-9]{40}$/.test(expectedCommit ?? '') || !expectedBranch) {
  throw new Error(
    'Usage: node scripts/check-deployment.mjs <https-origin> <40-character-commit> <branch>',
  );
}
const origin = new URL(base);
assert.equal(origin.protocol, 'https:');
assert.equal(origin.username + origin.password, '');
assert.equal(origin.pathname, '/');
assert.equal(origin.search + origin.hash, '');
async function get(path) {
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  return {
    status: response.status,
    url: response.url,
    text: await response.text(),
    headers: Object.fromEntries(response.headers),
  };
}
const manifest = await get('/build.json');
assert.equal(manifest.status, 200);
const build = JSON.parse(manifest.text);
assert.equal(build.project, 'alkemist');
assert.equal(
  build.commit,
  expectedCommit,
  'Deployed commit does not match the requested source.',
);
assert.equal(build.branch, expectedBranch);
assert.equal(
  build.environment,
  expectedBranch === 'main' ? 'production' : 'preview',
);
const checks = [];
for (const [path, title] of [
  ['/', 'Alkemist'],
  ['/docs/', 'Documentation'],
  ['/docs/getting-started/', 'Getting started'],
  ['/docs/hosting/cloudflare/', 'Host your site on Cloudflare'],
  ['/docs/hosting/gitlab-pages/', 'Host your site on GitLab Pages'],
  ['/docs/hosting/custom/', 'Host your site with another provider'],
  ['/docs/charts/', 'Charts and data'],
  ['/docs/components/', 'Components'],
  ['/docs/site-structure/', 'Site structure and navigation'],
  ['/blog/', 'Blog'],
  ['/blog/foundation/', 'A notebook with its own workbench'],
  ['/labs/', 'Labs'],
  ['/labs/homepage-studies/', 'Homepage studies'],
  ['/labs/hero-studies/', 'Hero studies'],
  ['/labs/sculpture-studies/', 'Four sculpture studies'],
  ['/blog/four-new-forms/', 'Four new forms'],
  ['/labs/interference/', 'Interference lab'],
  ['/info/', 'Info'],
  ['/test/', 'The specimen board'],
]) {
  const result = await get(path);
  assert.equal(result.status, 200, path);
  assert.ok(
    result.text.includes(`<title>${title}`),
    `Unexpected content at ${path}`,
  );
  assert.ok(
    result.text.includes('https://alkemist.alkem.dev'),
    `Missing production canonical at ${path}`,
  );
  assert.equal(result.headers['x-content-type-options'], 'nosniff');
  if (build.environment === 'preview') {
    assert.ok(
      result.text.includes('noindex, nofollow'),
      `Missing noindex metadata at ${path}`,
    );
    assert.ok(
      result.text.includes('Branch preview'),
      `Missing preview banner at ${path}`,
    );
  } else {
    assert.ok(
      !result.text.includes('noindex, nofollow'),
      `Unexpected noindex metadata at ${path}`,
    );
  }
  checks.push({
    path,
    status: result.status,
    previewRobots: result.headers['x-robots-tag'] ?? null,
  });
}
const redirectChecks = [];
const machineGuides = [];
for (const [path, type, required] of [
  [
    '/docs/agent-setup.md',
    /^text\/markdown/,
    [
      'npm run create:site',
      '--provider cloudflare',
      '--provider gitlab',
      '--provider custom',
    ],
  ],
  [
    '/llms.txt',
    /^text\/plain/,
    ['/docs/agent-setup.md', '/docs/getting-started/'],
  ],
]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers['content-type'] ?? '', type, path);
  for (const phrase of required)
    assert.ok(response.text.includes(phrase), `${path}: missing ${phrase}`);
  machineGuides.push({
    path,
    status: response.status,
    contentType: response.headers['content-type'],
  });
}
for (const [from, to] of Object.entries(redirects)) {
  for (const source of [from, from.slice(0, -1)]) {
    const response = await fetch(
      new URL(`${source}?take=workshop&board=white`, origin),
      {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      },
    );
    assert.equal(response.status, 301, source);
    const destination = new URL(response.headers.get('location'), origin);
    assert.equal(destination.origin, origin.origin);
    assert.equal(destination.pathname, to, source);
    assert.equal(
      destination.searchParams.get('take'),
      'workshop',
      'Redirect lost shared view state',
    );
    assert.equal(
      destination.searchParams.get('board'),
      'white',
      'Redirect lost shared view state',
    );
    redirectChecks.push({
      source,
      destination: destination.pathname,
      status: response.status,
    });
    await response.body?.cancel();
  }
}
const legacyAsset = await fetch(new URL('/notebook/eight-inks.jpg', origin), {
  redirect: 'manual',
  signal: AbortSignal.timeout(15000),
});
assert.equal(
  legacyAsset.status,
  200,
  'Published image must not redirect with article pages',
);
assert.match(legacyAsset.headers.get('content-type') ?? '', /^image\//);
await legacyAsset.body?.cancel();
const robots = await get('/robots.txt');
assert.equal(robots.status, 200);
assert.ok(
  robots.text.includes(
    build.environment === 'preview' ? 'Disallow: /' : 'Allow: /',
  ),
);
const missing = await get('/alkemist-verification-missing-page/');
assert.equal(missing.status, 404);
const report = {
  origin: origin.origin,
  checkedAt: new Date().toISOString(),
  build,
  checks,
  machineGuides,
  redirectChecks,
  robots: robots.text,
  missingPageStatus: missing.status,
};
await mkdir('.alkemist/deployments', { recursive: true });
await writeFile(
  `.alkemist/deployments/${origin.hostname}-${expectedCommit.slice(0, 8)}.json`,
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
