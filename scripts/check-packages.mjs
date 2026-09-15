import assert from 'node:assert/strict';
import { playgroundSource } from '../packages/components/src/playground/helpers.ts';
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
  await mkdir(join(temporary, 'src/pages/slides'), { recursive: true });
  await mkdir(join(temporary, 'src/content'), { recursive: true });
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
import Math from '@alkemdotdev/alkemist-components/math';
import Code from '@alkemdotdev/alkemist-components/code';
import Search, {type SearchProps} from '@alkemdotdev/alkemist-components/search';
import Navigation, {type NavigationItem} from '@alkemdotdev/alkemist-components/navigation';
import TableOfContents, {type TableOfContentsProps} from '@alkemdotdev/alkemist-components/table-of-contents';
import type { MathProps } from '@alkemdotdev/alkemist-components/math';
const items: NavigationItem[] = [{label:'Overview',href:'/'},{label:'Figures',href:'/figures/',children:[{label:'Posts',href:'/posts/'}]}];
const contents: TableOfContentsProps = {headings:[{depth:2,slug:'example',text:'Example'}]};
const math: MathProps = {tex:'E=mc^2',label:'Mass and energy'};
const search: SearchProps = {label:'Search this existing site'};
---
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Existing site</title></head><body><h1>My existing website</h1><Navigation items={items} currentPath="/"/><TableOfContents {...contents}/><h2 id="example">Example</h2><Search {...search}/><Math {...math}/><Code code="const answer = 42;" lang="javascript"/><style is:global>body {margin:31px;font-family:Georgia,serif;background:#fff8ed;color:#172b4d} h1{font-size:29px}</style></body></html>`,
  );
  await write(
    'src/pages/media.astro',
    `---
import Audio, {type AudioProps} from '@alkemdotdev/alkemist-components/audio';
import Video, {type VideoProps} from '@alkemdotdev/alkemist-components/video';
const audio: AudioProps = {src:'/sample.wav',title:'Listening example',seekOffset:5,playbackRates:[0.5,1,2],transcript:'A quiet tone.'};
const video: VideoProps = {src:'/sample.mp4',poster:'',title:'Moving example',tracks:[{src:'/captions.vtt',kind:'captions',srclang:'en',label:'English'}]};
---
<html lang="en"><head><title>Standalone media</title></head><body><h1>Media in my own layout</h1><Audio {...audio}/><Video {...video}/></body></html>`,
  );
  await write(
    'src/pages/media-mdx.mdx',
    'import Audio from "@alkemdotdev/alkemist-components/audio";\nimport Video from "@alkemdotdev/alkemist-components/video";\n\n# MDX media\n\n<Audio src="/sample.wav" />\n\n<Video src="/sample.mp4" />\n',
  );
  await write(
    'src/pages/music.astro',
    `---
import Midi, {getMidiPreset, type MidiProps, type MidiSequence} from '@alkemdotdev/alkemist-components/midi';
const sequence: MidiSequence = getMidiPreset('ensemble');
const props: MidiProps = {sequence,title:'Music in my own site',editable:false};
---
<html lang="en"><head><title>Standalone music</title></head><body><Midi {...props}/></body></html>`,
  );
  await write(
    'src/pages/music-mdx.mdx',
    'import Midi from "@alkemdotdev/alkemist-components/midi";\n\n# Musical notes\n\n<Midi preset="pulse" editable={false} />\n',
  );
  await write(
    'src/pages/figures.astro',
    `---
import Chart from '@alkemdotdev/alkemist-components/chart';
import Model from '@alkemdotdev/alkemist-components/model';
---
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Standalone figures</title></head><body><h1>Figures in my existing site</h1><Chart src="/sample.csv" type="line" x="x" y="y" title="Measurements" description="Three sample readings."/><Model src="/sample.gltf" title="Sample mesh" description="A model figure."/></body></html>`,
  );
  await write(
    'src/pages/playground.astro',
    `---
import Playground from '@alkemdotdev/alkemist-components/playground';
import type {PlaygroundDefinition} from '@alkemdotdev/alkemist-components/playground';
const definition: PlaygroundDefinition = {id:'equation',name:'Math',importPath:'@alkemdotdev/alkemist-components/math',defaults:{tex:'E=mc^2'},controls:[{name:'tex',type:'textarea'}]};
---
<html lang="en"><head><meta charset="utf-8"/><title>Reusable playground</title></head><body><Playground definition={definition} previewUrl="/equation/" focusPreview /></body></html>`,
  );
  await write(
    'src/pages/equation.astro',
    `---
import Equation from '@alkemdotdev/alkemist-components/math';
---
<html lang="en"><head><meta charset="utf-8"/><title>Equation frame</title></head><body><div id="example"><Equation tex="E=mc^2"/></div><script>
import {renderMath} from '@alkemdotdev/alkemist-components/playground/renderers';
window.addEventListener('message', event => {if(event.origin!==location.origin || event.source!==parent || event.data?.type!=='alk:playground:update' || event.data.id!=='equation') return; const {values,revision}=event.data; try {document.querySelector('#example')!.innerHTML=renderMath(values);parent.postMessage({type:'alk:playground:rendered',id:'equation',revision},location.origin);} catch(error) {parent.postMessage({type:'alk:playground:error',id:'equation',revision,message:String(error)},location.origin);}});
parent.postMessage({type:'alk:playground:ready',id:'equation'},location.origin);
</script></body></html>`,
  );
  {
    await write(
      'src/pages/posts.astro',
      `---
import PostList from '@alkemdotdev/alkemist-components/post-list';
import type { PostListProps, PostListItem, PostListLayout } from '@alkemdotdev/alkemist-components/post-list';
const items: PostListItem[] = [
  {href:'/new/',title:'Newest note',description:'A post without an image.',date:'2026-09-12'},
  {href:'/lead/',title:'Chosen lead',description:'Explicit editorial selection.',cover:{src:'/cover.svg',alt:'Sample diagram',fit:'contain'}},
];
const layout: PostListLayout = 'featured-grid';
const props: PostListProps = {items,layout,selectable:true,featuredHref:'/lead/'};
---
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Reusable post lists</title></head><body><h1>Posts on an existing website</h1><PostList {...props}/><PostList items={items} layout="rows" label="Independent list"/><PostList items={[]} label="Empty list"/></body></html>`,
    );
  }
  await mkdir(join(temporary, 'public'));
  await write(
    'public/cover.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><circle cx="150" cy="100" r="60" fill="royalblue"/></svg>',
  );
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
    'src/pages/slides.astro',
    `---
import Slides, { type SlidesProps } from '@alkemdotdev/alkemist-components/slides';
import Note from '@alkemdotdev/alkemist-components/note';
import Focus, { type FocusProps } from '@alkemdotdev/alkemist-components/focus';
import Annotations, { type AnnotationsProps } from '@alkemdotdev/alkemist-components/annotations';
const focus: FocusProps = {for: 'first'};
const annotations: AnnotationsProps = {documentId: 'packed-example'};
const props: SlidesProps = { title: 'Slides in my existing layout', view: 'read' };
---
<html lang="en"><head><title>Standalone slides</title></head><body><header>Host navigation</header><main><Annotations {...annotations}><p>Annotations also work in an existing document.</p></Annotations><Slides {...props}><section data-alk-slide id="first"><h1>Existing layout</h1><p>Host-owned document chrome remains in place.</p><Note for="first">A local note.</Note><Focus {...focus} /></section></Slides></main></body></html>`,
  );
  await write(
    'src/content/embedded.mdx',
    `---
title: Embedded source
description: A shared Markdown deck source.
format: slides
---

import Focus from '@alkemdotdev/alkemist-components/focus';

# One source, two instances

The same Markdown source retains its footnote.[^source]

<div id="shared-figure"><p>A figure shared by two deck instances.</p><button>Figure control</button></div>
<Focus for="shared-figure" />

[^source]: This footnote is part of each embedded deck.

---

# A second slide

Each instance navigates independently.`,
  );
  await write(
    'src/pages/slides/embedded.astro',
    `---
import Slides from '@alkemdotdev/alkemist-components/slides';
import EmbeddedContent from '../../content/embedded.mdx';
---
<html lang="en"><head><meta charset="utf-8"/><title>Embedded slides</title></head><body><main><Slides title="First embedded instance" embedded><EmbeddedContent /></Slides><Slides title="Second embedded instance" embedded><EmbeddedContent /></Slides></main></body></html>`,
  );
  await write(
    'src/pages/deck.md',
    `---
title: Markdown deck
description: A deck authored without MDX.
format: slides
incremental: true
---

# Markdown deck

- First observation
- Second observation

<!-- notes: Keep the source visible. -->

---

# A second slide

> [!NOTE]
> This source is a fixture.`,
  );
  await write(
    'src/pages/deck-mdx.mdx',
    `---
title: MDX deck
description: Built-in figures need no explicit imports.
format: slides
---

# An auto-imported chart

<Chart id="fixture-chart" src="/sample.csv" type="line" x="x" y="y" title="Fixture chart" description="Three synthetic rows." sample />

<Note for="fixture-chart">The chart is a local fixture.</Note>

<SpeakerNotes>Describe the source before the controls.</SpeakerNotes>

---

# An explicit step

<Step>Advance this point deliberately.</Step>`,
  );
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import alkemist from '@alkemdotdev/alkemist-astro';export default defineConfig({integrations:[alkemist({slides:true})]});`,
  );
  console.log(
    `Installing ${registryMode ? 'registry releases' : 'packed releases'} in ${temporary}`,
  );
  run(['install', '--no-audit', '--no-fund']);
  run(['run', 'check']);
  run(['run', 'build']);
  for (const page of ['media', 'media-mdx']) {
    const html = await readFile(
      join(temporary, 'dist', page, 'index.html'),
      'utf8',
    );
    assert.match(html, /<audio[^>]*controls[^>]*src="\/sample.wav"/);
    assert.match(html, /<video[^>]*controls[^>]*src="\/sample.mp4"/);
    assert.match(html, /media-time-range/);
    assert.doesNotMatch(html, /class="alk-layout/);
  }
  for (const page of ['music', 'music-mdx']) {
    const html = await readFile(
      join(temporary, 'dist', page, 'index.html'),
      'utf8',
    );
    assert.match(html, /<alk-midi/);
    assert.match(html, /<svg/);
    assert.doesNotMatch(html, /class="alk-layout/);
  }

  const playground = await readFile(
    join(temporary, 'dist/playground/index.html'),
    'utf8',
  );
  assert.match(playground, /alk-playground--focus/);
  assert.match(playground, /<summary>Source code<\/summary>/);
  assert.match(playground, /<summary>Component parameters<\/summary>/);
  let html = await readFile(join(temporary, 'dist/index.html'), 'utf8');
  assert(
    html.includes('katex') &&
      html.includes('const') &&
      html.includes('My existing website'),
  );
  const standaloneSlides = await readFile(
    join(temporary, 'dist/slides/index.html'),
    'utf8',
  );
  assert.match(standaloneSlides, /Host navigation/);
  assert.match(standaloneSlides, /<alk-slides/);
  assert.match(standaloneSlides, /<alk-focus/);
  assert.match(standaloneSlides, /data-document-id="packed-example"/);
  assert.match(standaloneSlides, /data-initial-view="read"/);
  assert.doesNotMatch(standaloneSlides, /class="alk-layout/);
  const embeddedSlides = await readFile(
    join(temporary, 'dist/slides/embedded/index.html'),
    'utf8',
  );
  assert.equal((embeddedSlides.match(/<alk-slides/g) ?? []).length, 2);
  assert.equal(
    (embeddedSlides.match(/<h1\b[^>]*>One source, two instances<\/h1>/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (embeddedSlides.match(/This footnote is part of each embedded deck/g) ?? [])
      .length,
    2,
  );
  assert.equal((embeddedSlides.match(/data-embedded="true"/g) ?? []).length, 2);
  const markdownDeck = await readFile(
    join(temporary, 'dist/deck/index.html'),
    'utf8',
  );
  assert.match(markdownDeck, /data-alk-slide/);
  assert.match(markdownDeck, /class="fragment"/);
  assert.match(markdownDeck, /Keep the source visible/);
  assert.match(markdownDeck, /alk-callout-note/);
  const mdxDeck = await readFile(
    join(temporary, 'dist/deck-mdx/index.html'),
    'utf8',
  );
  assert.match(mdxDeck, /<alk-chart id="fixture-chart"/);
  assert.match(mdxDeck, /data-note-target="fixture-chart"/);
  assert.match(mdxDeck, /data-alk-speaker-notes/);
  assert.match(mdxDeck, /data-alk-step/);
  // The following host-owned-MDX phase intentionally disables the deck
  // compiler. Keep this fixture valid there without weakening the auto-import
  // assertion above.
  await write(
    'src/pages/deck-mdx.mdx',
    `import Chart from '@alkemdotdev/alkemist-components/chart';
