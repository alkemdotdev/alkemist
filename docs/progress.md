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

Implementation commit `d8bfd7c46b61a6e3fda5828734b6a730da8bed8d` was pushed to `design/board-studies`, verified on Cloudflare, then promoted to `main`. Preview HTTPS checks passed at 19:33 UTC and production checks passed at 19:36 UTC: eleven canonical pages, all sixteen legacy URL forms returning 301 with query parameters preserved, the unchanged legacy image returning 200, robots policy, source identity, and an actual 404. GitHub verification passed for both branches. Production navigation was visually inspected, and the old studio URL opened the correct lab with its saved grid choice applied. Reports are retained in ignored `.alkemist/deployments/*-d8bfd7c4.json` artifacts and can be regenerated with the deployment verifier.

Independent review found one outdated layout prop list in the architecture guide; it now documents the navigation arrays and links to the site-structure reference. No actionable behavior or security findings remained in that review.

A later read of the long-lived local browser tab contained one earlier MutationObserver exception without a source URL. No matching call exists in owned source or emitted assets; Astro's development audit has a possible caller, but the stack was unavailable. The exception did not reproduce in a fresh deployed-preview tab, whose navigation and studio checks logged no errors or warnings. The local development server was stopped, and the temporary viewport override was reset.

## 2026-09-08 — Start using Alkemist, with a person or an agent

Added an early homepage entry with agent/terminal tabs, Cloudflare/GitLab/custom hosting selection, copy feedback, and a downloadable Markdown setup contract. The human getting-started guide and `llms.txt` point to the same setup/provider instructions. The generated site's own `AGENTS.md` and `HOSTING.md` carry those conventions into the user's workspace. A new blog article explains the design. The demo's operator hosting reference is now clearly separate from new-site hosting guides.

Implemented a real external-site generator: `npm run create:site -- ../my-lab --provider cloudflare|gitlab|custom`. It creates user-owned content/configuration with actual npm tarballs for the shared packages, personalized layout identity, base-aware routes, Blog/Labs/Info, and a small Test page. It refuses a nonempty destination and does not initialize Git or create hosting resources. Explicit `--update` refreshes dependency snapshots while preserving user files. This is a source-preview workflow: GitHub currently reports the upstream repository as private, and no public npm release is advertised. Public distribution requires a separate reviewed release decision.

The provider recipes use first-party Cloudflare, GitLab, and Astro documentation. Cloudflare uses native Git production and branch previews. The supplied GitLab pipeline deploys the default branch and validates other branches; paid-tier parallel previews are an explicit option. GitLab's actual `CI_PAGES_URL` determines preview subpaths even when production has a custom domain. Custom hosting has a static artifact contract and requires the selected provider's real deployment command. GitLab and custom-host deployments were not performed on an external account.

Local validation passed: `npm run verify` (42 Astro files, zero diagnostics, 25 tests, 38 generated HTML files with links/assets checked) and `npm run check:starter`. The consumer gate installs real tarballs outside the workspace, installs a changed package snapshot while checking byte-for-byte user content/configuration preservation, verifies a GitLab `/my-lab/mr-7/` build and noindex/commit metadata, reinstalls from its lockfile, and checks all provider scaffolds. GitHub CI now runs this consumer gate. Review fixed platform-specific sibling-path checks and npm invocation; POSIX/Windows path-policy tests and an actual destination containing spaces passed. Native Windows execution is not claimed.

Browser evidence at 1440×1000 and 390×844: homepage anchor, provider selection, agent/terminal keyboard tabs, copy status, both board themes, and hosting guide links worked with no horizontal page overflow. Fixed incidental leading whitespace in prompt textareas and collapsed the long docs menu by default on phones; menu expansion and provider navigation worked. An independently installed starter showed its own My Lab identity, loaded 41 CSV samples, rendered four real glTF triangles, and responded to Top and Wireframe controls. Mobile chart axes and math remained readable. Both browser tabs had empty error/warning logs. Live publication evidence is recorded by the deployment checker after the native Git build.

