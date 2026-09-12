import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, output, readManifest, runNpm } from './release.mjs';

const manifest = await readManifest();
const temporary = await mkdtemp(join(tmpdir(), 'alkemist-package-check-'));
const keep = process.argv.includes('--keep');
const registryMode = process.argv.includes('--registry');
const dependencies = Object.fromEntries(
  manifest.artifacts
    .filter((a) => a.name !== 'create-alkemist')
    .map((a) => [
      a.name,
      registryMode ? a.version : `file:${join(output, a.filename)}`,
    ]),
);
Object.assign(dependencies, {
  astro: '7.3.2',
  '@astrojs/mdx': '8.0.1',
  '@astrojs/markdown-remark': '7.3.1',
});
async function write(file, contents) {
  await writeFile(join(temporary, file), contents);
}
function run(args) {
  try {
    return runNpm(args, temporary);
  } catch (error) {
    console.error(error.stdout, error.stderr);
    throw error;
  }
}
try {
  await mkdir(join(temporary, 'src/pages'), { recursive: true });
  await write(
    'package.json',
    JSON.stringify({
      name: 'alkemist-existing-site-fixture',
      private: true,
      type: 'module',
      scripts: { check: 'astro check', build: 'astro build' },
      dependencies,
      devDependencies: {
        '@astrojs/check': '0.9.10',
        typescript: '6.0.3',
        '@types/node': '24.13.3',
      },
    }),
  );
  await write(
    'tsconfig.json',
    JSON.stringify({ extends: 'astro/tsconfigs/strict' }),
  );
  await write(
    'src/pages/index.astro',
    `---
import AlkMath from '@alkemdotdev/alkemist-components/AlkMath.astro';
import AlkCode from '@alkemdotdev/alkemist-components/AlkCode.astro';
import type { AlkMathProps } from '@alkemdotdev/alkemist-components/AlkMath.astro';
const math: AlkMathProps = {tex:'E=mc^2',label:'Mass and energy'};
---
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Existing site</title></head><body><h1>My existing website</h1><AlkMath {...math}/><AlkCode code="const answer = 42;" lang="javascript"/><style is:global>body {margin:31px;font-family:Georgia,serif;background:#fff8ed;color:#172b4d} h1{font-size:29px}</style></body></html>`,
  );
  await write(
    'src/pages/figures.astro',
    `---
import AlkChart from '@alkemdotdev/alkemist-components/AlkChart.astro';
import AlkModel from '@alkemdotdev/alkemist-components/AlkModel.astro';
---
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Standalone figures</title></head><body><h1>Figures in my existing site</h1><AlkChart src="/sample.csv" type="line" x="x" y="y" title="Measurements" description="Three sample readings."/><AlkModel src="/sample.gltf" title="Sample mesh" description="A model figure."/></body></html>`,
  );
  await mkdir(join(temporary, 'public'));
  await write('public/sample.csv', 'x,y\n0,1\n1,3\n2,2\n');
  await write(
    'public/sample.gltf',
    await readFile(join(root, 'templates/site/public/models/tetrahedron.gltf')),
  );
  await write(
    'src/pages/article.mdx',
    '# Existing MDX\n\nHost-authored content.\n',
  );
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import mdx from '@astrojs/mdx';export default defineConfig({integrations:[mdx()]});`,
  );
  console.log(
    `Installing ${registryMode ? 'registry releases' : 'packed releases'} in ${temporary}`,
  );
  run(['install', '--no-audit', '--no-fund']);
  run(['run', 'check']);
  run(['run', 'build']);
  let html = await readFile(join(temporary, 'dist/index.html'), 'utf8');
  assert(
    html.includes('katex') &&
      html.includes('const') &&
      html.includes('My existing website'),
  );
  let css = '';
  for (const file of await readdir(join(temporary, 'dist/_astro')))
    if (file.endsWith('.css'))
      css += await readFile(join(temporary, 'dist/_astro', file), 'utf8');
  assert(
    !css.includes('@font-face{font-family:Ubuntu') &&
      !css.includes('font-family:Ubuntu'),
    'Standalone component must not load the full theme fonts',
  );
  assert(
    !css.includes('color-scheme:light dark'),
    'Standalone component must not set global color scheme',
  );

  // A site that already owns MDX and its processor can disable all defaults.
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import mdx from '@astrojs/mdx';import {unified} from '@astrojs/markdown-remark';import alkemist from '@alkemdotdev/alkemist-astro';
const marker=()=>tree=>{tree.children.push({type:'paragraph',children:[{type:'text',value:'HOST_PROCESSOR_PRESERVED'}]})};
export default defineConfig({integrations:[mdx(),alkemist({mdx:{enabled:false},math:{enabled:false},code:{enabled:false}})],markdown:{processor:unified({remarkPlugins:[marker]})},vite:{build:{assetsInlineLimit:2048}}});`,
  );
  run(['run', 'build']);
  assert(
    (
      await readFile(join(temporary, 'dist/article/index.html'), 'utf8')
    ).includes('HOST_PROCESSOR_PRESERVED'),
  );
  // Host MDX integration + Alkemist math, without duplicate MDX setup.
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import mdx from '@astrojs/mdx';import alkemist from '@alkemdotdev/alkemist-astro';export default defineConfig({integrations:[mdx(),alkemist({mdx:{enabled:false}})]});`,
  );
  await write('src/pages/article.mdx', '# Math in existing MDX\n\n$E=mc^2$\n');
  run(['run', 'build']);
  assert(
    (
      await readFile(join(temporary, 'dist/article/index.html'), 'utf8')
    ).includes('katex'),
  );
  await write(
    'src/pages/article.mdx',
    '# Invalid math\n\n$\\DefinitelyNotATexCommand$\n',
  );
  let invalid = false;
  try {
    runNpm(['run', 'build'], temporary);
  } catch (error) {
    invalid = /Undefined control sequence|KaTeX|katex/.test(
      String(error.stdout) + String(error.stderr),
    );
  }
  assert(invalid, 'Invalid math must fail the consuming site build');
  await write('src/pages/article.mdx', '# Math in existing MDX\n\n$E=mc^2$\n');
  run(['run', 'build']);
  run(['ci', '--no-audit', '--no-fund']);
  if (registryMode) {
    const generated = join(temporary, 'generated');
    run([
      'exec',
      '--yes',
      '--package',
      'create-alkemist@' + manifest.version,
      '--',
      'create-alkemist',
      generated,
      '--provider',
      'custom',
    ]);
    runNpm(['install', '--no-audit', '--no-fund'], generated);
    runNpm(['run', 'verify'], generated);
    console.log(
      'Published create-alkemist generated and verified a fresh registry-backed site.',
    );
  }
  console.log(
    'Package consumers passed: standalone components, public prop types, theme isolation, host MDX/processor, strict math, registry-compatible dependency graph and lockfile reinstall.',
  );
} finally {
  if (keep) console.log(`Consumer retained for browser review: ${temporary}`);
  else await rm(temporary, { recursive: true, force: true });
}
