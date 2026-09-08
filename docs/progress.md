# Alkemist progress

## 2026-09-08 — Ubuntu and aesthetic decision studio

- Added `/design/studio/` on the existing design preview branch, with Ubuntu + Ubuntu Mono as the suggested pairing and IBM Plex as an actual font comparison.
- Added five radio groups and thirteen native checkboxes. Every checkbox was exercised in the browser and changed its intended computed style: fonts/weight, annotations, underline, filter, grid, border, corners, tray, symbol, dividers, spacing, and code gutter.
- Choices update a same-origin notebook frame without resetting the experiment. Both the parent-window identity and origin are checked; URL/storage/message values pass a shared allowlist.
- Verified a customized blackboard with monospaced headings and disabled handwriting/underline survives a reload. A bare studio URL restores saved preferences; an explicit shared URL overrides a different saved choice. Added two contract tests for false-value round trips and invalid/inherited input handling.
- The narrow preview had matching scroll/content widths. Inspected the controls themselves at 390px, with 375px content width and no horizontal overflow. The phone preview and full-size view preserve the selected design.
- Copy-link reports browser clipboard success; the automation clipboard reader returned empty, so exact clipboard contents are not independently established. A selectable readable checklist remains available, alongside a JSON download containing the same state and URL.
- Added design rationale to `docs/board-studies.md` and a public notebook article. Final build, export, and deployed-source checks are performed before handoff.

## 2026-09-08 — Blackboard / whiteboard studies

- Created the `design/board-studies` branch for three reviewable directions: Seminar, Workshop, and Drafting. Each offers exact `#111111` and `#eeeeee` backgrounds.
- Added `/design/boards/` with shareable query parameters, keyboard-operable direction and surface controls, a synthetic damped oscillator, and annotation visibility control. The graph also renders statically without JavaScript.
- Kept experimental styles inside the demo app; the shared production theme has not been selected or replaced.
- Added an illustrated notebook article and `docs/board-studies.md` with the design rationale, tokens, font choices, and implementation boundaries.
- Browser checks verified all six combinations at a 390px viewport (375px content width), with matching scroll widths and exact requested background colors. Inspected all three desktop styles and mobile Seminar/Workshop/Drafting. A Drafting mobile brand wrap was identified and corrected.
- Damping keyboard control reached 0.65, changed the SVG curve, and updated its accessible value. Notes toggled to hidden. The browser warning/error log was empty.
- Captured three built-site viewport screenshots for the notebook. The development toolbar is absent. Full-page export added incorrect empty padding; recapturing the visible viewport corrected the artifacts, which were reopened and checked as JPEGs at 1265 × 712.
- Local verification passed before publishing the branch preview. The preview URL and exact source revision are verified after the push; production remains the previously deployed main revision.
- Cloudflare successfully deployed the first study commit `39d10cf` from a GitHub push to `design/board-studies`, with stable alias `https://design-board-studies.alkemist-8be.pages.dev`. A follow-up screenshot correction uses the same branch workflow.

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
- Associated `alkemist.alkem.dev` and created its proxied CNAME to `alkemist-8be.pages.dev`. The domain and certificate are active.
- `github:push` deployed main commit `8049a95` successfully. HTTPS verification passed for home, docs, chart docs, components, notebook, headers, robots, source identity, and 404 behavior. The published homepage was visually inspected in the browser.
- The first preview deployment of `8049a95` passed the same checks at its immutable URL and stable branch alias, with preview identity/banner and no-index behavior verified.
- GitHub Actions passed for the initial main and preview pushes. A separate read-only deployment review found no actionable issues.
- A second preview push (`5f5e2b9`) adds the reusable HTTPS verifier. Cloudflare deployed it automatically and the same branch alias advanced to that revision while production stayed at `8049a95`. Both passed HTTPS checks at 17:21 UTC; the preview's GitHub Actions run passed.
- Hosting/preview foundation is complete. A final documentation publication records this evidence; its exact deployed revision is checked through `/build.json` after the push. Full interactive components remain the next phase.

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

## 2026-09-08 — Ubuntu, fixed inks, and the specimen board

Implemented the accepted Ubuntu/Ubuntu Mono typography across the shared theme, with locally served Caveat annotations. Whiteboard and blackboard now use #eee and #111. Eight named ink tokens have identical values on both surfaces; palette.ts is the source for generated CSS and downloadable /test/inks.json. Contrast regression tests distinguish graphical marks/large notes from normal text; code panels remain #111 in both themes so the same syntax inks retain normal-text contrast.

New reusable package components: AlkMath (KaTeX HTML+MathML), AlkCode (Shiki with captions/highlighted lines/copy), AlkChart (six CSV presets through Vega-Lite/Vega), AlkModel (real GLB/glTF through Three.js), and AlkShader (fixed WebGL2 interference study with frequency/angle/play controls). Shared Markdown/MDX processing has the same code and math defaults. Resolved rehype-katex's transitive KaTeX version to the same 0.18.7 renderer/CSS used by AlkMath; malformed math fails builds. Rendering engines are lazy; model/shader motion is opt-in and stops offscreen.

Created /test/ as a long interactive specimen with a generated torus-knot GLB, six chart treatments, mathematical typography and proof, language tabs, GLSL art, accessible SVG diagram, image/poster, rich MDX, and an actual local form/dialog flow. Data fixtures are synthetic and deterministic. Reference docs cover real supported APIs and limits; the notebook article explains the design and includes a browser screenshot of the palette.