## 2026-09-08 — Three homepage mockups

Built `/labs/homepage-studies/` for comparing Workbench (product promise beside a live figure), Fieldnotes (an editorial research note), and Build together (agent-led setup). The approved Ubuntu/Ubuntu Mono, #eee/#111 boards, handwritten notes, and fixed inks remain common to all three. The production homepage composition is unchanged. A new blog article explains the alternatives and the recommended combination: Workbench as the base, with the compact agent brief and editorial annotations.

Site-owned ProofBench uses the current AlkChart, AlkModel, AlkMath, and AlkCode APIs. It presents real CSV/GLB data, keyboard tabs, component-source disclosures, and a small sine-frequency widget. The example site compositions are explicitly labelled as proposed presets. Selection controls support a preferred direction, a checklist, local notes, clipboard output, and a JSON download; they do not publish the choice. New source belongs to the demo site, with no shared-package API change.

Browser verification at 1440×1000, 390×844, and 320×844 covered all three takes and both board themes. The visible chart loaded 301 synthetic rows while hidden charts/models stayed idle. The model reported 9,216 triangles and responded to Top; keyboard tab navigation and the sine slider changed the displayed angular frequency and accessible plot label. Source copy, researcher/group/project previews, provider-dependent full agent briefs, and selection copying worked. Revisiting the bare route restored a selected direction and notes; test notes were cleared afterward. All three takes remained within the page width at 320px. No browser errors or warnings were observed.

Review found and fixed a saved-direction reset on bare-route revisits and stale manual-copy output after changing the direction. Reduced duplicate prompting around the hero figure and kept small mathematical control text in neutral ink. Local verification and live native-Git deployment checks are run before publication; reports are retained in `.alkemist/` and the published source identity is available through `/build.json`.

## 2026-09-08 — Art-led opening studies

Added `/labs/hero-studies/` with three working directions: a Three.js folded ribbon, a WebGL2 flowing-ink field, and an AI-generated inventor's working surface. The openings share a restrained introduction, the current board themes and eight inks, a working component example below, and the existing setup flow. They remain Labs proposals; the homepage composition is unchanged. A customization guide explains the site/package ownership boundary, and a blog article includes the generated image, an actual browser capture, and the design rationale. The exact built-in image-generation prompt is retained in `docs/art/working-surface-prompt.md`; the original PNG is in the site's assets, with responsive WebP derivatives generated by Astro.

The sculpture has 48 strips and 24,576 triangles on a three-half-twist surface. The shader offers Stream, Vortex, and Contours, using 64 procedural lines. Both are site-owned experiments, not new public component APIs. Engines initialize when visible; motion starts paused. Static procedural posters survive missing WebGL and context loss. The image is concept illustration, not evidence of a working physical prototype. Its light photographed surface is preserved across themes.

Native in-app review covered desktop and 390px/320px layouts, both themes, sculpture keyboard/motion controls, all three shader compositions, saved preferences, copied selections, and direct theme URLs. The detail checkboxes actually hide/show annotations, captions, and the practical example. Freeform notes stay out of shared URLs. Test notes were cleared afterward. Review found and fixed OrbitControls' inline `touch-action: none` overriding the intended vertical-scroll policy, and a mobile line-break treatment joining two words.

Repeatable Chromium checks against the static build counted actual WebGL draw calls: paused scenes stopped drawing, opt-in motion produced frames, offscreen shader motion stopped, and reduced-motion changes paused both scenes. Deliberate graphics-context loss and unavailable-WebGL initialization revealed visible posters and explanations; a no-JavaScript context retained art and navigation. Pagehide/pageshow disposed and restored the sculpture. A touch-emulated vertical swipe over the sculpture scrolled the page and a horizontal drag changed the rendered camera view. Both themes and all takes fit 390px and 320px without horizontal overflow. No unexpected errors were observed in the static-build checks. Reports, scripts, and nine screenshots are retained in ignored `.alkemist/hero-*` artifacts.

