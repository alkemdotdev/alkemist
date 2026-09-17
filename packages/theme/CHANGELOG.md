# @alkemdotdev/alkemist-theme

## 1.0.0-beta.3

### Minor Changes

- 6409d08: Add Markdown-first browser slides, shared notes and steps, Mermaid diagrams, and presentation-aware widget activation. Include a default Slides collection and routes in the starter, with readable documents and existing interactive components in the same deck.
- 1416e88: Open presentations as readable documents by default, with a clear Present action, reading-position restoration, and one mounted content tree. Add opt-in `present: true` article compilation at H2 headings and thematic rules, preserving ordinary footnotes and Markdown. Support presentable posts in the site and generated starter, with a responsive reading column and contextual controls.
- 86a9412: Add native presentation capabilities with synchronized audience windows, opt-in wake locks, attached-display selection, floating speaker notes, and experimental casting. Add reusable local text annotations with portable W3C JSON exports, and expose consistent Slides configuration in generated sites.
- b806db3: Add an immersive browser presentation workspace with overview, speaker controls, keyboard help, pointer, blackout, and optional timed advance. Reflow slide content responsively, infer layouts from ordinary Markdown and shared widgets, and expose deck themes, CSS styling hooks, optional aspect ratios, and validated layout comments. Include slide covers and an illustrated starter.
- 09d811a: Separate article and deck reading layouts behind shared Presentation controls. Add Deck and Slide entries, canonical presentations integration and format: deck aliases, while preserving Slides imports and existing slides routes.

  Add paginated prepared chart data with CSV, SVG, and PNG exports, preserve chart zoom across compatible updates, and expose Model camera/wireframe parameters without reloading the scene. Document shared themes and parameters with updated examples and starter routes.

- 4f36441: Share Neutral, Paper, Chalk, and Blueprint styles between pages and presentations, independently of light/dark mode. Add validated live Shader and Chart parameters, reusable native figure focus that preserves the mounted widget, and simpler presentation controls. Generated sites accept the shared theme and color-mode frontmatter.

### Patch Changes

- d2865b9: Give Present the full page area with the toolbar and navigation hidden by default. Add an accessible corner control and C shortcut to reveal the bars as overlays without resizing slides or live figures. Keep native browser fullscreen opt-in.

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
