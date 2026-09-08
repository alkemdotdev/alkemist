# Alkemist progress

## Current phase — deployment foundation

The user authorized a public Cloudflare site at `alkemist.alkem.dev`, automatic main deployments, other-branch previews, integrated docs, and a shared theme foundation before continuing full widget implementation.

- Adopted `Alk*` for public component and exported type names.
- Expanded the chart design to bars, pies/donuts, statistical charts, composition, and full Vega-Lite/Vega specifications.
- Implemented Astro 7.3.2 workspace packages, the shared `AlkLayout`/theme, six documentation pages, the component roadmap, and a development notebook article.
- Added managed Cloudflare configuration, repository/DNS identity guards, validation-only CI, built-link checks, and `/build.json` provenance.
- `npm run verify` passes: zero Astro diagnostics, four deployment-contract tests, 12 built pages, internal links/assets, and production build identity.
- Production and preview-mode local builds pass; desktop/mobile browser checks confirmed docs navigation, theme persistence, and no page overflow.
- Initial source commit `e587eef` was pushed to main, with local/remote parity verified.
- Created the `alkemist` Cloudflare Pages project. Source repository identity, build settings, main production, all-branch previews, and disabled PR comments passed remote readback.
- Associated `alkemist.alkem.dev` and created its proxied CNAME to `alkemist-8be.pages.dev`. Domain validation and push-triggered deployment checks are in progress.

## 2026-09-08 — Research and proposal

Status: awaiting the user's approval of the sketch and architecture before implementation.

### Observed workspace

- `/Users/cade/dev/alkemist` is an empty Git working tree with an unborn `main` branch.
- Remote: `git@github.com:alkemdev/alkemist.git`; no remote fetch, commit, push, package publication, or deployment performed.
- Older session notes describe a previous Alkemist implementation, but those files and commits are not present in this checkout. They are not treated as current implementation evidence or authorization to commit.

### Completed

- Researched Astro's current version, integration/component packaging, content collections, Markdown/MDX, and template scaffolding.
- Compared Starlight's package model with AstroPaper and AstroWind starter-source models.
- Researched data, mesh, point-cloud, splat, NeRF, URDF, and shader support against upstream documentation and repositories.
- Wrote `docs/proposal.md`, including ownership, authoring API, engines, format limits, AI workflows, theme/site direction, and the implementation sequence.
- Created an interactive conversation sketch with illustrative geometry and synthetic chart data. It shows the notebook, proposed component catalog, figure annotations, camera-angle control, a chart window control, and source/figure toggle.

### Validation

- Sketch source was read back and checked for fragment format and accidental escaped markup; size is below 1 MB.
- Visually inspected the sketch in the in-app browser at viewport widths 1024, 736, and 360 px, including Paper and Graphite appearance. The standalone preview wrapper uses some viewport space; measured sketch widths were 689 px at 736 and 313 px at 360, with matching scroll widths and no horizontal overflow.
- Exercised notebook/component navigation, model angle, figure annotations, chart time window, and source/figure toggle. Chart axis labels changed from a 10-second to a 3-second interval. The source values are generated from the same synthetic function as the plotted curve.
- Browser error/warning log was empty at the final check. These checks validate the concept sketch only; host-provided design tweak controls were not available in the standalone preview.
- No Astro project exists yet. No framework, package interoperability, real file loading, GPU rendering, or deployment validation is claimed.

### Proposed next action after approval

Build the first real meta article with math, a diagram, an actual CSV chart, and an actual GLB viewer, using the reusable package boundary. Validate it in a separately installed starter and in desktop/mobile browsers.