The local verification gate and formatting checks pass. Astro produced four responsive derivatives of the illustration (approximately 22–131 kB, compared with the 2.1 MB source PNG). The build/deployment checkers now include the new route. Publication follows the existing branch-preview-then-main native Git flow, with deployed commit identity and checks retained in `.alkemist/`.

A final direct-link check exposed a startup ordering race: the default sculpture could mount before the bundled comparison controller selected the image opening. The page now resolves the initial URL or saved direction in a small inline bootstrap before deferred renderer modules run. A fresh direct image visit left both engines idle; switching to Flow initialized only the shader. The full verification gate passed again after the fix.

## 2026-09-08 — Quiet automatic sculpture motion

Refined the Sculpture opening with a slow default orbit (one revolution per five minutes) and one small cyan wireframe octahedron. The companion rotates slowly and drifts by only 0.055 scene units; the ribbon remains the dominant form. Ambient rendering is capped at 30 painted frames per second. Manual drag, keyboard input, Reset, and Pause stop both motions. Reduced-motion visitors start still, offscreen/hidden scenes stop drawing, and a manual pause survives pagehide/pageshow restoration. The static SVG also includes the companion. Updated the design article and customization guide to describe the new default; the Flow shader remains opt-in.

Chromium checks against the static build passed: default auto-start, 11 rendered frames in a half-second sample, zero additional draws while offscreen or paused, byte-identical paused canvas captures, reduced-motion initial/change behavior, keyboard reset, lifecycle pause retention, image-only lazy loading, and context-loss fallback/control state. Desktop and settled 390px/320px views were inspected on both boards. A viewport-resize capture occurred before its queued redraw; a settled capture confirmed the scene remained visible. The native in-app browser reported reduced motion, and explicitly starting the animation worked. Scripts, logs, and screenshots are retained in ignored `.alkemist/hero-motion-*` files. Full verification and native-Git preview/production checks accompany publication.

## 2026-09-08 — Four new sculptural openings

The next review asked for four takes built from scratch. Added `/labs/sculpture-studies/` with Orbit (open inclined bands and a warm center), Strata (separated contour slabs with a cleft), Interference (two crossing wave sheets), and Assembly (a faceted shell, spring, and rings). Each has new geometry, a curated subset of the fixed inks, an authored resting pose, and its own homepage composition. The four-up comparison uses transparent stills captured from the actual renderer; full previews retain procedural contour fallbacks. The new blog article includes the four stills, and the homepage guide identifies the editable sources. The earlier studies remain available, with a link to this round. These remain Labs proposals.

Pure TypeScript geometry is separate from the site-owned Three.js renderer. The four scenes use 3,904–13,408 triangles each. Motion is a bounded slow turn around the composed pose with slight drift; it does not continually spin away from the intended silhouette. Ambient painting is capped at 30 fps. The comparison does not initialize graphics engines; opening a visible take initializes only that scene. Pause, manual input, visibility, lifecycle disposal, and reduced-motion preferences are handled explicitly.

Visual refinement widened the wave composition's framing and adjusted Assembly's headline to hold two lines. Rendered comparison stills replaced line-only previews so material and depth are visible before opening a take. The retained capture recipe writes outside the watched assets folder, then its four PNGs are copied together; this avoids hot reload interrupting capture. A capture also revealed adjacent copy overlapping an expanded canvas, so the recipe hides page copy while capturing the artwork. Astro produces responsive WebP versions of the four source stills.

Independent review caught and corrected a missing landmark label, invisible canvases remaining keyboard accessible, focus loss when opening a comparison card, and stale automatic playback overriding a changed reduced-motion preference after lifecycle restoration. Geometry checks found finite vertices, valid indices, and sampled motion inside the declared bounds.

