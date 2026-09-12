# @alkemdotdev/alkemist-astro

The Alkemist Astro integration enables MDX, secure KaTeX rendering, and Shiki
code presentation defaults.

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
