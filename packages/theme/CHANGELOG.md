# @alkemdotdev/alkemist-theme

## 1.0.0-beta.2

### Major Changes

- aa9f587: Replace prefixed component and TypeScript names with plain names and direct extensionless component entry points. Each component entry exports its default component plus related types and helpers. Remove the component root barrel and all prefixed import paths. Separate pure helpers from browser initialization. Update the integration, theme types, site, starter, documentation, and consumers to the new API. CSS variables, classes, and custom-element tags retain their global alk namespace.

### Patch Changes

- 9b2c266: Make scientific figures, media players, post lists, and documentation playgrounds more useful in narrow embeds. Group secondary model and media controls, size canvases by their containers, preserve normal page scrolling over models, and scope search styles to each instance. Add optional Playground previewHeight for intentionally scrolling previews, and reduce excess math/code framing.
- f82ee8a: Add a reusable Playground with live parameter controls, presets, generated source, and isolated preview frames. Share component markup renderers between Astro output and live examples, and make search initialization safe across rerenders.

  Honor explicit search-exclusion markers on embedded preview documents.

  Make preview controls compact and add rich Code authoring: focus, additions/removals, text highlights, annotations, and collapsible ranges. Keep filenames and Copy in a compact code header, preserving full source when copying folded listings.

- f82ee8a: Support text-child authoring in Code alongside exact source props. Automatically attach scoped presentation and Copy behavior for Markdown fences through the Astro integration, without requiring the Alkemist Layout.
- 8a3df37: Give numbered code a consistent 1.5-character gap before the source, with an aligned gutter for ordinary and diff-marked lines at desktop and mobile widths.

## 1.0.0-beta.1

Opt-in full theme, token-only CSS, eight-ink palette, and theme preference helpers.