Browser evidence (Codex in-app browser, built static preview, 1440×1000 and 390×844):

- Computed body/headings are Ubuntu; code is Ubuntu Mono. Both swatch boards have byte-identical computed colors. Body backgrounds resolve to rgb(238,238,238) and rgb(17,17,17).
- Actual WebGL model reported 9,216 triangles; Front/Top/Reset, keyboard orbit/zoom, wireframe, and spin controls exercised. WebGL2 shader reached ready and responded to frequency, angle, play, and pause.
- Real CSV rows loaded: 301 oscillator samples, 8 component counts, 625 field samples. Shift-wheel changed the line x domain from 0–12 to 3–8; Reset restored 0–12. Theme changed axis text while preserving the cobalt trace.
- Source table exposes first 100 rows with full CSV download. Deliberately blocking the oscillator request produced explicit error text; unblocking and pressing Retry restored 301 rows. Browser network override was cleared afterward.
- Code language clicks/arrow keys changed panels; copy button reported Copied. Independent system clipboard contents were not inspected.
- Form input/checkboxes/selection updated the local card; dialog opened and Escape closed it. Found and fixed reset event timing: reset defaults occur after the event handler, so the preview must update in a later task, not a microtask. Verified reset now restores Untitled experiment.
- Responsive check found/fixed grouped-bar slotting when x=color and stale legend/tick compilation on resize. Width changes now recompile after debounce and reset the view. Mobile page width remains contained; formulas/code/diagram use explicit local scrolling.
- Console had no unexpected errors/warnings before deliberate failure injection. Heavy lazy bundles still produce Vite's size advisory (Three~~724kB and Vega~~524kB uncompressed); this is recorded, not suppressed.

Independent code review found and fixed quoted-caption brace parsing and stringified numeric category domains. Regression tests use real Shiki/Vega output, not mocked renderers. New docs distinguish unsupported compressed models/splats/NeRF/robotics and a general shader API from implemented components. No package release to npm is claimed.

Publication uses the existing native Cloudflare Git integration: push branch for preview, then promote the verified revision to main for alkemist.alkem.dev. Final verification results and exact source identity are captured by scripts/check-deployment.mjs in ignored .alkemist/deployments artifacts; the source commit is discoverable from public build.json.

Final clean-install gate: `npm ci`, `npm run verify`, and `npm run format:check` passed: 33 Astro files with zero diagnostics, 18 tests passed, 21 pages built with internal links/assets verified. Final mobile bar labels use rotated labels and overlap avoidance; the complete category legend stays readable.

## 2026-09-08 — URL and file contract proposal

Inspected the current routes, content loader/schema, public asset paths, and component inputs. Wrote `docs/url-and-file-schemas.md` for review: stable collection IDs separated from route slugs, portable article folders, collection-specific frontmatter, optional native-file metadata sidecars, reusable figure definitions, and versioned machine schemas. Checked Astro's official loader, content-schema, and image documentation and the W3C tabular metadata model. The document distinguishes existing behavior from proposed authoring APIs and includes a migration sequence that preserves published URLs.

This is a local design proposal. No route migration, runtime API change, commit, push, or deployment was performed for this discussion.

Validation: `npm run verify` passed, and Prettier passed for both changed Markdown files. No rendered UI changed, so this proposal did not require another browser interaction pass.

## 2026-09-08 — Blog, Labs, Info, and optional Docs

Implemented the user's chosen information architecture: Blog, Labs, and Info in the primary navigation, with Docs and Test page in More. Renamed the notebook collection and routes to Blog, moved the component catalog into Docs, and moved both design apps into Labs. Added an actual standalone interference lab, a Labs index, and an Info page using known project information. The single `/test/` application remains intact. Added the public site-structure guide and a blog article explaining the decision; updated the file-schema proposal to distinguish accepted routes from the still-proposed asset metadata and stable-ID contracts.

The shared `AlkLayout` exposes main, More, and footer link arrays. Extra links default to empty; the demo's `SiteLayout` owns its documentation links. Consuming projects can omit Docs or use it for their own documentation. More uses native details/summary with Escape focus return and outside-click dismissal.

One explicit redirect manifest produces Astro fallback pages and Cloudflare HTTP 301 rules, including slashless legacy paths. Old article and design links have specific destinations; the published `/notebook/eight-inks.jpg` asset stays in place. The build verifier checks destination existence, redirect chains, and generated rules. The HTTPS deployment verifier also checks query preservation and the retained image.

Local verification passed: 18 tests, zero Astro diagnostics, 26 content pages plus 8 redirect pages, internal links/assets, and redirect artifacts. Browser checks at 1440×1000 and 390×844 covered both themes, keyboard menu activation, Escape and focus return, outside dismissal, Docs/Info/Labs/Test navigation, active-section indication, and page width containment. The interference lab rendered WebGL and responded to frequency and play/pause. The moved design studio loaded its `/labs/board-studies/` iframe; changing Graph grid updated both the query string and the iframe's data-grid state, then the default was restored. No browser errors or warnings were observed. Visual review found and fixed rich-content disclosure borders leaking into the header menu.

Cloudflare preview and production publication are the next validation step; local build success alone does not establish HTTP redirect behavior.

Independent review found one outdated layout prop list in the architecture guide; it now documents the navigation arrays and links to the site-structure reference. No actionable behavior or security findings remained in that review.
