# @alkemdotdev/alkemist-components

Astro components for technical publishing: `Layout`, `Math`, `Code`,
`Chart`, `Model`, `Shader`, `PostList`, and `Search`.

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

`Search` is available from `@alkemdotdev/alkemist-components/search`. Enable `alkemist({ search: true })` to build a Pagefind index, then use `<Layout search>` or add `<Search />` to your own layout. Test with a production build and preview. See the [search guide](https://alkemist.alkem.dev/docs/search/).
