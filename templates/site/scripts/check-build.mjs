import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { join, resolve, sep } from 'node:path';
import { resolveDeployment } from './deployment.mjs';

const root = resolve('dist');
if (existsSync('.env')) loadEnvFile('.env');
const metadata = JSON.parse(await readFile(join(root, 'build.json'), 'utf8'));
const { base, environment } = metadata;
const expected = resolveDeployment(process.env);
if (base !== expected.base || environment !== expected.environment) {
  throw new Error('Build metadata does not match the requested deployment.');
}
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(join(directory, entry.name))
        : join(directory, entry.name),
    ),
  );
  return nested.flat();
}
const htmlFiles = (await files(root)).filter((file) => file.endsWith('.html'));
const failures = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (
    html.includes('<alk-search') &&
    !existsSync(join(root, 'pagefind/pagefind.js'))
  )
    failures.push(
      `${file}: search control is present but the generated index is missing`,
    );
  if (environment === 'preview' && !html.includes('noindex, nofollow'))
    failures.push(`${file}: missing preview noindex`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url.startsWith('//')) continue;
    if (!url.startsWith(base)) {
      failures.push(`${file}: URL ${url} escapes base ${base}`);
      continue;
    }
    const local = decodeURIComponent(url.slice(base.length));
    const candidate = resolve(
      root,
      local.endsWith('/') || !local ? `${local}index.html` : local,
    );
    if (!candidate.startsWith(`${root}${sep}`)) {
      failures.push(`${file}: invalid local URL ${url}`);
      continue;
    }
    try {
      if (!(await stat(candidate)).isFile()) throw new Error();
    } catch {
      failures.push(`${file}: missing ${url}`);
    }
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  `Checked ${htmlFiles.length} pages, local links/assets, ${base} base, and ${environment} build metadata.`,
);
