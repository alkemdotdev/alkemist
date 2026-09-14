import test from 'node:test';
import assert from 'node:assert/strict';
import alkemist from '../packages/astro/src/index.ts';

async function setup(options) {
  const scripts = [];
  let config;
  await alkemist(options).hooks['astro:config:setup']({
    injectScript: (stage, content) => scripts.push({ stage, content }),
    updateConfig: (value) => {
      config = value;
    },
  });
  return { scripts, config };
}

test('Markdown rendering includes scoped presentation and copy without a Layout', async () => {
  const { scripts, config } = await setup();
  assert(
    scripts.some(
      (s) => s.stage === 'page-ssr' && s.content.includes('/math-code.css'),
    ),
  );
  assert(
    scripts.some((s) => s.stage === 'page' && s.content.includes('/code-copy')),
  );
  assert(!scripts.some((s) => s.content.includes('/theme.css')));
  assert.equal(config.markdown.syntaxHighlight.type, 'shiki');
  assert.equal(
    config.markdown.shikiConfig.transformers[0].name,
    'alkemist-code',
  );
});

test('host opt-outs preserve ownership of styles, scripts, MDX, and Markdown', async () => {
  const { scripts, config } = await setup({
    code: false,
    math: false,
    mdx: false,
  });
  assert.deepEqual(scripts, []);
  assert.deepEqual(config.markdown, {});
  assert.equal(config.integrations, undefined);
  const mathOnly = await setup({ code: false });
  assert.equal(mathOnly.scripts.length, 1);
  assert.equal(mathOnly.scripts[0].stage, 'page-ssr');
});

test('slides are opt-in and configure both Markdown and MDX AST transforms', async () => {
  const disabled = await setup();
  assert.equal(
    disabled.config.markdown.processor.options.remarkPlugins.length,
    1,
  );
  const enabled = await setup({ slides: true });
  assert.equal(
    enabled.config.markdown.processor.options.remarkPlugins[1].name,
    'remarkAlkemistSlides',
  );
  assert.equal(
    enabled.config.markdown.processor.options.rehypePlugins.at(-1).name,
    'rehypeAlkemistSlides',
  );
  assert(
    enabled.config.markdown.syntaxHighlight.excludeLangs.includes('mermaid'),
  );
  assert(
    enabled.scripts.some(
      (script) =>
        script.stage === 'page-ssr' && script.content.includes('/slides.css'),
    ),
  );
  assert(
    enabled.scripts.some(
      (script) =>
        script.stage === 'page' && script.content.includes('/diagram-client'),
    ),
  );
  assert.equal(enabled.config.integrations[0].name, '@astrojs/mdx');
});
