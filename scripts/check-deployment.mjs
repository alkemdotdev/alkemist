import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
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
  ['/docs/', 'Getting started'],
  ['/docs/hosting/cloudflare/', 'Host your site on Cloudflare'],
  ['/docs/hosting/gitlab-pages/', 'Host your site on GitLab Pages'],
  ['/docs/hosting/custom/', 'Host your site with another provider'],
  ['/docs/charts/', 'Charts and data'],
  ['/docs/components/', 'Components'],
  ['/docs/content/', 'Content'],
  ['/docs/visualization/', 'Visualization'],
  ['/docs/music/', 'Music and MIDI'],
  ['/blog/notes-you-can-change/', 'Notes you can change'],
  ['/docs/graphics/', 'Graphics'],
  ['/docs/website/', 'Website'],
  ['/docs/native-content/', 'Native HTML'],
  ['/docs/navigation/', 'Navigation'],
  ['/docs/math-code/', 'Math and code'],
  ['/docs/site-structure/', 'Site structure and navigation'],
  ['/docs/post-images/', 'Blog thumbnails and covers'],
  ['/blog/three-homepage-directions/', 'Three ways to introduce the workbench'],
  ['/blog/', 'Blog'],
  ['/logs/', 'Logs'],
  ['/book/', 'Book'],
  ['/book/02-make-evidence-readable/', 'Write the first useful entry'],
  ['/logs/one-concrete-slice/', 'Start with one concrete slice'],
  ['/blog/foundation/', 'A notebook with its own workbench'],
  ['/labs/', 'Labs'],
  ['/labs/homepage-studies/', 'Homepage studies'],
  ['/labs/hero-studies/', 'Hero studies'],
  ['/labs/sculpture-studies/', 'Four sculpture studies'],
  ['/labs/field-studies/', 'Field studies'],
  ['/blog/fields-with-substance/', 'Fields with substance'],
  ['/blog/home-for-working-ideas/', 'A home for working ideas'],
  ['/blog/a-more-direct-interface/', 'A more direct interface'],
  ['/blog/four-new-forms/', 'Four new forms'],
  ['/blog/form-and-structure/', 'From playful forms'],
  ['/labs/interference/', 'Interference lab'],
  ['/info/', 'Info'],
  ['/test/', 'Test page'],
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
const embeds = await get('/labs/embeds/');
assert.equal(embeds.status, 200);
assert.ok(embeds.text.includes('<title>Component embeds'));
assert.ok(embeds.text.includes('name="robots" content="noindex,nofollow"'));
for (const component of [
  'alk-chart',
  'alk-model',
  'alk-media',
  'alk-post-list',
  'alk-search',
]) {
  assert.ok(
    embeds.text.includes(`<${component}`),
    `Missing embed: ${component}`,
  );
}
checks.push({ path: '/labs/embeds/', status: embeds.status });
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
  ['/llms.txt', /^text\/plain/, ['/docs/agent-setup.md', '/docs/']],
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
const mediaChecks = [];
for (const name of ['media-study.wav', 'media-study.mp4']) {
  const mediaUrl = new URL(`/test/${name}`, origin);
  // Advertise seeking on the full representation. A CDN may omit the advisory
  // Accept-Ranges header when it constructs a partial response (RFC 9110 14.3).
  const metadata = await fetch(mediaUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(metadata.status, 200);
  assert.equal(metadata.headers.get('accept-ranges'), 'bytes');
  const response = await fetch(mediaUrl, {
    headers: { Range: 'bytes=16-79' },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    206,
    `${name}: byte-range delivery is required for seeking`,
  );
  assert.match(
    response.headers.get('content-range') ?? '',
    /^bytes 16-79\/\d+$/,
  );
  const body = Buffer.from(await response.arrayBuffer());
  const source = await readFile(
    new URL(`../apps/site/public/test/${name}`, import.meta.url),
  );
  assert.equal(Number(metadata.headers.get('content-length')), source.length);
  assert.deepEqual(
    body,
    source.subarray(16, 80),
    `${name}: returned the wrong media bytes`,
  );
  mediaChecks.push({
    name,
    acceptsRanges: metadata.headers.get('accept-ranges'),
    status: response.status,
    range: response.headers.get('content-range'),
    bytes: body.length,
  });
}
const report = {
  origin: origin.origin,
  checkedAt: new Date().toISOString(),
  build,
  checks,
  machineGuides,
  mediaChecks,
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