Static-build browser checks passed at 1440px, 390px, and 320px: all four takes on both boards fit the page; default motion produced ten painted frames in a half-second sample; Pause stopped drawing and preserved byte-identical images; keyboard turning changed the image; offscreen motion stopped; returning resumed it; reduced-motion changes and restoration paused it. Comparison navigation, browser Back, focus transfer, checkboxes, theme radios, copied directions, and persisted preferences worked. Deliberate context loss revealed the fallback and removed the failed canvas from focus/assistive navigation. A no-JavaScript browser retained all four still previews. No unexpected page errors were observed. The browser test was corrected to place the artwork fully outside a shorter viewport and to allow media-query change events to settle before asserting.

`npm run verify` passed: 62 Astro files without diagnostics, 25 tests, and 45 generated HTML files with links/assets and build identity checked. Browser reports and screenshots are retained under `.alkemist/four-forms-*`. Publication follows the existing native Git preview-then-main flow, with source identity checked through `build.json` and the deployment verifier.

## 2026-09-08 — Mathematical and engineering detail

Rebuilt the four sculpture-study subjects after the review found them too playful. Stable take identifiers now select Enneper (exact analytical immersion sampled on a disk), Gyroid (sectioned trigonometric nodal approximation), Dipole (analytical field-line families), and Reduction (a sectioned planetary stage). Neutral silver/graphite materials replace large colored masses; the same shared inks identify coordinates and sections. These remain Labs proposals, with the production homepage composition preserved.

The geometry contains 71,456, 98,926, 39,552, and 123,548 triangles respectively. Local audits found finite coordinates, valid indices, no degenerate triangles, and geometry within declared radii. The dipole's 377 curves preserve their shell parameter to about 4e-15. Gyroid analytic normals agree with finite differences within 9.8e-12; refined nodal roots have residual below 1e-12, while interpolated section vertices reach about 0.0285. The engineering illustration uses 24/16/56 teeth and four planets satisfying the center-distance and spacing conditions. Its root connectors, axial spacing, and lack of tolerances/dynamics are explicitly documented.

Visual review corrected loose framing by fitting actual transformed vertices, replaced colliding floating notes with geometry-linked margin labels, removed an unnecessary environment blur that exceeded the renderer's sample limit, and replaced mesh-averaged gyroid normals with the analytical gradient. Added constrained zoom buttons without taking over wheel scrolling. A new preference key prevents old favorites from being silently mapped onto the replacement geometry. Technical annotations, equations, and restrained grids give the view an inspection context.

Transparent 1200×900 stills were captured from the renderer with labels, adjacent copy, grid, and frame excluded. New assets live in `forms-engineering`; earlier `forms` images remain with the historical article. The new development article explains each model with equations, source references, actual screenshots, editable source locations, and model limits. The homepage customization guide and Labs index describe the revised studies.

`npm run verify` passed: 63 Astro files with no diagnostics, 25 tests, and 46 generated HTML files with links/assets/build identity checked. Static-build browser checks passed across four takes at 390px/320px on both boards, plus desktop inspection: lazy initialization, focus transfer, 12 painted frames in a half-second sample, pixel-identical paused views, keyboard turning, zoom, offscreen suspension, reduced-motion changes/restoration, browser Back, checkboxes, copied directions, saved preferences, context-loss fallback, and no-JavaScript posters. No unexpected page errors were observed. Geometry and browser evidence is retained under ignored `.alkemist/engineering-*`. Publication uses the existing native Git preview-first flow.

Final read-only review found no actionable runtime, lifecycle, annotation, zoom, or scientific-status issues. Native in-app inspection confirmed the detailed mechanism renders and explicit Play/Pause works with the browser's reduced-motion preference. The new article renders four images and ten KaTeX expressions without desktop overflow. Formatting and whitespace checks pass.
