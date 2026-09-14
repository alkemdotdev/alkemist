# create-alkemist

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
