import { cp, lstat, rename, rm } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(
  new URL('../../../templates/site/', import.meta.url),
);
const destination = join(packageRoot, 'template');
const requiredFiles = [
  'package.json',
  'astro.config.ts',
  'README.md',
  'src/layouts/SiteLayout.astro',
  'src/pages/index.astro',
  'hosting/custom.md',
  '.gitignore',
];
const generatedDirectories = new Set([
  'node_modules',
  '.astro',
  '.vite',
  'dist',
  '.git',
]);

function excludeFromTemplate(candidate) {
  const segments = relative(source, candidate).split(sep);
  return segments.some(
    (segment) =>
      generatedDirectories.has(segment) ||
      segment === '.npmrc' ||
      (segment.startsWith('.env') && segment !== '.env.example'),
  );
}

async function requireFile(root, relativePath) {
  try {
    const info = await lstat(join(root, relativePath));
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    throw new Error(`Template is incomplete: missing ${relativePath}.`);
  }
}

for (const file of requiredFiles) await requireFile(source, file);
await rm(destination, { recursive: true, force: true });
await cp(source, destination, {
  recursive: true,
  errorOnExist: true,
  filter: (candidate) => !excludeFromTemplate(candidate),
});
await rename(join(destination, '.gitignore'), join(destination, 'gitignore'));
for (const file of requiredFiles)
  await requireFile(destination, file === '.gitignore' ? 'gitignore' : file);
