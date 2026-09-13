import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { decodeHTML } from 'entities';
import { definitions } from '../apps/site/src/lib/playground/definitions.ts';
import { redirects } from '../apps/site/redirects.mjs';
const root = resolve('apps/site/dist');
const required = [
  'pagefind/pagefind.js',
  'index.html',
  'docs/index.html',
  'docs/charts/index.html',
  'docs/naming/index.html',
  'docs/deployment/index.html',
  'docs/components/index.html',
  'docs/content/index.html',
  'docs/visualization/index.html',
  'docs/graphics/index.html',
  'docs/website/index.html',
  'docs/playground/index.html',
  'playground/chart/index.html',
  'docs/media/index.html',
  'playground/audio/index.html',
  'playground/video/index.html',
  'test/media-study.wav',
  'test/media-study.mp4',
  'test/media-en.vtt',
  'test/media-chapters.vtt',
  'test/tone.wav',
  'test/waves.mp4',
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
  'logs/index.html',
  'book/index.html',
  'book/01-a-site-is-a-working-record/index.html',
  'book/02-make-evidence-readable/index.html',
  'book/03-publish-the-next-useful-step/index.html',
  'logs/one-concrete-slice/index.html',
  'blog/foundation/index.html',
  'notebook/eight-inks.jpg',
  '404.html',
  'build.json',
  'robots.txt',
  '_headers',
  '_routes.json',
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

// HTML consumes the first LF inside a textarea; author/template indentation must not leak in.
const contentCatalog = await readFile(
  join(root, 'docs/content/index.html'),
  'utf8',
);
const initialCode = contentCatalog.match(
  /<textarea\b[^>]*name="code"[^>]*>([\s\S]*?)<\/textarea>/,
)?.[1];
assert.notEqual(
  initialCode,
  undefined,
  'Code playground must provide its initial source field',
);
assert.equal(
  decodeHTML(initialCode).replace(/^\n/, ''),
  definitions.code.defaults.code,
  'Textarea source must exactly match its default before interaction',
);
