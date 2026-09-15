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

async function renderIntegrated(
  value,
  frontmatter = { format: 'slides' },
  options = { presentations: true },
) {
  let config;
  await alkemist(options).hooks['astro:config:setup']({
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

test('presentations is the canonical compiler option and slides is compatible', async () => {
  const source = '# First\n\n---\n\n# Second';
  const canonical = await renderIntegrated(source, { format: 'deck' });
  const compatibility = await renderIntegrated(
    source,
    { format: 'slides' },
    { slides: true },
  );
  const explicitAlias = await renderIntegrated(
    source,
    { format: 'deck' },
    { presentations: true, slides: true },
  );
  assert.equal(canonical, compatibility);
  assert.equal(canonical, explicitAlias);
  assert.throws(
    () => alkemist({ presentations: true, slides: false }),
    /presentations and slides must agree/,
  );
});

test('format deck is canonical and format slides retains deck compilation', async () => {
  const source = '# First\n\n---\n\n# Second';
  const canonical = await render(source, { format: 'deck' });
  const compatibility = await render(source, { format: 'slides' });
  assert.equal(canonical, compatibility);
  assert.equal((canonical.match(/data-alk-slide/g) ?? []).length, 2);
});

test('slide layout comments are optional, scoped, and validated', async () => {
  const html = await render(
    '# First\n\n<!-- layout: split -->\n\n![Figure](figure.svg)\n\n---\n\n# Second',
  );
  assert.match(html, /id="slide-first"[^>]*data-layout="split"/);
  assert.match(html, /id="slide-second"[^>]*data-layout="auto"/);
  assert.doesNotMatch(html, /alk-slide-layout/);
  await assert.rejects(
    render('# Wrong\n\n<!-- layout: unknown -->'),
    /Unknown slide layout/,
  );
  await assert.rejects(
    render('# Conflicting\n\n<!-- layout: split -->\n\n<!-- layout: media -->'),
    /more than one layout/,
  );
  assert.doesNotMatch(
    await render('# Article\n\n<!-- layout: split -->', {}),
    /data-layout/,
  );
});

test('MDX layout comments retain component bindings and fenced examples remain code', async () => {
  const file = new VFile({
    value:
      '# A figure\n\n{/* layout: media */}\n\n<Chart src="/data.csv" title="Signal" />',
    data: { astro: { frontmatter: { format: 'slides' } } },
  });
  const code = String(
    await compile(file, {
      remarkPlugins: [remarkAlkemistSlides],
      rehypePlugins: [rehypeAlkemistSlides],
    }),
  );
  assert.match(code, /"data-layout": "media"/);
  assert.match(code, /import Chart from/);
  const html = await render('# Syntax\n\n```html\n<!-- layout: split -->\n```');
  assert.match(html, /data-layout="auto"/);
  assert.match(html, /<code class="language-html">&#x3C;!-- layout: split -->/);
});

test('a deck splits only parsed top-level thematic breaks', async () => {
  const html = await render(
    `# First\n\n\`\`\`md\n---\n\`\`\`\n\n- outer\n  - ---\n\n---\n\n# Second`,
  );
  assert.match(html, /<section data-alk-slide="" id="slide-first"/);
  assert.match(html, /<section data-alk-slide="" id="slide-second"/);
  assert.equal((html.match(/data-alk-slide/g) ?? []).length, 2);
  assert.match(html, /<code class="language-md">---/);
});

test('present articles partition a preamble at top-level H2 headings while retaining nested content', async () => {
  const html = await render(
    '# Article title\n\nPreamble.\n\n## First section\n\n### Detail\n\nBody.\n\n## Second section\n\nClosing.',
    { present: true },
  );
  assert.equal((html.match(/<section data-alk-slide=""/g) ?? []).length, 3);
  assert.match(
    html,
    /<section data-alk-slide="" id="presentation-intro"><h1 id="article-title">/,
  );
  assert.match(
    html,
    /<section data-alk-slide="" id="presentation-first-section"><h2 id="first-section">First section<\/h2>\n<h3 id="detail">Detail<\/h3>/,
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('present is an explicit article opt-in and leaves ordinary Markdown untouched otherwise', async () => {
  for (const frontmatter of [{}, { present: false }]) {
    const html = await render('# Article\n\n## Section\n\nText', frontmatter);
    assert.doesNotMatch(html, /data-alk-slide/);
    assert.match(html, /<h2 id="section">Section<\/h2>/);
  }
  const deck = await render('# Deck\n\n---\n\n# End', {
    format: 'slides',
    present: true,
  });
  assert.equal((deck.match(/data-alk-slide/g) ?? []).length, 2);
  assert.doesNotMatch(deck, /data-alk-presentation-break/);
});

test('an H2-less present article still renders as one slide section', async () => {
  const html = await render('# Article\n\nOnly the introduction is here.', {
    present: true,
  });
  assert.match(html, /<section data-alk-slide="" id="presentation-intro">/);
  assert.equal((html.match(/data-alk-slide/g) ?? []).length, 1);
});

test('authored top-level rules stay visible in Read and partition present articles', async () => {
  const html = await render(
    `# Article

Before.

\`\`\`md
---
\`\`\`

- outer
  - ---

---

After.`,
    { present: true },
  );
  assert.equal((html.match(/<section data-alk-slide=""/g) ?? []).length, 2);
  assert.match(html, /<hr data-alk-presentation-break="">/);
  assert.match(html, /<code class="language-md">---/);
  assert.match(html, /<li>outer\n<hr>\n<\/li>/);
  assert.equal((html.match(/data-alk-presentation-break/g) ?? []).length, 1);
});

test('a rule immediately before H2 does not manufacture a whitespace-only slide', async () => {
  const html = await render(
    '# Article\n\nBefore.\n\n---\n\n## Detail\n\nAfter.',
    {
      present: true,
    },
  );
  assert.equal((html.match(/<section data-alk-slide=""/g) ?? []).length, 2);
  assert.match(
    html,
    /data-alk-presentation-break=""><\/section><section data-alk-slide="" id="presentation-detail">\n<h2/,
  );
});

test('present article footnotes retain one trailing definition block and their original identifiers', async () => {
  const html = await render(
    `# Article[^source]

## Detail

More text.[^second]

[^source]: First source.
[^second]: Second source.`,
    { present: true },
  );
  assert.equal(
    (html.match(/<section data-footnotes class="footnotes">/g) ?? []).length,
    1,
  );
  assert.match(html, /id="user-content-fnref-source"/);
  assert.match(html, /href="#user-content-fn-source"/);
  assert.match(html, /id="user-content-fn-source"/);
  assert.match(html, /id="user-content-fn-second"/);
  assert.doesNotMatch(html, /alk-slide-\d+-(?:source|second)/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('MDX present articles preserve bindings without deck built-in imports', async () => {
  const compiled = String(
    await compile(
      new VFile({
        value: `export const value = 2;

# Article

<Chart value={value} />

## Detail

{value}`,
        data: { astro: { frontmatter: { present: true } } },
      }),
      {
        remarkPlugins: [remarkAlkemistSlides],
        rehypePlugins: [rehypeAlkemistSlides],
        jsxImportSource: 'astro',
      },
    ),
  );
  assert.match(compiled, /export const value = 2/);
  assert.match(compiled, /_jsx\(Chart/);
  assert.match(compiled, /data-alk-slide/);
  assert.doesNotMatch(compiled, /alkemist-components\/chart/);
});

test('leading MDX imports remain with the first H2 instead of creating an empty preamble slide', async () => {
  const compiled = String(
    await compile(
      new VFile({
        value: `import Chart from './chart.astro';

## Detail

<Chart />`,
        data: { astro: { frontmatter: { present: true } } },
      }),
      {
        remarkPlugins: [remarkAlkemistSlides],
        rehypePlugins: [rehypeAlkemistSlides],
        jsxImportSource: 'astro',
      },
    ),
  );
  assert.match(compiled, /import Chart from '\.\/chart\.astro';/);
  assert.equal((compiled.match(/data-alk-slide/g) ?? []).length, 1);
  assert.match(compiled, /id: "presentation-detail"/);
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

test('rehomed footnote markers retain the generated reference number', async () => {
  const html = await render(
    `# First[^a]\n\n---\n\n# Second[^c]\n\n[^a]: Uses nested[^b].\n\n[^b]: Nested note.\n\n[^c]: Second source.`,
  );
  const references = [
    ...html.matchAll(
      /href="#user-content-fn-([^"]+)" id="user-content-fnref-[^"]+"[^>]*>(\d+)</g,
    ),
  ];
  assert(references.length >= 3);
  for (const [, identifier, number] of references) {
    const definition = new RegExp(
      `<li id="user-content-fn-${identifier}" value="(\\d+)">`,
    ).exec(html);
    assert(definition, `missing local definition for ${identifier}`);
    assert.equal(definition[1], number, `${identifier} marker must match ref`);
  }
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
