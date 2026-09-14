# @alkemdotdev/alkemist-components

## 1.0.0-beta.2

### Major Changes

- aa9f587: Replace prefixed component and TypeScript names with plain names and direct extensionless component entry points. Each component entry exports its default component plus related types and helpers. Remove the component root barrel and all prefixed import paths. Separate pure helpers from browser initialization. Update the integration, theme types, site, starter, documentation, and consumers to the new API. CSS variables, classes, and custom-element tags retain their global alk namespace.

### Minor Changes

- 708d6e1: Add Audio and Video components with shared Media Chrome controls, caption and speed selection, chapter navigation, transcripts, downloads, scoped theme styling, and progressive native playback fallback. Include live parameter playgrounds and standalone Astro/MDX examples.
- 9b2c266: Make scientific figures, media players, post lists, and documentation playgrounds more useful in narrow embeds. Group secondary model and media controls, size canvases by their containers, preserve normal page scrolling over models, and scope search styles to each instance. Add optional Playground previewHeight for intentionally scrolling previews, and reduce excess math/code framing.
- f82ee8a: Add a reusable Playground with live parameter controls, presets, generated source, and isolated preview frames. Share component markup renderers between Astro output and live examples, and make search initialization safe across rerenders.

  Honor explicit search-exclusion markers on embedded preview documents.

  Make preview controls compact and add rich Code authoring: focus, additions/removals, text highlights, annotations, and collapsible ranges. Keep filenames and Copy in a compact code header, preserving full source when copying folded listings.

- f82ee8a: Support text-child authoring in Code alongside exact source props. Automatically attach scoped presentation and Copy behavior for Markdown fences through the Astro integration, without requiring the Alkemist Layout.
- 4dd281f: Add a reusable MIDI piano-roll editor, original musical presets, local synthesized voices, and MIDI import/export. A compact toolbar supports drawing, moving, resizing, and erasing notes directly. Playground can prioritize interactive previews with collapsible source and parameters.
- f82ee8a: Add reusable nested Navigation and TableOfContents components with current-page selection, subsection indentation, and per-instance section tracking.
- 452a10e: Add PostList with compact rows, a featured lead, an image grid, and a featured lead above a grid. Export typed content and layout props, support explicit featured selection, and offer an optional reader layout selector. Use the component in the source starter with site-owned defaults.
- 6612d5b: Add reusable site search with a header control, keyboard access, and static Pagefind indexing. Enable search in generated starters and introduce automated canary publication from verified main revisions.

### Patch Changes

- Updated dependencies [aa9f587]
- Updated dependencies [9b2c266]
- Updated dependencies [f82ee8a]
- Updated dependencies [f82ee8a]
- Updated dependencies [8a3df37]
  - @alkemdotdev/alkemist-theme@1.0.0-beta.2

## 1.0.0-beta.1

Individual Astro components for math, code, charts, models, shaders, and complete layouts. Standalone figures use local styles and lazy browser engines.
