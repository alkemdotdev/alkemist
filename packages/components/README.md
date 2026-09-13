# @alkemdotdev/alkemist-components

Astro components for technical publishing: `Layout`, `Math`, `Code`,
`Chart`, `Model`, `Shader`, `PostList`, `Search`, `Navigation`, and
`TableOfContents`.

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

`Navigation` accepts recursive `{ label, href, children? }` items and a
`currentPath`; it shows one child level by default and expands deeper branches containing the current page. Set `expandedDepth` to change the initial depth. Pass `headings` to display the current page’s table of contents directly beneath its link. Import it
from `@alkemdotdev/alkemist-components/navigation`.

`TableOfContents` accepts `{ depth, slug, text }` headings, renders depths 2–4,
and updates each rendered instance as the reader scrolls. Import it from
`@alkemdotdev/alkemist-components/table-of-contents`.

### Interactive examples

`/playground` exports `Playground`, its definition/control types, and source and validation helpers. Supply a declarative definition and a same-origin preview URL. The shell offers preview, highlighted source, dense parameter controls, presets, and reset. The adopting site owns the trusted preview frame and its renderer. See `/docs/playground/` in the demo site for the revision-checked message contract and a complete example.

The catalog is organized as Content, Visualization, Graphics, and Website. These are documentation categories within this package. Standard HTML/media specimens use native elements and the shared theme; they do not introduce wrapper components.

`Code` shares its Shiki transformer with Markdown fences. Use `highlightLines`,
`focusLines`, `addedLines`, `removedLines`, `highlightText`, `collapsedRanges`,
and `annotations` to explain source; `wrap` controls long lines. Copy includes
all original source, including folded sections. Types such as `CodeAnnotation`
and `CollapsedCodeRange` are exported from `/code`.

Code snippets can be authored as text children: `<Code>const answer = 42;</Code>`.
For braces, tags, or multiline source, use a string child such as
``<Code>{String.raw`const object = { value: 42 };`}</Code>``. Slots decode text
once and remove surrounding blank lines and common indentation. Use
`code={source}` for imported or generated source with exact whitespace.
