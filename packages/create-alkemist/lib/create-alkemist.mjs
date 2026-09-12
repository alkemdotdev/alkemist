import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const template = join(packageRoot, 'template');
const providers = new Set(['cloudflare', 'gitlab', 'custom']);
export const packages = [
  '@alkemdotdev/alkemist-astro',
  '@alkemdotdev/alkemist-components',
  '@alkemdotdev/alkemist-theme',
];

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

const ownManifest = await readJson(join(packageRoot, 'package.json'));
if (typeof ownManifest.version !== 'string' || !ownManifest.version)
  throw new Error('create-alkemist package.json must contain a version.');
export const releaseVersion = ownManifest.version;

/** Generate a site from the template shipped in this npm package. */
export async function createAlkemist({ destination, provider = 'custom' }) {
  if (!providers.has(provider))
    throw new Error('Provider must be cloudflare, gitlab, or custom.');
  const target = resolve(destination);
  let entries = [];
  try {
    entries = await readdir(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (entries.length)
    throw new Error('Destination is not empty. Choose an empty directory.');

  await mkdir(dirname(target), { recursive: true });
  await cp(template, target, { recursive: true, errorOnExist: true });
  await rename(join(target, 'gitignore'), join(target, '.gitignore'));
  await cp(
    join(target, 'hosting', `${provider}.md`),
    join(target, 'HOSTING.md'),
  );
  if (provider === 'gitlab')
    await cp(
      join(target, 'hosting', 'gitlab-ci.yml'),
      join(target, '.gitlab-ci.yml'),
    );

  const manifest = await readJson(join(target, 'package.json'));
  manifest.dependencies ??= {};
  for (const name of packages) manifest.dependencies[name] = releaseVersion;
  await writeJson(join(target, 'package.json'), manifest);
  await writeJson(join(target, 'alkemist.starter.json'), {
    schemaVersion: 2,
    generator: 'create-alkemist',
    generatorVersion: releaseVersion,
    provider,
    generatedAt: new Date().toISOString(),
    packages: packages.map((name) => ({ name, version: releaseVersion })),
  });
  return { destination: target, provider };
}

export function parseArguments(args) {
  let destination;
  let provider = 'custom';
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--provider') {
      provider = args[++index];
      if (!providers.has(provider))
        throw new Error('--provider requires cloudflare, gitlab, or custom.');
    } else if (argument.startsWith('-') || destination) {
      throw new Error(`Unexpected argument: ${argument}`);
    } else {
      destination = argument;
    }
  }
  if (!destination)
    throw new Error(
      'Usage: npm create alkemist@beta -- <directory> [--provider cloudflare|gitlab|custom]',
    );
  return { destination, provider };
}
