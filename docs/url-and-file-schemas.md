# URL and file contracts

Status: **URL organization accepted; file and metadata contracts proposed**, September 8, 2026. The user selected Blog, Labs, and Info as primary sections, optional Docs, and one Test page. Those routes and configurable navigation are implemented in the accompanying change. Source-relative assets, stable entry IDs, and sidecar schemas below remain proposals.

## Recommendation

Use stable, readable page URLs; portable content folders; ordinary scientific file formats; and a small, versioned metadata layer. Keep content identity, public address, source location, asset meaning, and figure presentation distinct.

The trade-off is a little explicit metadata in exchange for reliable links, repeatable figures, useful validation, and upgrades that do not rewrite an author's work. Simple prose can remain one file. A folder and a figure definition are conveniences for richer content, not mandatory scaffolding for every page.

## What exists today

| Concern          | Current implementation                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page URLs        | `/`, `/blog/`, `/blog/{id}/`, `/labs/`, `/labs/{app}/`, `/slides/`, `/slides/{id}/`, `/info/`, `/docs/`, `/docs/{id}/`, `/docs/components/`, and `/test/`.                                                              |
| URL formatting   | Static Astro output, trailing slashes on pages, production canonical origin, query state excluded from canonical URLs. Branch previews use the same paths on another hostname.                                          |
| Content          | Docs and Blog use `.mdx`; the Slides collection accepts `.md` and `.mdx` under `src/content/slides/`. A deck requires `format: slides`; optional `incremental: true` enables list progression.                          |
| Identity         | Routes use the loader's entry ID, normally derived from the source path. Astro's default loader also honors raw `slug` frontmatter, but Alkemist does not explicitly declare or validate that field.                    |
| Frontmatter      | Both collections share required `title` and `description`, `order` defaulting to 100, and optional unvalidated string `date`.                                                                                           |
| Assets           | Files under `apps/site/public/` become unchanged public paths: for example `/test/oscillation.csv`, `/test/torus-knot.glb`, and `/notebook/eight-inks.jpg`. Astro bundles processed assets separately under `/_astro/`. |
| Component inputs | Charts fetch a URL and require explicit chart type, axes, title, and description. Models load a URL. Source-relative CSV/model resolution and metadata sidecars are not implemented.                                    |
| View state       | Design studies use allowlisted query parameters. The general board theme is a local browser preference. Other widget state does not yet have a shared URL contract.                                                     |
| Machine files    | `/build.json`, `/robots.txt`, and static asset downloads. No published Alkemist JSON Schemas or asset catalog yet.                                                                                                      |

The existing packages are `@alkemdotdev/alkemist-astro`, `@alkemdotdev/alkemist-components`, and `@alkemdotdev/alkemist-theme`; the demo owns its content and pages. `alkemist({ slides: true })` enables deck compilation; normal Markdown remains ordinary document content.

## Accepted public URLs and navigation

The primary bar is **Blog · Labs · Info · More ›**. In the demo, More contains Docs and Test page. These are ordinary navigation links, with a keyboard-accessible disclosure for More. The shared layout accepts `navigation`, `moreNavigation`, and `footerNavigation`; extra links default to empty. The demo's SiteLayout supplies its documentation links, so a consuming site can omit Docs without changing the package.

| Purpose                                               | Canonical pattern                   | Example                                                       |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Blog posts, news, development articles                | `/blog/{slug}/`                     | `/blog/foundation/`                                           |
| Interactive or usable apps                            | `/labs/{slug}/`                     | `/labs/interference/`                                         |
| Browser talks                                         | `/slides/{slug}/`                   | `/slides/working-with-a-signal/`                              |
| People, organization, company or project information  | `/info/` and nested pages as needed | `/info/`; future team bios could use `/info/team/{slug}/`.    |
| Documentation, component references, site conventions | `/docs/` and nested topics          | `/docs/components/`, `/docs/charts/`, `/docs/site-structure/` |
| One comprehensive test application                    | `/test/` with section anchors       | `/test/#math`                                                 |

Docs can be omitted entirely in a consuming site, or contain that project's own documentation. Alkemist's reference pages are demo content, not routes injected by the theme. A lab's interface lives under Labs; instructions for using its component live under Docs; an article explaining its development lives under Blog.

Rules:

