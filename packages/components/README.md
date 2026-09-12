# @alkemdotdev/alkemist-components

Astro components for technical publishing: `AlkLayout`, `AlkMath`, `AlkCode`,
`AlkChart`, `AlkModel`, and `AlkShader`.

Import a component directly, for example:

```astro
---
import AlkChart from '@alkemdotdev/alkemist-components/AlkChart.astro';
---
```

`AlkLayout` imports the full `@alkemdotdev/alkemist-theme/theme.css` theme. The standalone
math, code, chart, model, and shader components include scoped fallback tokens,
so they can be used in an existing site without the global reset.

Licensed under [Apache-2.0](./LICENSE).