import Note from '@alkemdotdev/alkemist-components/note';
import SpeakerNotes from '@alkemdotdev/alkemist-components/speaker-notes';
import Step from '@alkemdotdev/alkemist-components/step';

# An explicitly imported chart

<Chart id="fixture-chart" src="/sample.csv" type="line" x="x" y="y" title="Fixture chart" description="Three synthetic rows." sample />

<Note for="fixture-chart">The chart is a local fixture.</Note>

<SpeakerNotes>Describe the source before the controls.</SpeakerNotes>

<Step>Advance this point deliberately.</Step>`,
  );
  {
    const posts = await readFile(
      join(temporary, 'dist/posts/index.html'),
      'utf8',
    );
    assert(posts.includes('Chosen lead') && posts.includes('Newest note'));
    assert.equal(
      (posts.match(/href="\/lead\/"/g) ?? []).length,
      2,
      'Each component renders a post once',
    );
    assert(
      posts.indexOf('href="/lead/"') < posts.indexOf('href="/new/"'),
      'Explicit lead precedes remaining posts',
    );
  }
  let css = '';
  for (const file of await readdir(join(temporary, 'dist/_astro')))
    if (file.endsWith('.css'))
      css += await readFile(join(temporary, 'dist/_astro', file), 'utf8');
  assert(
    !css.includes('@font-face{font-family:Ubuntu') &&
      !css.includes('font-family:Ubuntu'),
    'Standalone component must not load the full theme fonts',
  );
  // An explicit deck override may opt into the system scheme without changing
  // the host document. Continue rejecting any unscoped theme initialization.
  const hostCss = css.replace(
    /\.alk-slides\[data-color-scheme=(?:["']?)system(?:["']?)\]\{color-scheme:light dark;?\}/g,
    '',
  );
  assert(
    !hostCss.includes('color-scheme:light dark'),
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
  // Both supported authoring grammars feed text slots to the same Code renderer.
  const slotExample =
    '<Code lang="typescript" title="slot.ts">{String.raw`\n  const object = { value: "<tag>&amp;</tag>" };\n  const answer = 42;\n`}</Code>';
  await write(
    'src/pages/slot.astro',
    '---\nimport Code from "@alkemdotdev/alkemist-components/code";\n---\n' +
      slotExample,
  );
  await write(
    'src/pages/slot-mdx.mdx',
    'import Code from "@alkemdotdev/alkemist-components/code";\n\n' +
      slotExample,
  );
  await write(
    'src/pages/slot-bare.mdx',
    'import Code from "@alkemdotdev/alkemist-components/code";\n\n<Code title="bare.js">\n  const answer = 42;\n</Code>\n',
  );
  const generatedSource =
    'const object = { value: "<tag>&amp;</tag>" };\nconst answer = 42;';
  await write(
    'src/pages/slot-generated.astro',
    playgroundSource(
      {
        id: 'code',
        name: 'Code',
        importPath: '@alkemdotdev/alkemist-components/code',
        defaults: {},
        controls: [],
        textSlotProp: 'code',
      },
      { code: generatedSource, lang: 'typescript', title: 'generated.ts' },
    ),
  );
  // Plain Markdown fences must work without a Layout or component import.
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import alkemist from '@alkemdotdev/alkemist-astro';export default defineConfig({integrations:[alkemist()]});`,
  );
  const markdownSample =
    '# Native authoring\n\nA paragraph with **emphasis**.\n\n- First\n- Second\n\n$E=mc^2$\n\n```ts title="native.ts" {2} collapse={1}\nconst setup = 1;\nconst answer = 42;\n```\n';
  await write('src/pages/native.md', markdownSample);
  await write('src/pages/native-mdx.mdx', markdownSample);
  run(['run', 'build']);
  for (const route of ['slot', 'slot-mdx', 'slot-generated']) {
    const rendered = await readFile(
      join(temporary, `dist/${route}/index.html`),
      'utf8',
    );
    const encoded = rendered.match(/data-alk-source="([^"]*)"/)?.[1];
    assert(encoded, `${route}: slot must render Code`);
    assert.equal(
      decodeURIComponent(encoded),
      'const object = { value: "<tag>&amp;</tag>" };\nconst answer = 42;',
    );
    assert(
      !rendered.includes('<tag>'),
      `${route}: literal tags must remain escaped source`,
    );
  }
  const bareSlot = await readFile(
    join(temporary, 'dist/slot-bare/index.html'),
    'utf8',
  );
  assert.equal(
    decodeURIComponent(bareSlot.match(/data-alk-source="([^"]*)"/)?.[1] ?? ''),
    'const answer = 42;',
  );
  for (const route of ['native', 'native-mdx']) {
    const rendered = await readFile(
      join(temporary, `dist/${route}/index.html`),
      'utf8',
    );
    assert(
      rendered.includes('alk-code-fold') &&
        rendered.includes('alk-code-highlight'),
    );
    assert(
      rendered.includes('native.ts') && rendered.includes('data-alk-copy'),
    );
    assert(
      rendered.includes('katex') &&
        rendered.includes('<strong>emphasis</strong>') &&
        rendered.includes('<li>First</li>'),
    );
    const styleFiles = [...rendered.matchAll(/href="([^" ]+\.css)"/g)].map(
      (match) => match[1],
    );
    const routeCSS =
      rendered +
      (
        await Promise.all(
          styleFiles.map((file) =>
            readFile(join(temporary, 'dist', file), 'utf8'),
          ),
        )
      ).join('');
    assert(
      routeCSS.includes('.alk-code-pre'),
      `${route}: scoped Code styles must be attached to Markdown itself`,
    );
    const scriptFiles = [...rendered.matchAll(/src="([^" ]+\.js)"/g)].map(
      (match) => match[1],
    );
    const routeJS = (
      await Promise.all(
        scriptFiles.map((file) =>
          readFile(join(temporary, 'dist', file), 'utf8'),
        ),
      )
    ).join('');
    assert(
      routeJS.includes('data-alk-copy') ||
        routeJS.includes('code-copy') ||
        routeJS.includes('code.astro'),
      `${route}: copy enhancement must be loaded without a Layout`,
    );
  }

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
  // Preserve a presentation-enabled artifact for --keep browser inspection.
  await write(
    'astro.config.mjs',
    `import {defineConfig} from 'astro/config';import alkemist from '@alkemdotdev/alkemist-astro';export default defineConfig({integrations:[alkemist({slides:true})]});`,
  );
  run(['run', 'build']);
  const generator = manifest.artifacts.find(
    (artifact) => artifact.name === 'create-alkemist',
  );
  assert(generator, 'Release must include create-alkemist');
  const generated = join(temporary, 'generated');
  run([
    'exec',
    '--yes',
    '--package',
    registryMode
      ? 'create-alkemist@' + manifest.version
      : `file:${join(output, generator.filename)}`,
    '--',
    'create-alkemist',
    generated,
    '--provider',
    'custom',
  ]);
  const generatedManifest = JSON.parse(
    await readFile(join(generated, 'package.json'), 'utf8'),
  );
  const generatedPackages = manifest.artifacts.filter(
    (artifact) => artifact.name !== 'create-alkemist',
  );
  for (const artifact of generatedPackages) {
    assert.equal(
      generatedManifest.dependencies?.[artifact.name],
      manifest.version,
      `Generated starter must request ${artifact.name}@${manifest.version}`,
    );
    if (!registryMode)
      generatedManifest.dependencies[artifact.name] =
        `file:${join(output, artifact.filename)}`;
  }
  if (!registryMode)
    await write(
      'generated/package.json',
      JSON.stringify(generatedManifest, null, 2) + '\n',
    );
  runNpm(['install', '--no-audit', '--no-fund'], generated);
  runNpm(['run', 'verify'], generated);
  console.log(
    `${registryMode ? 'Published' : 'Packed'} create-alkemist generated and verified a fresh ${registryMode ? 'registry-backed' : 'tarball-backed'} site.`,
  );
  console.log(
    'Package consumers passed: standalone components, public prop types, theme isolation, host MDX/processor, strict math, registry-compatible dependency graph and lockfile reinstall.',
  );
} finally {
  if (keep) console.log(`Consumer retained for browser review: ${temporary}`);
  else await rm(temporary, { recursive: true, force: true });
}
