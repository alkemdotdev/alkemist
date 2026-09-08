import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

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
  ['/docs/charts/', 'Charts and data'],
  ['/components/', 'Components'],
  ['/notebook/foundation/', 'A notebook with its own workbench'],
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
  robots: robots.text,
  missingPageStatus: missing.status,
};
await mkdir('.alkemist/deployments', { recursive: true });
await writeFile(
  `.alkemist/deployments/${origin.hostname}-${expectedCommit.slice(0, 8)}.json`,
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
