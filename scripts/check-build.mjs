import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('apps/site/dist');
const required = [
  'index.html',
  'docs/index.html',
  'docs/charts/index.html',
  'docs/naming/index.html',
  'docs/deployment/index.html',
  'components/index.html',
  'notebook/index.html',
  'notebook/foundation/index.html',
  '404.html',
  'build.json',
  'robots.txt',
  '_headers',
];
for (const file of required)
  assert.ok((await stat(join(root, file))).isFile(), `Missing ${file}`);
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
