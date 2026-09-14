import test from 'node:test';
import assert from 'node:assert/strict';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { compile } from '@mdx-js/mdx';
import { VFile } from 'vfile';
import {
  injectSlideBuiltinImports,
  rehypeAlkemistSlides,
  remarkAlkemistSlides,
} from '../packages/astro/src/slides.ts';
import alkemist from '../packages/astro/src/index.ts';

async function render(value, frontmatter = { format: 'slides' }) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkAlkemistSlides)
    .use(remarkRehype)
    .use(rehypeAlkemistSlides)
    .use(rehypeHeadingIds)
    .use(rehypeStringify);
  return String(
    await processor.process({ value, data: { astro: { frontmatter } } }),
  );
}

async function renderIntegrated(value, frontmatter = { format: 'slides' }) {
  let config;
  await alkemist({ slides: true }).hooks['astro:config:setup']({
    injectScript() {},
    updateConfig(value) {
      config = value;
    },
  });
  const processor = await config.markdown.processor.createRenderer(
    config.markdown,
  );
  return (await processor.render(value, { frontmatter })).code;
}

test('a deck splits only parsed top-level thematic breaks', async () => {
  const html = await render(
    `# First\n\n\`\`\`md\n---\n\`\`\`\n\n- outer\n  - ---\n\n---\n\n# Second`,
  );
  assert.match(html, /<section data-alk-slide="" id="slide-first"/);
  assert.match(html, /<section data-alk-slide="" id="slide-second"/);
  assert.equal((html.match(/data-alk-slide/g) ?? []).length, 2);
  assert.match(html, /<code class="language-md">---/);
});

test('slide footnotes are local even when definitions are conventionally trailing', async () => {
  const html = await render(
    `# First[^one]\n\n---\n\n# Second[^two]\n\n[^one]: First source.\n[^two]: Second source.`,
  );
  assert.equal((html.match(/data-alk-slide/g) ?? []).length, 2);
  assert.match(html, /id="user-content-fnref-alk-slide-1-one"/);
  assert.match(html, /id="user-content-fnref-alk-slide-2-two"/);
  const secondSlide = html.indexOf('id="slide-second"');
  assert(html.slice(0, secondSlide).includes('First source.'));
  assert(!html.slice(0, secondSlide).includes('Second source.'));
  assert(html.slice(secondSlide).includes('Second source.'));
  assert(!html.slice(secondSlide).includes('First source.'));
  assert.match(html, /aria-describedby="footnote-label-1"/);
  assert.match(html, /aria-describedby="footnote-label-2"/);
  assert.match(html, /<aside data-footnotes="" class="footnotes"/);
  assert.doesNotMatch(html, /<section data-footnotes=/);
});

test('a repeated footnote reference gets a local definition and backreference per slide', async () => {
  const html = await render(
    `# First[^source]\n\n---\n\n# Second[^source]\n\n[^source]: Repeated source.`,
  );
  assert.match(html, /id="user-content-fn-alk-slide-1-source"/);
  assert.match(html, /id="user-content-fn-alk-slide-2-source"/);
  assert.match(html, /href="#user-content-fnref-alk-slide-1-source"/);
  assert.match(html, /href="#user-content-fnref-alk-slide-2-source"/);
});

test('transitive footnotes stay within the current slide with local references', async () => {
  const html = await render(
    `# Test[^a]\n\n---\n\n# Again[^a]\n\n[^a]: Uses second[^b].\n\n[^b]: Nested note`,
  );
  for (const slide of [1, 2]) {
    assert.match(html, new RegExp(`fn-alk-slide-${slide}-a`));
    assert.match(html, new RegExp(`fn-alk-slide-${slide}-b`));
    assert.match(html, new RegExp(`fnref-alk-slide-${slide}-b`));
  }
  assert.equal((html.match(/Nested note/g) ?? []).length, 2);
});

test('incremental decks use fragment classes independent of Markdown markers', async () => {
  const html = await render(`# Incremental\n\n* first\n* second`, {
    format: 'slides',
    incremental: true,
  });
  assert.equal((html.match(/class="fragment"/g) ?? []).length, 2);
});

test('Markdown notes directives become semantic speaker notes with Markdown content', async () => {
  const html = await render(
    `# Talk\n\n<!-- notes: Read the **bold** detail. -->`,
  );
  assert.match(html, /<aside class="notes" data-alk-speaker-notes="">/);
  assert.match(html, /Read the <strong>bold<\/strong> detail\./);
});

