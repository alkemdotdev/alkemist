# @alkemdotdev/alkemist-astro

The Alkemist Astro integration enables MDX, secure KaTeX rendering, and Shiki
code presentation defaults. Markdown fences in `.md` and `.mdx` share the
Alkemist Code renderer, including highlights, folding, and Copy. The integration
includes scoped math/code CSS and the Copy script, so these work inside an
existing site’s own layout without importing a component. It does not import
the full theme or reset the host’s typography.

```ts
import { defineConfig } from 'astro/config';
import alkemist from '@alkemdotdev/alkemist-astro';

export default defineConfig({ integrations: [alkemist()] });
```

Use `mdx: false` when a host site already installs MDX. Use `math: false` when
a host site owns a custom Markdown processor. Math keeps
`trust: false`, strict errors, and bounded expansion; those safety defaults are
not configurable through this integration. Vite asset inlining is left to the
host unless `vite: { assetsInlineLimit: 0 }` is passed.

Licensed under [Apache-2.0](./LICENSE).

Ordinary Markdown headings, lists, links, tables, and images stay semantic HTML.
Use the Alkemist theme for their typography; use explicit components for richer
behavior. Set `code: false` to retain the host's code rendering and omit the
Copy script. With both `math: false` and `code: false`, no presentation assets
are injected. Asset injection uses Astro's standard
[integration hooks](https://docs.astro.build/en/reference/integrations-reference/#injectscript-option).
