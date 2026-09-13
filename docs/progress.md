# Alkemist progress

## 2026-09-11 — Public source preview

Alkemist is now public at [github.com/alkemdotdev/alkemist](https://github.com/alkemdotdev/alkemist). The repository has an Apache-2.0 license, a public description and homepage, and explicit source-preview boundaries: `@alkemdotdev/alkemist-components`, `@alkemdotdev/alkemist-theme`, and `@alkemdotdev/alkemist-astro` carry complete future npm metadata but remain `private` until a deliberate beta release. `.npmrc` is ignored so local registry credentials cannot be added accidentally.

The complete Git history was scanned with Gitleaks with no findings. `npm run format:check`, `npm run verify` (76 Astro files, zero diagnostics, 26 tests, 43 pages, links/assets/build identity), and `npm run check:starter` all passed. The starter gate used packed dependencies in an external installation and confirmed changed-snapshot updates preserve site content, configuration, and assets byte-for-byte.

The Cloudflare reconciler now identifies a repository by immutable `owner_id` and `repo_id`; it still refuses a rebind, while tolerating Cloudflare's stale legacy owner name after a verified organization rename. Its managed readback passed. Preview and production deployments of `202a42347d4fb82abf26ed468c8721cb67fbb915` passed the HTTPS deployment contract: exact `/build.json` identity, canonical routes, machine-readable guides, legacy redirects, robots policy, and 404 response. GitHub Actions independently rebuilt and verified the same main revision successfully.

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

- Adopted the initial public component and exported type names; the current source uses their plain forms.
- Expanded the chart design to bars, pies/donuts, statistical charts, composition, and full Vega-Lite/Vega specifications.
- Implemented Astro 7.3.2 workspace packages, the shared `Layout`/theme, six documentation pages, the component roadmap, and a development notebook article.
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

New reusable package components: Math (KaTeX HTML+MathML), Code (Shiki with captions/highlighted lines/copy), Chart (six CSV presets through Vega-Lite/Vega), Model (real GLB/glTF through Three.js), and Shader (fixed WebGL2 interference study with frequency/angle/play controls). Shared Markdown/MDX processing has the same code and math defaults. Resolved rehype-katex's transitive KaTeX version to the same 0.18.7 renderer/CSS used by Math; malformed math fails builds. Rendering engines are lazy; model/shader motion is opt-in and stops offscreen.

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

The shared `Layout` exposes main, More, and footer link arrays. Extra links default to empty; the demo's `SiteLayout` owns its documentation links. Consuming projects can omit Docs or use it for their own documentation. More uses native details/summary with Escape focus return and outside-click dismissal.

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

Site-owned ProofBench uses the current Chart, Model, Math, and Code APIs. It presents real CSV/GLB data, keyboard tabs, component-source disclosures, and a small sine-frequency widget. The example site compositions are explicitly labelled as proposed presets. Selection controls support a preferred direction, a checklist, local notes, clipboard output, and a JSON download; they do not publish the choice. New source belongs to the demo site, with no shared-package API change.

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

## 2026-09-08 — Color in the detailed models, local review

The next review found the engineering treatment too dry and requested local iteration. Kept the detailed geometry and added shared-ink color: cobalt/violet/rose across Enneper, cobalt/cyan/teal across Gyroid with warm section curves, colored dipole shell families around a vermilion reference sphere, and cobalt housing/teal carrier/vermilion sun gear in Reduction. A typed optional surface color ramp interpolates palette stops in linear color space along a local coordinate. These finishes are illustrative, not measured quantities. Handwritten colored notes return beneath the equations and remain visible on narrow screens.

Captured new transparent stills in `forms-color` while preserving the previous `forms-engineering` and `forms` images. Added a short local development article and updated the customization guide with the color and capture sources. The geometry, mathematical definitions, lifecycle, and shared package API remain intact.

Local `npm run verify` passed with zero Astro diagnostics, 25 passing tests, and 47 generated HTML files with links/assets/build identity checked. Browser review covered every take at 1440px, 390px, and 320px on both boards. All rendered without horizontal overflow; handwritten notes remained visible, reduced motion started still, Play/Pause worked, paused colors stayed pixel-identical, Zoom retained the live surfaces, and technical annotation toggles worked. Comparison engines stayed idle and the new article displayed its actual captured images. No page errors were observed. Evidence is retained in `.alkemist/color-*`. This iteration is local: no push or Cloudflare deployment. The development server is left running for review.

## 2026-09-08 — Fields with substance, local review

Built four new subjects in a separate `/labs/field-studies/` round after the review favored Dipole's layers but asked for more substance. Flux core adds forty finite-thickness ribbons across four shells around a ribbed warm center. Toroidal weave wraps a solid warm torus in two counterwound families and fine fibers. Vortex layers twelve outer ribbons, six inner ribbons, and a fluted core. Knot core carries smaller braided strands and warm inlays around a thick trefoil tube. The shared ink palette and bounded quiet motion continue. These are field-inspired parametric sculptures, not physical simulations; the development article explains their constructions and limits with actual captured stills.

The new page gives the art more room, removes the inspection grid/frame, and starts with technical annotations hidden. Each gallery has its own take validation and preference key, so the earlier Enneper/Gyroid/Dipole/Reduction choices remain distinct. An optional image poster on the site-owned FormArt component keeps the same rendered artwork visible when graphics are unavailable. The comparison does not mount graphics engines. The new capture recipe, source PNGs, Labs entry, customization guide, and route checks accompany the page. The homepage and shared package API are unchanged.

Geometry audits found 126,464, 162,816, 139,376, and 163,840 triangles respectively, finite coordinates and normals, valid indices, zero degenerate faces, and geometry inside declared radii. `npm run verify` passed: 68 Astro files with zero diagnostics, 25 tests, and 49 generated HTML files with links/assets/build identity checked. Formatting and whitespace checks passed.

Static-build browser checks covered all four takes at 1440px, 390px, and 320px on both boards. No horizontal overflow or unexpected page errors were observed. Comparison images loaded with all engines idle; opening a card initialized only that form and moved focus to its heading. Default motion painted eleven frames in a half-second sample, Pause stopped drawing with pixel-identical captures, zoom and keyboard controls changed the view, offscreen rendering stopped, and reduced-motion/lifecycle restoration paused correctly. Checkboxes, browser Back, theme controls, copied choices, saved preferences, and separation from the previous gallery worked. Context loss exposed the new image fallback and removed the failed canvas from keyboard/assistive navigation; a no-JavaScript context retained artwork and navigation. Desktop/mobile screenshots were inspected, and the native in-app browser opened the new local comparison. Evidence is retained under ignored `.alkemist/field-*` files.

This iteration is committed locally only. No push or Cloudflare deployment was performed; the development server remains available on port 4335 for review.

## 2026-09-08 — Flux core on the homepage, local review

Adopted Flux core as the homepage opening after the user approved moving forward. The site-owned FluxHero component pairs a short introduction with the live layered sculpture, then leads into three concrete toolkit entries, the existing agent/terminal setup flow, and the development notebook. Ubuntu, the shared inks, both boards, and one handwritten annotation carry the visual direction. On phones the headline is followed by the sculpture, then the description and actions. Source-access requirements remain visible.

Added a hero presentation to FormArt: study labels/equations are omitted, the poster is prioritized, and camera framing is slightly closer. Common canvas/control styles moved into forms/art.css so the homepage does not import gallery layouts. The geometry and rendering lifecycle remain shared with Labs. Updated the customization guide and added a development article with an actual homepage capture and a repeatable capture recipe. The theme package and starter content remain independently customizable.

`npm run verify` passed: 69 Astro files with zero diagnostics, 25 tests, and 50 generated HTML files with links/assets/build identity checked. Formatting and whitespace checks passed. Browser checks covered 1440px, 768px, 390px, and 320px on both boards, with no horizontal overflow. The closer hero rendered eleven frames in a half-second motion sample; Pause stopped rendering with pixel-identical captures, zoom/keyboard controls changed the view, and the setup anchor scrolled the artwork out of view and suspended rendering. Reduced motion started paused. The three provider prompts copied correctly, terminal commands matched the chosen provider, and setup tabs supported keyboard navigation. Context loss and no-JavaScript checks retained the still and useful navigation. Regression checks retained equations and technical labels in both the new field study and the earlier Dipole study. No unexpected page errors were observed.

Actual desktop/mobile screenshots were inspected in Chromium and the local homepage was opened in the native app browser. Development-server CSS was stale after a hot update; restarting the owned server refreshed it, and the static build independently verified the final styling. Browser instrumentation was corrected to avoid double-counting draws across repeated test runs. Evidence is retained under ignored .alkemist/home-flux-* and home-final-* files.

Committed locally only, with no push or deployment. The local development server remains running on port 4335.

## 2026-09-08 — A more direct interface

Simplified the homepage copy and inner-page typography while preserving the approved Flux core opening, Ubuntu fonts, handwritten notes, and shared inks. Blog is a compact dated index; Info explains ownership and the source-preview status directly. Labs puts working tools first and keeps all five design-study routes in a collapsed Design notebook. No historical routes were removed.

Documentation now has grouped navigation, a compact index, mobile navigation that starts collapsed, and section links for longer references. The component catalog pairs six implemented components with live examples, copyable source, and reference links. The Test page retains its rich examples and stable anchors, with ten source disclosures beside the model, math, charts, code, and shader. Charts, models, and shaders share quieter figure headings, controls, status messages, and source footers. Public component props, runtime hooks, and rendering engines are unchanged. Shared styling belongs to the UI package; site navigation, editorial content, and example organization remain site-owned.

Local validation passed: `npm run verify` checked 73 Astro files with no diagnostics, passed 25 tests, and validated 51 generated HTML pages with internal links, assets, and build identity. The independent starter gate installed and updated actual package snapshots outside the repository while preserving consuming-site content, configuration, and assets. Formatting, whitespace checks, and an independent implementation review passed.

Static-build browser checks passed 76 assertions with zero page exceptions. Desktop and 768px, 390px, and 320px layouts were checked on both boards. Live charts/models/shaders, math, source copying, mobile docs navigation, section anchors, all historical Labs links, homepage motion controls, and the provider-specific setup prompt worked. Additional figure checks forced failed asset loads, verified useful posters/downloads, and recovered a chart through Retry. Actual desktop/mobile screenshots were inspected. Scripts, reports, and captures are retained in ignored `.alkemist/cleanup-*`, `.alkemist/figure-cleanup-*`, and `.alkemist/specimen-cleanup-*` artifacts.

The user authorized publishing this cleanup together with the three earlier local art/homepage commits. Cloudflare's live configuration matches `infra/cloudflare.json`, including native Git production and all-branch previews. Publication follows the branch-preview-then-main flow; exact deployed revisions and remote checks are recorded by the deployment verifier in `.alkemist/deployments/`. This entry records completed local validation, not a claim that the remote release has already finished.

## 2026-09-08 — Compact navigation and appearance

Replaced the second navigation row on small screens with a hamburger disclosure containing the same primary and secondary links. Desktop retains Blog, Labs, Info, and More. A compact appearance icon opens labeled Whiteboard, Blackboard, and System choices with sun, moon, and monitor icons. Both controls have 44px targets, visible focus, Escape dismissal, and outside-click dismissal. Only one header panel opens at a time. Navigation remains usable without JavaScript; the appearance control is revealed when its controller is ready.

The shared layout restores the saved palette before paint. The typed theme helper lets widgets read and set the preference without depending on header markup, while preserving the existing renderer theme-change event. Both sets of Labs studies now use that helper and preserve their board URLs and controls. The navigation reference and interface development article document the behavior.

`npm run verify` passed with 76 Astro files, zero diagnostics, 25 passing tests, and 51 validated HTML pages. The independent starter installation and changed-snapshot update gate passed. Static-browser validation passed 67 assertions with no page exceptions: 320px, 390px, 650px, 768px, and desktop layouts on both boards; keyboard menus and radios; saved and system preferences; chart refresh; Labs URL/radio synchronization; storage-disabled theme selection; and navigation without JavaScript. Actual desktop/mobile screenshots were inspected. Review caught a skip-link stacking issue, and browser checks caught arrow-key radio selection prematurely closing the appearance panel; both were fixed. A test's outside-click target was corrected to lie outside the open panel, and a final build regenerated a corrected article heading.

Formatting and whitespace checks passed. Local scripts and screenshots are retained in ignored `.alkemist/header-*` artifacts. Publication uses the existing native Git branch preview, followed by main and exact deployed-revision checks.

## 2026-09-08 — Fewer repeated labels

Removed the homepage's format labels and repeated calls to action. The three feature links now use one descriptive heading and one factual sentence each. The hero's audience moves into its description, the demo omits the optional header tagline, and project links name their destinations directly. Setup keeps its provider controls, commands, prompts, and access requirements with a smaller heading and less preamble. The art and handwritten annotation remain.

Docs pages no longer repeat Documentation above the title. The docs index removes duplicate setup links and group descriptions that paraphrased the links; agent instructions join Getting started in both the index and navigation. Labs removes category labels and uses one Design studies disclosure for the five existing galleries. Test and the interference lab omit redundant section labels. Figure names, units, data provenance, useful control labels, and source-access requirements remain. These are site-owned editorial changes; the public component APIs and visualization engines are unchanged.

The full verification gate passed with 76 Astro files, no diagnostics, 25 tests, and 51 checked HTML pages. Final docs edits passed a fresh type/content check and build/link check. Static browser validation passed 45 assertions with no page exceptions, covering desktop, 768px, 390px, and 320px homepage layouts on both boards; all three copied setup prompts; keyboard tabs; changed inner pages; retained study links; live charts; and homepage motion controls. Four additional checks verified the final docs directory at desktop, 390px, and 320px and its single agent link in navigation. Actual homepage, feature-link, project-link, and mobile docs screenshots were inspected.

The interface article records the before/after example, and AGENTS.md now asks for descriptive headings and concrete link labels without repeated decorative categories or calls to action. Formatting and whitespace checks passed. Evidence lives in ignored `.alkemist/plain-*` files; publication follows the existing native Git preview-then-main flow.

## 2026-09-08 — Artwork without viewer chrome

Removed the homepage sculpture's toolbar, drag hint, handwritten note, caption link, and divider. Hero presentation now emits only its viewport and still/live artwork; it does not reserve space for absent controls or display a diagnostic paragraph when graphics are unavailable. Study presentation retains its controls, equations, annotations, and useful error status. Shared runtime control references are optional to support the two presentations.

The approved Flux core geometry, colors, framing, and gentle motion remain. Clicking or tapping the artwork toggles motion; dragging leaves it paused. The art is a keyboard-accessible motion toggle with Space/Enter, retains arrow-key turning and Home reset, and exposes its current state to assistive technology. Reduced motion starts still, offscreen rendering suspends, and the loaded image remains available without JavaScript or WebGL. The homepage guide, interface article, and project conventions document the distinction. Changes stay in the consuming site and its documentation; package APIs are unchanged.

`npm run verify` passed with 76 Astro files and zero diagnostics, 25 tests, and 51 generated HTML pages checked. Static-browser validation passed 51 assertions with no page exceptions, plus six mobile touch checks. Actual desktop and phone screenshots were inspected on both boards; 768px and 320px widths also fit without overflow. Motion stayed within the 30 fps cap; click/keyboard pause stopped drawing and retained identical pixels. Context loss, unavailable graphics, and no-JavaScript views kept clean posters. Labs controls and visible failure messages remained usable. Test corrections waited for the asynchronous reduced-motion event, avoided duplicate frame instrumentation, and targeted the active study canvas instead of a hidden comparison. Evidence lives under ignored `.alkemist/bare-hero-*` files.

Cloudflare's live managed configuration matches `infra/cloudflare.json`. Publication follows the existing native Git branch preview, then main after preview verification; exact remote evidence is recorded separately under `.alkemist/deployments/`.

## 2026-09-08 — Docs in primary navigation

The demo header now reads Blog, Labs, Docs, Info, and More. More contains only Test and uses the shared line icon as a downward chevron. The mobile menu preserves that order, with Test in its secondary group. Docs remains optional for consuming sites: the demo owns the extra primary link in SiteLayout, while Layout's default links are unchanged. Updated the navigation reference and development articles to describe the current layout.

`npm run verify` passed with zero Astro diagnostics, 25 tests, and 51 checked HTML pages. The independent starter gate passed packed installation, changed-package updates, production and GitLab preview subpaths, lockfile reinstall, and provider scaffolds. Browser validation passed 63 assertions without page exceptions: both boards at 1440px, 768px, 651px, 650px, 390px, and 320px; single-row layout and unclipped identity; exact link order; direct Docs navigation and nested-section highlighting; keyboard and outside-click dismissal; mobile appearance/menu exclusion; and no-JavaScript navigation. Desktop, narrow desktop, and mobile-menu screenshots were inspected. Evidence is retained under ignored `.alkemist/docs-nav-*` files. Publication uses the native Git preview-then-main workflow.

## 2026-09-12 — Coordinated package beta preparation

Prepared the public package boundary as `@alkemdotdev/alkemist-components`,
`@alkemdotdev/alkemist-theme`, `@alkemdotdev/alkemist-astro`, and `create-alkemist` at
`1.0.0-beta.1`. The site, adoption guide, agent instructions, component catalog,
and package publishing guide now distinguish importing one component, opting
into theme or integration behavior, generating a complete npm site, and using
the existing tarball source generator with `--update`.

Registry publication remains pending npm organization bootstrap. The release
policy records fixed versions through Changesets, `beta` before promotion to
`latest`, GitHub OIDC rather than an npm secret, and unchanged Cloudflare Git
builds. This entry records prepared documentation and package boundaries; it
does not claim an npm publication or deployment.

## 2026-09-12 — Component release validation

The npm account is authenticated as `alkemdotdev` and account-level 2FA is enabled. Public packages use `@alkemdotdev/alkemist-{components,theme,astro}` plus `create-alkemist`. GitHub permits automated release PRs while keeping default workflow permissions read-only; the npm environment permits `main` only.

Local verification passed: `npm run verify` (77 checked files, no errors/warnings; 52 output pages checked), independent starter and upgrade preservation, and actual packed package consumption with standalone styles, host-owned MDX, strict invalid-math rejection, and lockfile reinstall. Browser review exercised desktop/mobile docs and standalone figures. It exposed and corrected component box-sizing and palette fallbacks that had relied on the full theme. Registry publication and deployed release identity are still pending.

## 2026-09-12 — npm bootstrap and trusted publishers

All four `1.0.0-beta.1` publish commands succeeded. npm trusted publishers are configured for repository `alkemdotdev/alkemist`, workflow `release.yml`, environment `npm`; each binding was read back. The initial publication used local authentication, so it does not establish OIDC publication provenance. The registry consumer gate is still pending: the npm website shows public packages, but components and Astro initially returned registry 404 responses. Initial publication also attached `latest` to beta versions; its removal requires a separate npm authentication. Main promotion remains pending these checks.

GitHub CI and the Cloudflare branch preview passed. Live deployment validation confirmed the source identity, pages, machine guides, redirects, and preview indexing rules. The updated published-state docs pass the full local verify gate.

## 2026-09-12 — Optional publishing sections

Added the project-owned Blog, Logs, Labs, Docs, and Book conventions while retaining Info. The demo enables all five: Logs renders short entries in a dated feed with permalinks, and Book provides a three-chapter practical guide with contents, heading links, and previous/next navigation. Existing published Blog, Docs, and Labs URLs remain intact. The homepage, adoption reference, and agent setup guide explain the distinction and the configurable source starter.

The source starter uses an ordered `sections` object in `src/lib/site.ts` for labels, navigation, and route generation. Disabled sections produce no index or detail pages; content remains editable. Blog/Logs require publication dates, Book requires chapter order, and drafts stay out of generated pages. The configuration and content belong to the adopting project. No package version was bumped or published; the scaffold is recorded in a Changeset for a future deliberate release.

Local checks passed: full verify (80 Astro files without diagnostics; 60 generated HTML pages checked), formatting, independent starter install and upgrade preservation, draft exclusion, chronological logs, disabled routes, renamed/reordered navigation, root and project-subpath deployment, and packed component consumers. Browser review exercised log permalinks, chapter contents and next/previous links, and navigation at 1440, 1001, 1000, 760, and 390 pixels. It caught and corrected custom starter labels squeezing the brand at tablet widths; the site-owned compact-menu breakpoint now preserves the name. No page overflow or browser errors were observed in the final demo checks.

## 2026-09-12 — Optional post thumbnails and covers

Blog frontmatter now accepts one optional local cover image with alt text, caption, cover/contain fit, bounded focal coordinates, and a switch for including it above the article body. The demo uses small 3:2 thumbnails alongside consistently aligned titles; articles retain natural image proportions. Coverless entries remain text rows, and thumbnail-only posts do not duplicate an existing body figure. Astro resolves local assets and produces responsive image output. The source starter includes the same fields and an editable original SVG illustration.

Full site verification passed with 61 checked output pages. The independent starter checks passed coverless, thumbnail-only, and article-cover cases alongside the section/upgrade checks. Browser review covered desktop/mobile thumbnail rows and a natural-aspect article cover with caption and no page overflow. Copying the Book's actual log and chart snippets into an independent generated site exposed missing required chart descriptions; the examples were corrected and the generated site then passed verification under `/sections/`.

The milestone was previewed at revision `5638fd5`, then merged to `main` as `0307979`. Main CI and production deployment checks passed, including exact build identity, representative routes, redirects, indexing, and missing-page behavior. Production Blog, Book, and Logs were also checked in the browser. npm publishing was skipped as intended. The separate version-PR job exposed an invalid Changesets source-revision pin that omitted its built executable; the workflow now pins the official built v2.1.2 release, whose action contract and executable were verified upstream.

## 2026-09-12 — Reusable post layouts

`PostList` now owns the reusable listing presentation in the component package. Sites supply typed content, sorting, URLs, and an optional featured selection; the component offers rows, a featured lead followed by rows, a grid, and a featured lead above a grid. One rendered collection supports an optional per-instance reader selector, with server-rendered content available before JavaScript. The demo and source starter default to featured plus grid, while keeping the choice site-owned. Reference documentation includes two live independent instances. npm publication remains deferred through a Changeset.

Site verification, independent starter install/upgrade preservation, and packed component consumers passed. The consumer checks exercise public prop imports, explicit lead order without duplicate rendering, empty lists, and use without the full theme. Browser checks exercised all four modes, a two-column desktop grid, a single-column mobile grid, coverless entries, and independent instances. They caught an oversized featured image and mobile grid entries inheriting row presentation; both were corrected. Final observed lists retained their item counts and had no horizontal overflow or browser errors.

## 2026-09-12 — Plain source API documentation

Rewrote the source and site documentation for plain component and type names,
lowercase extensionless component entries, and type imports from the matching
component entry. Onboarding and hosting guides now use the packed source
generator; the published beta package line is documented as the earlier API.
No package version was changed or published. Validation evidence is recorded
with the corresponding implementation checks.

The implementation removes the component root barrel and legacy exports, places each component and its public types behind one direct entry, and separates browser clients from pure helpers. The demo, starter, integration, theme types, and executable examples now use the same plain API. Full verification passed with 64 checked output pages; formatting and independent packed-component and starter install/upgrade checks passed. Browser checks exercised lazy chart rendering, model camera/wireframe controls, shader frequency adjustment, and mobile PostList view switching without horizontal overflow or reported browser errors. A major Changeset records the breaking contract; npm publication remains deferred.

## 2026-09-12 — Search and automatic canary packages

Added the reusable Search entry and optional Layout control, with lazy Pagefind results, keyboard navigation, responsive dialog, bounded result batches, and recoverable loading/error states. The Astro integration builds an opt-in static index; demo and starter enable it. Indexing excludes redirects, error pages, shared navigation, generated math, and form controls. Browser review exercised real queries, mobile focus/dismissal, result navigation, and generated-site URLs beneath `/sections/`. Full site verification checked 66 output pages; independent starter installation/upgrades and packed component/generator checks passed.

The main release workflow now derives coordinated commit-addressed canaries, checks their exact tarballs, publishes through the existing npm OIDC environment, and tests fresh registry installations. Beta/stable Changesets releases remain separate. Canary source validation permits only the five exact derived package-version edits; an isolated Git fixture checks rejection of unexpected and tampered edits. Live OIDC publication evidence follows completion of the deployed workflow.

The first live canary publication verified GitHub OIDC and npm provenance for all four packages at source revision `a8f56dc`. Live execution exposed a circular import in the CLI and npm registry propagation after accepted uploads; the CLI contract split and bounded registry polling address these independently. Tests invoke the actual publish entrypoint and verify that missing registry data retries while different artifact bytes fail immediately.

## 2026-09-12 — npm bootstrap latest-tag contract

All four packages currently have `1.0.0-beta.1` on both `beta` and `latest`,
with no stable version published. npm accepted security-key authentication but
returned `E400` when asked to remove `latest`; the tag remains in place.
The release verifier now accepts that exact bootstrap tag only while the
package registry reports no stable version, and prints a visible notice. It
continues to reject every other prerelease or canary on `latest`, and rejects
the bootstrap exception once a stable version exists. Beta and stable
publication tags are unchanged. Documentation records this exception until
the first stable release instead of instructing an unconditional tag removal.

## 2026-09-12 — Inspectable component examples

The local component catalog now leads with npm canary installation, includes all eight component jump links, and renders selectable PostList and standalone Search examples alongside copyable Astro source. Reference pages add live chart presets, a shader study, Search props, and matching Code source/output. PostList release availability now reflects the canary channel.

`npm run verify` passed. The built local preview at port 4330 returned search results; the PostList selector changed layouts; chart data loaded with an inspectable table; shader frequency changed from 9.0 to 9.1. Desktop and 390px mobile browser inspection found no console errors, and the mobile search dialog returned results. The preview is left running for user inspection.

## 2026-09-13 — Documentation navigation and reading layout

Reworked the docs shell into a persistent navigation rail, reading column, and wide-screen section index. Current-page navigation uses a cobalt marker and tinted background; the section index follows scroll position. At narrow widths, documentation navigation collapses above the article and the page index becomes an inline disclosure. Existing examples and the shared site header remain in use. Corrected the docs overview's obsolete npm availability statement.

`npm run verify` passed. Browser inspection at 1440px and 390px confirmed the desktop reading layout, mobile menu expansion, and Model section link with its active location indicator. No browser console errors were observed. Changes remain local for design inspection at port 4330.

## 2026-09-13 — Reusable navigation and focused documentation

Reduced the main docs tree to Overview, Getting started, Components, Customize, and Publish. Detail pages are nested below their parent; maintainer references remain separate. Replaced the overview directory with two concrete adoption paths and a short customization/publishing sequence. Added concise Customize and Publish guides.

Navigation and TableOfContents now belong to the public component package, with explicit imports, typed data, scoped fallback styling, keyboard-operable native disclosures, and per-instance TOC cleanup. TOCs preserve depth 2–4 indentation. The docs shell consumes both components, including a TOC on the overview, and the navigation reference includes live examples.

Full verify and packed-package consumer checks passed. Browser checks confirmed branch expansion by keyboard, exact active page, indented subsection navigation, matching active location across TOC instances, and no mobile horizontal overflow or console errors. The new components remain local pending publication.

## 2026-09-13 — One start page and progressive navigation

Merged the docs overview and setup path at `/docs/`, labeled Getting started. The page contains complete npm setup commands and retains source/agent instructions in a disclosure. The previous getting-started route redirects to the unified page, and internal links use the canonical destination.

Navigation now defaults to `expandedDepth={1}` so first-level children are visible. Deeper branches expand along the current page path; callers can configure the initial depth. Expansion tests and full verification passed. Browser checks confirmed all root branches initially open and the old start URL redirecting to `/docs/`.

## 2026-09-13 — Dense sidebar with contextual page sections

Moved the page TOC into Navigation through its optional `headings` prop: only the current page renders section links directly beneath its page link. The docs shell now has one left navigation rail rather than a separate right or inline TOC. Nested heading indentation and active-section tracking remain intact.

Grouped component references into Pages and navigation, Charts, Math and code, and Models and shaders. Removed inherited list-item margins, reduced navigation row spacing, and kept larger coarse-pointer targets. Full verify passed; final style/documentation rebuild passed. Browser checks confirmed Charts → Props and defaults updates the hash and active sidebar section, and mobile navigation exposes the TOC without horizontal overflow or console errors. Changes remain local for inspection.

# Sidebar visual refinement — 2026-09-13

Reusable navigation now uses indentation instead of nested guide bars, stronger current-page text instead of selection blocks, and a small dot for the active section. Expandable branches retain chevrons.

Validation: npm run verify passed, including 69 pages and internal links/assets. Browser checks at 1280px and 390px confirmed mobile disclosure, section tracking, and no horizontal overflow or console errors. Available in the local preview.

## Content, Visualization, Graphics, Website — 2026-09-13

Reorganized the component catalog into four documentation groups within the existing components package. The overview now introduces those groups; category pages contain the examples, and detailed references use the same playground definitions.

Added the reusable Playground component and optional renderer entry. Each specimen has a real preview frame, generated Astro/HTML source, typed controls for every public component prop, presets/reset, copy, isolated theme, and width controls. There are 14 definitions: native HTML, image, audio, video, and the ten existing public content/website components. Structured props use JSON fields. Tests compare the controls against the public TypeScript interfaces to detect drift.

Shared markup renderers power both Astro output and live previews. Search now initializes and cleans up per instance; Code copying can reconnect after rendering. Navigation, Shader, and PostList interactions inside the frame synchronize back to controls/source. Native media fixtures are generated locally with scripts/generate-media-fixtures.mjs. Explicitly excluded preview documents stay out of site search.

Observed validation: full check/test/build and internal-link/asset checks; packed independent Astro consumer builds, including Playground and its renderers. Browser exercises covered all six chart presets, editable text/numbers, TeX success/error/reset, real Shiki output, native table/video output, glTF loading (9,216 triangles), Shader updates in both directions, Navigation JSON and current-page updates, TOC anchor tracking, PostList layout synchronization, Pagefind search after rerender, Layout menu/identity/search updates, and theme isolation. At 390px the playground had no horizontal page overflow. Changes remain available in the local preview for inspection.

## Dense playgrounds and richer source listings — 2026-09-13

Replaced preview width/theme controls with a compact property inspector. Short parameters and JSON use side-by-side rows; help appears on hover/focus. Source panes reuse Code with a filename and Copy, and preview frames have smaller padding. Reduced navigation hierarchy offsets by half. Native HTML/image/audio/video examples now live in a separate theme reference at `/docs/native-content/`; the Content component category contains Math and Code.

Code now supports focused lines, addition/removal markers, exact text highlights across syntax tokens, keyboard-accessible notes, collapsible ranges, and optional wrapping. Markdown fences share highlights, focus/ins/del/collapse ranges and wrap metadata. Folded source retains original line numbers, and copying preserves the full original input without notes or presentation markers. Invalid ranges fail explicitly. Math now shares its complete figure/caption markup with live previews, preserving labels after updates.

Validation: `npm run verify` passed (90 output pages with internal links/assets checked); package tarball consumer checks passed for standalone components, exported types, theme isolation, MDX, and a generated starter. Browser checks at 1440px and 390px exercised Explain/Changes presets, annotations, keyboard folding, copy acknowledgement, invalid JSON/reset, native-content separation, and mobile overflow. Annotation notes remain readable inside the narrow preview. Final build/test log: `.alkemist/dense-code-final-verify.log`; package-consumer log: `.alkemist/dense-code-consumers.log`. Updated docs and examples remain local for inspection at port 4330.

## Markdown-first authoring and Code text children — 2026-09-13

The Astro integration now injects scoped math/code CSS and the shared Copy enhancement when the corresponding rendering defaults are enabled. Plain Markdown and MDX fences use the shared Code transformer without depending on Layout; native headings/lists/tables remain semantic HTML, with global typography left to the host theme. Disabling code and math omits these injected assets.

Code accepts either an exact source prop or text children. Text children decode entities once and remove common author indentation/boundary blank lines. Plain paragraph wrappers generated by MDX are accepted; nested formatting and competing source inputs fail explicitly. Complex snippets use a string child because Astro/MDX parse template syntax before rendering slots. The entity decoder is a declared direct dependency; the integration now declares its theme dependency explicitly.

Validation: full `npm run verify` passed (90 pages); new integration opt-out and source-resolution tests passed. Packed consumer builds tested `.md` and `.mdx` fences without component imports, bare multiline MDX children, and Astro/MDX string children preserving literal tags/entities. Browser inspection confirmed automatic Code styling and successful Copy on a plain Markdown page using no Alkemist Layout; main docs show rendered bare and string-child examples. Logs: `.alkemist/markdown-slots-verify.log` and `.alkemist/markdown-slots-packages.log`. Changes remain local.

## Integrated authoring milestone — 2026-09-13

The Code playground now generates readable multiline text-child source using a reusable `textSlotProp` definition field. Escaping protects literal backslashes, backticks, template interpolation, and tags. Empty or whitespace-sensitive values retain an exact source prop. Generated examples are compiled in the packed consumer fixture, with source preservation checked against the original input. Removed a redundant inherited code option declaration and updated reference coverage.

The accumulated docs, navigation, category/playground, and Markdown authoring changes are prepared for branch-preview validation followed by production promotion. Local check/test/build/link verification passed; CI uses the same gates plus independent starter and packed-consumer builds. Browser automation artifacts stay local and are ignored by Git and formatting checks.

Branch-preview browser testing caught Astro template indentation in initial textarea values. Textareas now render escaped text directly, with the HTML-required initial newline accounted for; a built-output regression check compares the initial Code field against its definition exactly.
