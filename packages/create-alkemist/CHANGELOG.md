# create-alkemist

## 1.0.0-beta.3

### Minor Changes

- 6409d08: Add Markdown-first browser slides, shared notes and steps, Mermaid diagrams, and presentation-aware widget activation. Include a default Slides collection and routes in the starter, with readable documents and existing interactive components in the same deck.
- 1416e88: Open presentations as readable documents by default, with a clear Present action, reading-position restoration, and one mounted content tree. Add opt-in `present: true` article compilation at H2 headings and thematic rules, preserving ordinary footnotes and Markdown. Support presentable posts in the site and generated starter, with a responsive reading column and contextual controls.
- 86a9412: Add native presentation capabilities with synchronized audience windows, opt-in wake locks, attached-display selection, floating speaker notes, and experimental casting. Add reusable local text annotations with portable W3C JSON exports, and expose consistent Slides configuration in generated sites.
- b806db3: Add an immersive browser presentation workspace with overview, speaker controls, keyboard help, pointer, blackout, and optional timed advance. Reflow slide content responsively, infer layouts from ordinary Markdown and shared widgets, and expose deck themes, CSS styling hooks, optional aspect ratios, and validated layout comments. Include slide covers and an illustrated starter.
- 09d811a: Separate article and deck reading layouts behind shared Presentation controls. Add Deck and Slide entries, canonical presentations integration and format: deck aliases, while preserving Slides imports and existing slides routes.

  Add paginated prepared chart data with CSV, SVG, and PNG exports, preserve chart zoom across compatible updates, and expose Model camera/wireframe parameters without reloading the scene. Document shared themes and parameters with updated examples and starter routes.

- 4f36441: Share Neutral, Paper, Chalk, and Blueprint styles between pages and presentations, independently of light/dark mode. Add validated live Shader and Chart parameters, reusable native figure focus that preserves the mounted widget, and simpler presentation controls. Generated sites accept the shared theme and color-mode frontmatter.

## 1.0.0-beta.2

### Major Changes

- aa9f587: Replace prefixed component and TypeScript names with plain names and direct extensionless component entry points. Each component entry exports its default component plus related types and helpers. Remove the component root barrel and all prefixed import paths. Separate pure helpers from browser initialization. Update the integration, theme types, site, starter, documentation, and consumers to the new API. CSS variables, classes, and custom-element tags retain their global alk namespace.

### Minor Changes

- 4ef04e2: Provide site-owned, optional Blog, Logs, Labs, Docs, and Book sections with configurable navigation, quick-note publishing, and an ordered tutorial. Add optional blog thumbnails and article covers with local image sources, accessible descriptions, crop/contain controls, and focal points. Existing generated sites retain their files; adopt these scaffold changes explicitly.
- 452a10e: Add PostList with compact rows, a featured lead, an image grid, and a featured lead above a grid. Export typed content and layout props, support explicit featured selection, and offer an optional reader layout selector. Use the component in the source starter with site-owned defaults.
- 6612d5b: Add reusable site search with a header control, keyboard access, and static Pagefind indexing. Enable search in generated starters and introduce automated canary publication from verified main revisions.

### Patch Changes

- f91aeee: Update generated-site agent instructions to use headings directly without decorative eyebrows or kickers.

## 1.0.0-beta.1

Standalone generator with a bundled template, release-matched dependency pins, and independent site ownership.
