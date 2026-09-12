# @alkemdotdev/alkemist-components

Astro components for technical publishing: `Layout`, `Math`, `Code`,
`Chart`, `Model`, `Shader`, and `PostList`.

Each component has a lowercase, extensionless public entry. Import its types
from the same entry; there is no root component barrel.

Import a component directly, for example:

```astro
---
import Chart from '@alkemdotdev/alkemist-components/chart';
---
```

`Layout` imports the full `@alkemdotdev/alkemist-theme/theme.css` theme. The standalone
math, code, chart, model, and shader components include scoped fallback tokens,
so they can be used in an existing site without the global reset.

Licensed under [Apache-2.0](./LICENSE).