- Lowercase, kebab-case path segments; trailing slash for pages; real extensions for files.
- `/blog/` replaces `/notebook/`. Explicit old page redirects preserve existing asset downloads such as `/notebook/eight-inks.jpg`.
- The component catalog moves from `/components/` to `/docs/components/`.
- The design apps move from `/design/studio/` and `/design/boards/` to `/labs/design-studio/` and `/labs/board-studies/`. Preserve shared query choices across deployment redirects.
- Omit dates from article URLs. Publication dates remain metadata.
- Use nested Info pages for team bios and organization information; do not add empty top-level Projects, Examples, or Team sections.
- Keep documentation URLs unversioned until multiple documentation versions are maintained. Preserve current reference URLs such as `/docs/charts/`; deeper topic groups can be introduced with explicit redirects when needed.
- The proposed machine contract remains `/schemas/v1/{name}.schema.json`, linked and explained from Docs. This endpoint is not implemented yet.
- Preserve `/build.json` and reserve `/_alkemist/` for future generated catalogs. Leave `/_astro/` to Astro.
- A published slide route has the same draft filter as Blog. A deck's read/present state is client-local; full-page presentation may use its fragment for navigation, while embedded decks do not own the page URL.
- Preview and production use identical paths. Branch names belong in preview hostnames.
- Changed published pages get permanent redirects. Validate redirect destinations, collisions, and loops, and retain published downloads.

## Content identity and folders

Give each entry an explicit, stable `id`, unique within its collection. Use a readable kebab-case ID, such as `energy-drift`; a random identifier is unnecessary. References identify both the collection and ID, such as `{ collection: 'blog', id: 'energy-drift' }`.

