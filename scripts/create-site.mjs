import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import nodePath, { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const providers = new Set(['cloudflare', 'gitlab', 'custom']);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Both inputs have already been resolved through existing symlinks. */
export function isOutsideSource(source, destination, paths = nodePath) {
  const rel = paths.relative(source, destination);
  return (
    rel === '..' || rel.startsWith(`..${paths.sep}`) || paths.isAbsolute(rel)
  );
}

/** Invoke npm's JavaScript entry point directly, including paths with spaces. */
export function npmInvocation(
  args,
  {
    env = process.env,
    platform = process.platform,
    execPath = process.execPath,
  } = {},
) {
  if (env.npm_execpath && /\.[cm]?js$/i.test(env.npm_execpath)) {
    return { file: execPath, args: [env.npm_execpath, ...args] };
  }
  // Windows batch shims need a shell. Require npm's own entry point instead of
  // constructing shell text from a user-provided destination or temporary path.
  if (platform === 'win32') {
    throw new Error(
      'On Windows, run this command through npm run so npm_execpath identifies the npm JavaScript CLI.',
    );
  }
  return { file: 'npm', args: [...args] };
}
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}
async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
async function physicalPath(file) {
  try {
    return await realpath(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(await physicalPath(dirname(file)), basename(file));
  }
}
function sourceRevision(root) {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const dirty = Boolean(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim(),
    );
    return { commit, dirty };
  } catch {
    return { commit: null, dirty: null };
  }
}

/** Create an independent site, or explicitly replace only its packaged dependencies. */
export async function createSite({
  destination,
  provider,
  update = false,
  sourceRoot = repository,
}) {
  const root = await physicalPath(sourceRoot);
  const target = await physicalPath(resolve(destination));
  if (!isOutsideSource(root, target)) {
    throw new Error(
      'Choose a destination outside the Alkemist source checkout.',
    );
  }
  let existing = [];
  try {
    existing = await readdir(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let manifest;
  if (update) {
    manifest = await readJson(join(target, 'alkemist.starter.json'));
    if (
      manifest.schemaVersion !== 1 ||
      manifest.generator !== 'alkemist-source-starter'
    ) {
      throw new Error(
        'This is not a recognized Alkemist starter. Refusing to update it.',
      );
    }
    if (provider && provider !== manifest.provider)
      throw new Error('--update preserves the existing hosting provider.');
    provider = manifest.provider;
  } else if (existing.length) {
    throw new Error(
      'Destination is not empty. Choose an empty directory; use --update only for an existing Alkemist starter.',
    );
  }
  provider ??= 'custom';
  if (!providers.has(provider))
    throw new Error('Provider must be cloudflare, gitlab, or custom.');
  const temporary = await mkdtemp(join(tmpdir(), 'alkemist-pack-'));
  try {
    const snapshots = [];
    for (const name of ['components', 'theme', 'astro']) {
      const packageDir = join(root, 'packages', name);
      const pkg = await readJson(join(packageDir, 'package.json'));
      const invocation = npmInvocation([
        'pack',
        '--json',
        '--ignore-scripts',
        '--pack-destination',
        temporary,
      ]);
      const output = execFileSync(invocation.file, invocation.args, {
        cwd: packageDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const report = JSON.parse(output);
      // npm 10/11 return an array; npm 12 keys the report by package name.
      const packed = Array.isArray(report) ? report[0] : report[pkg.name];
      if (!packed?.filename)
        throw new Error(`npm pack returned no file for ${pkg.name}.`);
      const bytes = await readFile(join(temporary, packed.filename));
      const sha256 = digest(bytes);
      const filename = `${pkg.name.replace(/^@/, '').replace('/', '-')}-${pkg.version}-${sha256.slice(0, 12)}.tgz`;
      await rename(join(temporary, packed.filename), join(temporary, filename));
      snapshots.push({
        name: pkg.name,
        version: pkg.version,
        filename,
        sha256,
      });
    }
    // Packing completes before writing the destination; a missing source dependency cannot leave a partial scaffold.
    if (!update) {
      await mkdir(target, { recursive: true });
      await cp(join(root, 'templates/site'), target, { recursive: true });
      await cp(
        join(target, 'hosting', `${provider}.md`),
        join(target, 'HOSTING.md'),
      );
      if (provider === 'gitlab')
        await cp(
          join(target, 'hosting/gitlab-ci.yml'),
          join(target, '.gitlab-ci.yml'),
        );
    }
    const pkg = await readJson(join(target, 'package.json'));
    pkg.dependencies ??= {};
    await mkdir(join(target, 'vendor'), { recursive: true });
    for (const snapshot of snapshots) {
      await cp(
        join(temporary, snapshot.filename),
        join(target, 'vendor', snapshot.filename),
      );
      pkg.dependencies[snapshot.name] = `file:vendor/${snapshot.filename}`;
    }
    await writeJson(join(target, 'package.json'), pkg);
    await writeJson(join(target, 'alkemist.starter.json'), {
      schemaVersion: 1,
      generator: 'alkemist-source-starter',
      provider,
      generatedAt: manifest?.generatedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: sourceRevision(root),
      packages: snapshots,
    });
    return {
      destination: target,
      provider,
      updated: update,
      packages: snapshots,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export function parseArguments(args) {
  let destination,
    provider,
    update = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--provider') {
      provider = args[++index];
      if (!providers.has(provider))
        throw new Error('--provider requires cloudflare, gitlab, or custom.');
    } else if (argument === '--update') update = true;
    else if (argument.startsWith('-') || destination)
      throw new Error(`Unexpected argument: ${argument}`);
    else destination = argument;
  }
  if (!destination)
    throw new Error(
      'Usage: npm run create:site -- ../my-lab --provider cloudflare|gitlab|custom\nUpdate: npm run create:site -- ../my-lab --update',
    );
  return { destination, provider, update };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await createSite(parseArguments(process.argv.slice(2)));
    console.log(
      `${result.updated ? 'Updated packaged dependencies in' : 'Created'} ${result.destination}\nProvider: ${result.provider}\nNext: open that directory, run npm install, npm run verify, then npm run dev.\nRead HOSTING.md before publishing. No Git remote, account, or deployment was created.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
