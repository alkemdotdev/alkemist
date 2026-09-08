# Alkemist: an open workbench for publishing ideas

Status: implementation direction, updated September 8, 2026. The current phase is the Astro demo/documentation site and Cloudflare deployment bootstrap, including main deployments and branch previews. Full interactive widgets remain the next phase. See `docs/progress.md` for observed progress and deployment evidence.

## Product

Alkemist is an updatable Astro publishing toolkit for inventors, researchers, and technical creators. It should make an article, research notebook, project page, or lab website a natural place for interactive evidence: equations, diagrams, runnable examples, data, simulations, models, and captured environments.

The central experience is **a file, a component, an explorable figure**. Simple cases take one line; complex cases expose explicit options and the underlying engine rather than hiding it. AI assistants should be able to discover supported components, inspect assets, edit ordinary source files, and validate their work through documented commands.

The default example site is Alkemist's own public notebook: every feature is explained using the same released components that users receive.

## Distribution and upgrades

Use a small starter application plus maintained npm packages. Astro is the underlying framework; Alkemist uses its public extension points. Current stable Astro is **7.3.2**; its declared Node minimum is **22.12.0**. Verify the exact stable version again when implementation begins and pin the example application and lockfile. Sources: [registry](https://registry.npmjs.org/astro/latest), [release](https://github.com/withastro/astro/releases/tag/astro@7.3.2).

| Existing approach               | What it establishes                                                                     | Alkemist decision                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Astro `create-astro --template` | Copies a starter into a new project                                                     | Use for initial scaffolding; updates come from packages                                     |
| Starlight                       | A versioned integration with configuration, component overrides, and plugins            | Follow the ownership and extension model                                                    |
| AstroPaper                      | A blog starter whose source and self-documenting posts are copied into a user's project | Learn from the authoring/demo experience; avoid whole-template merging for routine upgrades |
| AstroWind                       | A starter with reusable sections and configuration                                      | Learn from composition; keep maintained internals in packages                               |

Sources: [Astro custom starters](https://docs.astro.build/en/install-and-setup/#use-a-theme-or-starter-template), [package publishing](https://docs.astro.build/en/guides/integrations/#publishing-your-integration-to-npm), [Starlight overrides](https://starlight.astro.build/reference/overrides/), [Starlight plugins](https://starlight.astro.build/reference/plugins/), [AstroPaper updates](https://astro-paper.pages.dev/posts/how-to-update-dependencies/), [AstroWind repository](https://github.com/arthelokyo/astrowind).

Proposed source layout; names are provisional and package availability is not claimed:

```text
apps/
  site/                 Alkemist's docs, demonstrations, and development notebook
examples/
  starter/              Minimal user-owned Astro site; packaged-consumer fixture
packages/
  astro/                @alkemist/astro: integration, config, content, asset manifests
  ui/                   @alkemist/ui: layouts, themes, figure shell, authoring blocks
  data/                 @alkemist/data: charts, tables, schema inspection
  spatial/              @alkemist/spatial: models, points, lazy splat/robot adapters
  lab/                  @alkemist/lab: shaders, algorithms, simulations, WASM hooks
  cli/                  Asset inspection, scaffolding, validation, migrations
docs/
  decisions/            Accepted decisions and the constraints behind them
  progress.md           Current state and validation evidence
```

The application owns its content, raw assets, site identity, navigation, custom pages, CSS tokens, and explicit component overrides. Packages own shared behavior and defaults. Overrides use supported slots, props, tokens, and replaceable components. There is no required universal CSS framework or front-end renderer; specialized components can use Astro shells with small browser modules, and users retain Astro's renderer choices.

Start with a small number of actual packages and split only at dependency or release boundaries. The directories above describe ownership, not a requirement to scaffold empty packages immediately.

Routine upgrades update dependencies. Semver, Changesets, release notes, a tested Astro peer range, and targeted migration commands handle evolution. Migrations must show diffs and preserve user edits. CI must test a packed consumer outside the workspace, an existing customized site, and both the minimum and latest supported Astro versions. Astro's upgrade CLI does not upgrade Alkemist-owned schemas automatically. [Astro upgrades](https://docs.astro.build/en/upgrade-astro/).

## Authoring contract

Public Alkemist components and custom exported types use the `Alk` prefix: `AlkChart`, `AlkFigure`, `AlkChartProps`, `AlkAssetManifest`, and `AlkWidgetState`. Packages remain `@alkemist/*`, the integration function is `alkemist()`, and CSS tokens use `--alk-*`. Canonical docs and generated examples use the prefixed names; authors may explicitly create shorter local aliases.

Proposed MDX syntax, supplied by the Alkemist article wrapper:

```mdx
<AlkChart src="./trial.csv" />
<AlkChart type="line" src="./trial.csv" x="time_s" y="temperature_c" />
<AlkChart type="bar" src="./results.csv" x="method" y="score" />
<AlkChart type="pie" src="./materials.csv" category="material" value="mass_g" />
<AlkChart engine="vega-lite" spec={experimentSpec} />
<AlkModel src="./prototype.glb" />
<AlkMesh src="./bracket.stl" units="mm" />
<AlkPointCloud src="./scan.ply" />
<AlkSplat src="./workshop.spz" />
<AlkRobot src="./arm.urdf" />
<AlkShader src="./field.frag" />
<AlkDiagram src="./architecture.mmd" />
```

These are a proposed API, not runnable commands or existing components. A plain `.astro` page uses explicit imports. Alkemist will need to implement and test the shared MDX component mapping and file-relative asset resolver; Astro does not automatically make arbitrary component names or relative file URLs work this way. [MDX component mapping](https://docs.astro.build/en/guides/integrations-guide/mdx/#passing-components-to-mdx-content).

Files colocated with an article are resolved relative to the source article, validated during the build, and emitted through an asset manifest. Public URLs remain supported. Raw source stays intact; derived previews, typed data, and compressed copies have separate paths and provenance.

For a CSV with an unambiguous time column and one numeric measurement, the default chart can infer a line chart. Multiple plausible axes produce visible column selectors and an authoring diagnostic. Authors can fix the interpretation with props or an optional metadata file. Never infer physical units, causality, time zones, or a scientific conclusion from a column's numeric type. Preserve nulls and distinguish missing values from zero. A data table and original download remain available.

Shared figure behavior:

- Captions, stable figure IDs, cross-references, citations, attribution, and source downloads.
- Consistent controls, fullscreen, reset, keyboard access, URL-serializable view state where useful.
- Annotation overlays for screenshots, image comparisons, plotted regions, and 3D hotspots.
- Static posters or SVG/HTML fallbacks for printing, indexing, unsupported graphics, and no JavaScript.
- Lazy activation, loading/error states, bounded pixel ratio, offscreen pause, and resource disposal.

### Broad chart contract

`AlkChart` is a general chart surface. Planned presets cover vertical/horizontal/grouped/stacked/percentage/diverging/ranged bars; pie/donut/radial charts; line/step/area/stacked-area charts; scatter/bubble/connected scatter; histograms/density/box plots/error bands/regression/heatmaps; layered annotations/facets/small multiples/linked selections; and geographic points/routes/choropleths with explicit geographic data.

Vega-Lite demonstrates these families in its [example gallery](https://vega.github.io/vega-lite/examples/). Pie/donut charts use its [arc mark](https://vega.github.io/vega-lite/docs/arc.html). Qualification as an Alkemist preset requires implementation and a working documented example.

Typed options are chart-specific: grouping, orientation, sorting, stacking, aggregation, binning, scale domains, axis formats, colors, legends, labels, tooltips, dimensions, selection, and zoom. Preset mode and full Vega-Lite/Vega specification mode are mutually exclusive; avoid hidden deep merging. [Encoding](https://vega.github.io/vega-lite/docs/encoding.html), [transforms](https://vega.github.io/vega-lite/docs/transform.html), [Vega-Embed](https://github.com/vega/vega-embed).

Network layout and specialized hierarchy views can use full Vega or qualified adapters. Alkemist should build and document its own authoring, accessible figure, lifecycle, and specialized interaction primitives where needed, while using established chart renderers. [Vega force layout](https://vega.github.io/vega/docs/transforms/force/).

## Capabilities and engines

| Area                | Included authoring experience                                                                                   | Engine / boundary                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Publishing          | Articles, notebooks, projects, authors, collections, tags, RSS, sitemap, metadata, search, drafts, print styles | Astro content collections, MDX, static output, Pagefind                              |
| Mathematics         | Inline/display math, numbered equations, theorem/definition/proof blocks, footnotes, citations, bibliography    | KaTeX, remark/rehype, Citation.js; formal proof claims require separate verification |
| Programming / CS    | Highlighted annotated code, file excerpts, diffs, tabs, source links, interactive algorithm steps               | Expressive Code; execution is explicit, isolated, and language-specific              |
| Diagrams            | Flowcharts, state machines, sequences, graphs, editable source, pan/zoom                                        | Mermaid initially; static SVG plus Alkemist interaction layer                        |
| Data visualization  | CSV/JSON, zoomable charts, selection, legends, table/profile, downloadable source                               | Vega-Lite/Vega initially; escape hatch for explicit specs and custom components      |
| Geometry            | GLB/glTF, STL, OBJ, PLY mesh/point views, camera presets, animations, material/wireframe views                  | Three.js loaders and shared viewer shell                                             |
| Captured scenes     | Gaussian splats, camera presets, LOD where supported                                                            | Lazy Spark adapter inside the shared Three.js runtime                                |
| Robotics            | URDF, explicit units/frames, joint sliders, recorded trajectories                                               | urdf-loader; simulation engines and live robot control are separate capabilities     |
| Shaders             | GLSL fragment examples, uniform controls, pause/reset, compile diagnostics                                      | Three.js/WebGL first; WGSL/WebGPU gets a separate adapter                            |
| Simulations         | Parameter controls, seeded replay, stepping, worker-backed computation, plots                                   | Small typed widget contract; optional Rust/WASM assets                               |
| Visual storytelling | Annotated figures/screenshots, before/after sliders, linked text and figure selections                          | Shared UI primitives and an explicit widget event contract                           |

Choose one baseline engine per domain. Optional adapters should meet the same figure and lifecycle contracts instead of shipping a competing stack to every page. Static prose must not download Three.js, Spark, or a chart engine merely because those packages are installed.

Astro's integration hooks supply configuration, routes, Vite extensions, and dev toolbar hooks. Content collections supply schema validation and generated editor schemas. Astro 7 has a pluggable Markdown processor; explicitly configure Unified for the remark/rehype ecosystem and test equivalent math/code behavior in MD and MDX. [Integration API](https://docs.astro.build/en/reference/integrations-reference/), [content schemas](https://docs.astro.build/en/guides/content-collections/#using-json-schema-files-in-your-editor), [Markdown processors](https://docs.astro.build/en/guides/markdown-content/), [Expressive Code](https://expressive-code.com/key-features/text-markers/), [Citation.js](https://github.com/citation-js/citation-js), [Pagefind](https://pagefind.app/).

### Format boundaries

- Prefer GLB for web delivery. glTF, OBJ, and URDF can refer to additional textures, materials, meshes, and package paths; validation must collect and preserve those references. Geometry codecs require their decoders. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [OBJLoader](https://threejs.org/docs/pages/OBJLoader.html), [URDF loader](https://github.com/gkjohnson/urdf-loaders/blob/master/javascript/README.md).
- `.ply` alone cannot identify mesh, point cloud, or Gaussian splat content. Keep explicit components or inspect headers and require an override when ambiguous. Spark supports several splat formats, including SPZ, PLY, SPLAT, KSPLAT, SOG, and RAD. [PLYLoader](https://threejs.org/docs/pages/PLYLoader.html), [Spark formats](https://sparkjs.dev/docs/loading-splats/).
- A NeRF is not a universal browser asset format. Support documented export recipes now and a method-specific baked-NeRF adapter only after qualification. Nerfstudio can export meshes/point clouds; MERF has an actual browser-rendered radiance-field export pipeline. Conversion to a mesh changes the representation and must be identified as such. Do not advertise arbitrary training checkpoints as one-line client viewers. [Nerfstudio export](https://docs.nerf.studio/quickstart/export_geometry.html), [MERF](https://github.com/google-research/google-research/tree/master/merf).
- CSV syntax inference cannot choose the right scientific interpretation. Vega-Lite supports CSV and interval selections bound to scales; Alkemist adds author-friendly defaults and diagnostics. [Vega-Lite data](https://vega.github.io/vega-lite/docs/data.html), [pan/zoom](https://vega.github.io/vega-lite/docs/bind.html).
- Large data and scans need explicit budgets, decimation, workers, or supported streaming formats. Any lossy transformation remains visible and preserves the source. Establish limits with actual desktop/mobile fixtures, not upstream benchmark headlines. [Spark LOD](https://sparkjs.dev/docs/lod-getting-started/).
- GLSL and WGSL are different shader contracts; Three.js ShaderMaterial targets WebGLRenderer. Do not silently rewrite between them. [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html).

Core candidates have permissive licenses: Three.js and Spark MIT, URDF loader Apache-2.0, Vega/Vega-Lite BSD-3-Clause. Lock exact dependency and decoder versions and retain notices. Engine licensing does not grant permission to redistribute sample models, datasets, images, or fonts. Each demo asset needs its own provenance/license record. [Three registry](https://registry.npmjs.org/three/latest), [Spark registry](https://registry.npmjs.org/@sparkjsdev%2Fspark/latest), [URDF registry](https://registry.npmjs.org/urdf-loader/latest), [Vega-Lite registry](https://registry.npmjs.org/vega-lite/latest).

## Working with AI

Make the project understandable to ordinary coding assistants, with no required model provider or online service:

1. Typed props, machine-readable component catalog, content/asset schemas, and small canonical examples generated from the same source of truth.
2. Versioned authoring guidance and recipes for articles, diagrams, charts, custom widgets, screenshots, and verification. Supplement with `llms.txt`/Markdown documentation; those files alone are not an integration.
3. Proposed CLI commands such as `alkemist inspect ./trial.csv --json`, `alkemist new post`, `alkemist check`, and `alkemist migrate --dry-run`. Package naming and CLI shape remain provisional.
4. Deterministic checks for missing assets, bad columns, dangling citations, invalid component props, oversized bundles, and broken links. Errors include source locations and suggested corrections.
5. Reproducible browser scenarios, screenshots, widget state exports, and fixture manifests so an assistant can exercise the result.

AI helps write source and prepare data during authoring. Publishing a static site should not require API keys or an AI call. Optional future local dev tools/MCP may expose the same inspector and scaffolder interfaces; avoid making a custom agent service prerequisite for v1.

MDX is trusted source code. Untrusted external data is parsed as data; code examples do not execute by default. Runnable snippets need a separate worker or sandbox with defined permissions and time/resource limits. Mermaid defaults to strict security, which disables its native click callbacks; interactive Alkemist diagrams should use controlled node mappings rather than enabling arbitrary script handlers globally. [Mermaid security configuration](https://mermaid.js.org/config/schema-docs/config.html#securitylevel).

## Example site and visual direction

Recommended direction: **research notebook × instrument panel**. Legible editorial typography, a restrained green ink accent, monochrome UI labels, generous margins, and wide figures that can extend beyond the prose. Paper and Graphite themes share tokens; project/lab identity is customizable. Movement explains state changes and respects reduced motion.

Site structure:

- Home: product statement, one live example, selected projects/fieldnotes, start-here link.
- Notebook: articles about decisions, implementation, experiments, failures, and validation.
- Components: live demos, one-line usage, complete prop schema, accessibility/fallback behavior, supported formats.
- Examples: mathematics, programming/CS, robotics, graphics, and data stories.
- Guide: quick start, authoring, theming, extension contracts, hosting, upgrades.
- Releases: changelog and migration guidance.

The current conversation sketch illustrates the visual direction and proposed interaction patterns with generated wireframe geometry and synthetic chart data. It does not load a model or CSV and does not validate the proposed engines.

Every development article should have: problem, decision, minimal source, live example, annotated screenshots/diagrams, validation evidence, known limits, and links to the relevant source revision. Useful initial posts:

1. A starter you can keep upgrading.
2. From a CSV to an explorable figure.
3. Making room for mathematics.
4. Meshes, splats, and the browser.
5. Teaching an AI assistant the component vocabulary.
6. Keeping a page of experiments fast.

Keep technical progress in `docs/progress.md`; turn completed work into readable MDX posts with actual captured evidence. Do not label planned features, mock interactions, or upstream capabilities as implemented results.

The example site is also the documentation site. Guides, component references, chart galleries, recipes, theming, extension contracts, hosting, and upgrades share its theme and navigation. Each implemented component reference includes canonical `Alk*` usage, typed options, a working example, source/data, accessibility behavior, formats, and limitations. Development articles link to the references.

## Implementation sequence

**0. Establish the public foundation.** Bootstrap the Astro demo/docs site, shared theme, notebook, and reproducible Cloudflare configuration. Verify production deployment from main and automatic branch previews before continuing widgets.

**1. Prove the product end to end.** Add one meta article combining math, an editable diagram, a real CSV chart, and a real GLB viewer. Validate component mapping, relative assets, no-JS output, and a clean packed consumer.

**2. Complete the publishing and data experience.** Content schemas, references/bibliography, code presentation, search, feeds, project pages, annotations, asset inspection, and reproducible AI authoring instructions. Add real development posts and screenshots as features land.

**3. Expand the laboratory.** Qualify mesh formats, point clouds, splats, URDF, shaders, simulation/algorithm widgets, and browser-supported NeRF export paths. Each advertised capability requires a representative asset and browser demonstration. Keep the full domain scope visible in the capability matrix.

**4. Prove reuse and upgrades.** Test a separately generated and customized consumer, package upgrades, migration diffs, documentation accuracy, missing/invalid inputs, mobile behavior, lazy bundle loading, and static self-hosting. Finalize a versioned release only after the package/release step is authorized.

The project is moderate in architectural complexity and broad in feature scope. The expensive maintenance areas are heterogeneous rendering engines, schema/API stability, and cross-device graphics validation. Staging the work isolates these risks while retaining the intended scope.

Current authorized scope: establish hosting, automatic main and branch deployments, integrated docs, and the shared theme foundation; provide an overview before continuing the full widget implementation.