The route `slug` defaults to `id`. An optional explicit slug supports hierarchy: a docs entry can have `id: chart` and `slug: components/chart`. Moving source files or editing a title does not change either field. A custom loader `generateId` reads the explicit ID, and the route generator uses the separately validated slug. [Astro loader reference](https://docs.astro.build/en/reference/content-loader-reference/).

Recommended author-owned layout, relative to `apps/site/`:

```text
src/
  content/
    docs/components/chart/index.mdx
    blog/
      energy-drift/
        index.mdx
        data/
          run.csv
          run.csv.alk.yaml
        figures/
          displacement.figure.yaml
        images/
          apparatus.webp
        models/
          pendulum.glb
        references.bib
    info/team/cade/index.mdx
  assets/shared/
  pages/                         # bespoke Astro pages and route adapters
    labs/phase-space.astro
public/                          # intentionally stable, unprocessed public files
```

An asset-free article may instead be `blog/energy-drift.mdx`. Support both `.md` and `.mdx`, with identical content metadata. A folder entry uses `index.md` or `index.mdx`, but `index` never becomes part of its public URL. Loader patterns must exclude asset sidecars and figure definitions from article discovery. Duplicate IDs and duplicate normalized routes fail the build.

Use Markdown for prose, MDX when embedding components, Astro for page/layout implementation, and TypeScript for executable configuration or plugins. Preserve native CSV, JSON, GLB/glTF, GLSL/WGSL, image, and BibTeX files. YAML is the author-friendly metadata format; generated machine manifests use JSON. There is no proprietary replacement format for the underlying data.

## Entry metadata

Use a shared base plus collection-specific schemas, rather than one collection schema with every possible optional field.

Proposed blog frontmatter:

```yaml
schemaVersion: 1
id: energy-drift
title: Why the integrator gains energy
description: Comparing two integrators on a synthetic pendulum trajectory.
published: '2026-09-08'
authors: [cade]
tags: [simulation, numerical-methods]
draft: false
```

- Common: `schemaVersion`, `id`, `title`, `description`; optional `slug`, `authors`, `tags`, `draft`, and `aliases` containing previous absolute page paths.
- Blog: required `published`, optional `updated`; validated ISO calendar dates (`YYYY-MM-DD`). Sort the listing explicitly by publication date.
- Docs: optional `order` and navigation metadata. A documentation page need not pretend to have a publication date.
- Info: person, team, organization, or project-specific metadata, defined when a corresponding content collection is implemented. The current Info page is ordinary Astro.
- Author references resolve through an author registry when enabled. Tags use normalized identifiers with separately configurable display names.

Draft visibility is an explicit site/build setting; a preview hostname alone does not make content private. Production excludes draft routes and draft entries from listings.

## Assets: optional metadata beside native files

Use the full asset filename plus `.alk.yaml`, for example `run.csv.alk.yaml` or `pendulum.glb.alk.yaml`. This avoids collisions between different formats with the same stem. The sidecar describes the adjacent asset, so it does not need a second copy of the source filename.

```yaml
schemaVersion: 1
kind: dataset
title: Pendulum displacement
description: A synthetic trajectory sampled at a fixed interval.
provenance:
  kind: synthetic
columns:
  time:
    type: number
    unit: s
  position:
    type: number
    unit: m
defaultView:
  kind: chart
  type: line
  x: time
  y: position
```

`Asset` is a discriminated union: dataset, model, mesh, point cloud, splat, shader, and other supported adapters each validate their own fields. Only implement a variant when its adapter exists; listing a future kind does not establish renderer support.

Metadata records meaning: column types, missing-value conventions, units, coordinate conventions, attribution, provenance, and an explicit license when known. Never invent a license, turn a missing measurement into zero, infer units from magnitudes, or treat identifiers as measurements merely because their values look numeric. Timestamp columns need explicit timezone handling; article publication dates are a separate concept.

Keep display hints under `defaultView`. A dataset's units and provenance remain independent of whether it is displayed as a line, bar, or table. An extension such as `.ply` cannot by itself distinguish a mesh, point cloud, and splat. Ordinary files without metadata remain supported, with diagnostics or a column selector when interpretation is ambiguous.

Separating table content from column metadata has established precedent in [W3C's tabular data model](https://www.w3.org/TR/tabular-data-model/). This proposed YAML format is Alkemist's own contract, not a claim of CSVW compliance.

## Figures: optional reusable view definitions

A figure is a presentation of one or more assets. Define it inline for simple cases; use a `*.figure.yaml` file for a complex view reused across pages.

```yaml
schemaVersion: 1
id: displacement
kind: chart
src: ../data/run.csv
type: line
x: time
y: position
title: Displacement over time
```

Proposed component syntax; **these abbreviated and file-relative forms do not work in the current implementation**:

```mdx
<Chart src="./data/run.csv" />
<Chart figure="./figures/displacement.figure.yaml" />
<Model src="./models/pendulum.glb" />
```

The first form can use the sidecar for the title, column meaning, and default view. `src` and `figure` are mutually exclusive inputs. Explicit presentation props override the figure definition, then the asset's `defaultView`, then component defaults. Missing required descriptions produce an authoring diagnostic instead of fabricated scientific interpretation. Presentation overrides do not silently rewrite intrinsic asset metadata.

Use `Entry`, `Asset`, `Figure`, and `WidgetState` for exported types. Keep ordinary field names such as `id`, `kind`, and `src` in YAML/JSON; public programming names remain plain.

## Source resolution and published assets

For Alkemist's proposed source resolver:

- `./` and `../` refer to the containing source file: MDX props relative to the article, figure references relative to the figure definition.
- `/...` remains an explicit public URL, and `https://...` remains an external URL.
- Shared assets live under the configured shared source directory and use resolvable source references.

This requires implementation in the integration/compiler layer. Browsers currently resolve component `src` values as URLs; moving files into an article folder alone will not make these examples work.

Use Astro's existing pipeline for imported images. `public/` is appropriate for files deliberately served unchanged; source images can be processed and optimized. [Astro image guide](https://docs.astro.build/en/guides/images/).

For raw datasets and model bundles, emit a validated dependency manifest and generated URLs under `/assets/`. Multi-file glTF and similar formats must retain their relative dependency structure; do not hash or move their files independently without rewriting references. Keep original files distinct from generated previews, compressed derivatives, and thumbnails, and record source hashes and generation parameters.

An emitted hashed filename is a cache identifier, not an archival guarantee. Durable citations to old asset revisions need an explicit retention policy or artifact store; a new static deployment alone does not promise to retain files from the previous deployment. Preserve current public download paths during the initial migration. Decide archival storage separately before promising permanent revision downloads.

## Figure links and view state

Use explicit page-local IDs for figures, equations, and code examples: `#fig-displacement`, `#eq-energy`, and `#code-integrator`. Duplicate anchors fail validation. A reused figure can receive an instance ID when displayed twice on the same page.

When a widget supports shareable state, namespace its allowlisted query fields by figure ID. A proposed example is:

```text
/blog/energy-drift/?fig.displacement.x=0,10#fig-displacement
```

Each widget defines and validates its state schema. Omit default values, bound values to valid ranges, and reset invalid state with a visible explanation. Canonical page URLs omit presentation state. Keep the general board theme as a browser preference; explicit design-study queries remain useful for comparing and sharing aesthetic choices.

## Schema evolution and implementation order

Keep runtime validators and generated types together in the owning package, initially `@alkemdotdev/alkemist-astro` for content and asset contracts. Derive editor JSON Schemas from the same definitions. Astro already generates collection JSON Schemas; reuse that mechanism where possible, and add exports for Alkemist-specific sidecars. [Astro content schemas](https://docs.astro.build/en/guides/content-collections/).

Custom authored schemas carry `schemaVersion: 1`; served JSON Schema URLs include the major version. Breaking changes require a new major contract and a migration that shows its diff. Use a namespaced `extensions` field for registered plugin metadata instead of silently accepting misspelled core fields. Schemas improve AI assistance without making an AI service part of site rendering.

After approval:

1. Add explicit IDs and collection-specific frontmatter; preserve all existing page URLs and validate any proposed redirects.
2. Implement source-relative resolution and one complete portable article with a CSV, metadata, a reusable figure, and a model. Keep the current explicit component props supported.
3. Generate editor schemas and validate references, data columns, asset dependencies, unique routes, and figure IDs through the existing verification command.
4. Move reusable `/test/` fixtures into example content where appropriate while retaining their published download URLs. Keep the test page as the broad styling specimen.
5. Document the working contract in the public docs and a development blog article, and validate it in a consuming starter before treating it as a released framework API.

The route and navigation changes implement the accepted URL organization. The remaining file contracts require separate implementation and validation; they are not shipped authoring APIs.
