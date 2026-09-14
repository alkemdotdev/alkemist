# @alkemdotdev/alkemist-astro

## 1.0.0-beta.2

### Major Changes

- aa9f587: Replace prefixed component and TypeScript names with plain names and direct extensionless component entry points. Each component entry exports its default component plus related types and helpers. Remove the component root barrel and all prefixed import paths. Separate pure helpers from browser initialization. Update the integration, theme types, site, starter, documentation, and consumers to the new API. CSS variables, classes, and custom-element tags retain their global alk namespace.

### Minor Changes

- f82ee8a: Support text-child authoring in Code alongside exact source props. Automatically attach scoped presentation and Copy behavior for Markdown fences through the Astro integration, without requiring the Alkemist Layout.
- 6612d5b: Add reusable site search with a header control, keyboard access, and static Pagefind indexing. Enable search in generated starters and introduce automated canary publication from verified main revisions.

### Patch Changes

- f82ee8a: Add a reusable Playground with live parameter controls, presets, generated source, and isolated preview frames. Share component markup renderers between Astro output and live examples, and make search initialization safe across rerenders.

  Honor explicit search-exclusion markers on embedded preview documents.

  Make preview controls compact and add rich Code authoring: focus, additions/removals, text highlights, annotations, and collapsible ranges. Keep filenames and Copy in a compact code header, preserving full source when copying folded listings.

- Updated dependencies [708d6e1]
- Updated dependencies [aa9f587]
- Updated dependencies [9b2c266]
- Updated dependencies [f82ee8a]
- Updated dependencies [f82ee8a]
- Updated dependencies [4dd281f]
- Updated dependencies [f82ee8a]
- Updated dependencies [8a3df37]
- Updated dependencies [452a10e]
- Updated dependencies [6612d5b]
  - @alkemdotdev/alkemist-components@1.0.0-beta.2
  - @alkemdotdev/alkemist-theme@1.0.0-beta.2

## 1.0.0-beta.1

Configurable MDX, strict math, and code highlighting with explicit opt-outs for existing sites.
