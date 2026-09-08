import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { redirects } from '../apps/site/redirects.mjs';
const root = resolve('apps/site/dist');
const required = [
  'index.html',
  'docs/index.html',
  'docs/charts/index.html',
  'docs/naming/index.html',
  'docs/deployment/index.html',
  'docs/components/index.html',
  'docs/site-structure/index.html',
  'docs/getting-started/index.html',
  'docs/hosting/cloudflare/index.html',
  'docs/hosting/gitlab-pages/index.html',
  'docs/hosting/custom/index.html',
  'docs/agent-setup.md',
  'llms.txt',
  'labs/index.html',
  'labs/homepage-studies/index.html',
  'labs/hero-studies/index.html',
  'labs/sculpture-studies/index.html',
  'labs/field-studies/index.html',
  'blog/fields-with-substance/index.html',
  'blog/home-for-working-ideas/index.html',
  'blog/a-more-direct-interface/index.html',
  'blog/four-new-forms/index.html',
  'blog/form-and-structure/index.html',
  'blog/color-in-the-models/index.html',
  'labs/interference/index.html',
  'labs/design-studio/index.html',
  'labs/board-studies/index.html',
  'info/index.html',
  'test/index.html',
  'test/inks.json',
  'test/torus-knot.glb',
  'test/oscillation.csv',
  'docs/palette/index.html',
  'docs/math-code/index.html',
  'docs/models/index.html',
  'blog/index.html',
  'blog/foundation/index.html',
  'notebook/eight-inks.jpg',
  '404.html',
  'build.json',
  'robots.txt',
  '_headers',
  '_redirects',
];
for (const file of required)
  assert.ok((await stat(join(root, file))).isFile(), `Missing ${file}`);
const redirectRules = (await readFile(join(root, '_redirects'), 'utf8'))
  .trim()
  .split('\n');
for (const [from, to] of Object.entries(redirects)) {
  assert.ok(!redirects[to], `Redirect chain or loop: ${from} -> ${to}`);
  assert.ok(
    !from.includes('*'),
    'Page migrations must not capture legacy downloads',
  );
  assert.ok(
    (await stat(join(root, to, 'index.html'))).isFile(),
    `Missing redirect target ${to}`,
  );
  assert.ok(
    redirectRules.includes(`${from} ${to} 301`),
    `Missing HTTP redirect ${from}`,
  );
  assert.ok(
    redirectRules.includes(`${from.slice(0, -1)} ${to} 301`),
    `Missing slashless redirect ${from}`,
  );
}
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
let pages = 0;
for (const path of await walk(root)) {
  if (extname(path) !== '.html') continue;
  pages++;
  const html = await readFile(path, 'utf8');
  assert.match(html, /<title>[^<]+<\/title>/, `${path}: title missing`);
  assert.match(html, /rel="canonical"/, `${path}: canonical missing`);
  for (const match of html.matchAll(
    /(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g,
  )) {
    const url = match[1];
    if (url.startsWith('//')) continue;
    let local = join(root, decodeURIComponent(url));
    if (url.endsWith('/')) local = join(local, 'index.html');
    assert.ok(
      (await stat(local)).isFile(),
      `${path}: broken asset/link ${url}`,
    );
  }
}
const build = JSON.parse(await readFile(join(root, 'build.json'), 'utf8'));
assert.equal(build.project, 'alkemist');
const preview = Boolean(
  process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main',
);
assert.equal(build.environment, preview ? 'preview' : 'production');
const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes(preview ? 'Disallow: /' : 'Allow: /'));
if (preview)
  assert.match(
    await readFile(join(root, 'index.html'), 'utf8'),
    /noindex, nofollow/,
  );
console.log(
  `Verified ${pages} pages, internal links, local assets, and ${build.environment} build identity.`,
);