test('Markdown notes render raw HTML as escaped text', async () => {
  const html = await render(
    `# Talk\n\n<!-- notes: <script>alert('unsafe')</script> -->`,
  );
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /alert\('unsafe'\)/);
});

test('slide IDs do not collide with heading IDs or duplicate titles', async () => {
  const html = await render(`# Same\n\n---\n\n# Same`);
  assert.match(html, /<section data-alk-slide="" id="slide-same"/);
  assert.match(html, /<section data-alk-slide="" id="slide-same-2"/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('integrated heading IDs are reserved before section and footnote allocation', async () => {
  const html = await renderIntegrated(`# Test\n\n---\n\n# Slide test`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /<section data-alk-slide="" id="slide-test-2"/);

  const footnoteHtml = await renderIntegrated(
    `# Footnote label 2\n\n---\n\n# Uses note[^a]\n\n[^a]: Note`,
  );
  const footnoteIds = [...footnoteHtml.matchAll(/\sid="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(footnoteIds).size, footnoteIds.length);
  assert.match(footnoteHtml, /aria-describedby="footnote-label-2-2"/);
});

test('callouts and Mermaid receive safe semantic fallbacks when slides are enabled', async () => {
  const html = await render(
    `> [!WARNING]\n> Careful.\n\n\`\`\`mermaid\ngraph TD\n  A --> B\n\`\`\``,
    {},
  );
  assert.match(
    html,
    /<aside class="alk-callout alk-callout-warning" data-callout="warning">/,
  );
  assert.match(html, /<alk-diagram source="graph TD\n  A --> B\n">/);
  assert.match(html, /<pre><code class="language-mermaid">graph TD/);
});

test('the integrated Markdown processor excludes Mermaid from Shiki before diagram compilation', async () => {
  let config;
  await alkemist({ slides: true }).hooks['astro:config:setup']({
    injectScript() {},
    updateConfig(value) {
      config = value;
    },
  });
  const processor = await config.markdown.processor.createRenderer(
    config.markdown,
  );
  const rendered = await processor.render(
    '```mermaid\ngraph TD\n  A --> B\n```',
    {
      frontmatter: { format: 'slides' },
    },
  );
  assert.match(rendered.code, /<alk-diagram/);
  assert.match(rendered.code, /<pre><code class="language-mermaid">/);
  assert.doesNotMatch(rendered.code, /class="astro-code"/);
});

test('MDX built-ins are injected only for unbound referenced names', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'mdxjsEsm',
        value: "import Chart from './local.astro';",
        data: {
          estree: {
            body: [
              {
                type: 'ImportDeclaration',
                specifiers: [{ local: { type: 'Identifier', name: 'Chart' } }],
              },
            ],
          },
        },
      },
      { type: 'mdxJsxFlowElement', name: 'Chart', children: [] },
      { type: 'mdxJsxFlowElement', name: 'Model', children: [] },
    ],
  };
  injectSlideBuiltinImports(tree);
  const imports = tree.children
    .filter((node) => node.type === 'mdxjsEsm')
    .map((node) => node.value)
    .join('\n');
  assert.doesNotMatch(imports, /alkemist-components\/chart/);
  assert.match(imports, /alkemist-components\/model/);
});

test('MDX decks compile built-ins and slide sections through the real MDX pipeline', async () => {
  const compiled = String(
    await compile(
      new VFile({
        value: '# Model\n\n<Model src="/model.glb" />\n\n---\n\n# End',
        data: { astro: { frontmatter: { format: 'slides' } } },
      }),
      {
        remarkPlugins: [remarkAlkemistSlides],
        rehypePlugins: [rehypeAlkemistSlides],
        jsxImportSource: 'astro',
      },
    ),
  );
  assert.match(compiled, /alkemist-components\/model/);
  assert.match(compiled, /data-alk-slide/);
  assert.match(compiled, /id: "slide-model"/);
});

test('MDX binding detection uses parsed imports and declarations, never comment text', async () => {
  const compiled = String(
    await compile(
      new VFile({
        value: `import {\n  local as Chart\n} from './custom.astro';
export const { Model } = source;
// import Diagram from './comment-only.astro';

<Chart />
<Model />
<Diagram />`,
        data: { astro: { frontmatter: { format: 'slides' } } },
      }),
      { remarkPlugins: [remarkAlkemistSlides], jsxImportSource: 'astro' },
    ),
  );
  assert.doesNotMatch(compiled, /alkemist-components\/chart/);
  assert.doesNotMatch(compiled, /alkemist-components\/model/);
  assert.match(compiled, /alkemist-components\/diagram/);
});
