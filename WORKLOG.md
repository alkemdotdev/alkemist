# Shared themes and interactive figure focus — September 15, 2026

Make live parameters easy to expose, preserve widget state when focusing a figure, share named styles between site and slides, and simplify presentation chrome. Parent owns focus, Slides UI/runtime, demos, integration and delivery. `shared_theme_styles` owns shared styles/header; `widget_parameters` owns Shader/Chart parameter controls. The earlier native-presentation revision `0cae203` is now verified by production build identity.

- Default contract: Markdown still chooses ordinary layouts; components expose bounded live parameters. Named Neutral/Paper/Chalk/Blueprint styles are independent of Light/Dark/System and may be scoped to a deck.
- Focus uses the browser top layer for the existing widget, with explicit input ownership, Escape, focus return and preserved DOM state. Popovers are not natively modal: background inertness and keyboard containment are implemented deliberately. Sources: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using and https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (checked September 15, 2026).
- Required evidence: full verify/format, focused controls/theme/focus browser cases on desktop/mobile Chromium/WebKit, existing slide lifecycle/no-JS/installed-package regressions, branch preview then checked main deployment.
- Implementation complete on `feat/shared-themes-figure-focus`. Full verify: 124 tests, 117 validated pages; formatting, fresh packed consumers and generated starter pass. Chromium/WebKit pass focus, parameters, shared themes, mobile controls, existing slide/native-presentation regressions; six decks pass 108 layout cases with minimum 20px text. Two installed embedded decks retain unique IDs and resolve Focus within their own namespace. Evidence: `.alkemist/themes-focus-*.log` and browser scripts in `scripts/`.
- Review fixes include target-removal cleanup, late target binding, embedded target remapping, explicit invoker focus return in WebKit, authored attribute restoration, input ownership, eligible zoom reenable, shared parameter descriptors, and starter theme typing. Unsupported Popover retains usable inline controls. Parameter values stay local to the mounted figure; physical receiver use is not claimed.
- Delivery: ready for branch-preview verification, then main promotion. Coordinated Changeset and development article included.

## Previous milestone

# Native presentation standards — September 14, 2026

Research and implement browser capabilities in shared components and Slides: local text annotations, opt-in display wake lock, attached-display choice, floating speaker notes, synchronized audience windows, and optional casting. Preserve Markdown, one mounted local widget tree, current speaker view, and graceful reading mode.

- Parent owns Slides native capability/session modules, component exports, integration, docs, verification and delivery.
- `standards_research` owns `docs/browser-presentation-standards.md`; primary-source report complete, activation and BCD caveats corrected.
- `annotations_native` owns the Annotations component/helpers, tests and standalone Labs demo.
- Baseline: clean `0dc3bb6`; branch `feat/browser-presentation-standards`. Browser/device permission denial and disconnect must remain visible; physical projector/cast operation needs hardware and is not implied by simulated tests.
- Validation: full verify passes (121 tests, 111 validated output pages); formatting passes. Chromium 153 and WebKit 26.5 pass native session/receiver adapters and local audience navigation/reload/end/resume; both granted a real wake lock. Chromium opened real Document PiP. Both browsers pass annotation save/edit/reload/export/import/delete/go-to/storage fallback and slide persistence. Existing widgets/notes/print/media/no-JS regressions pass. All 92 viewport/slide cases fit, minimum 20px text. Packed components/starter and two independently installed embedded decks pass.
- Evidence: `.alkemist/native-verify-final.log`, `native-format-final.log`, `native-browser-final.log`, `native-webkit-final.log`, `native-layouts.log`, `annotations-browser.log`, `annotations-webkit.log`, `native-packages.log`, `native-starter.log`, `native-embedded.log`. Scope review fixed late permission grants, denied channels, audience Escape, receiver blackout on disconnect, and Unicode annotation offsets. Physical display placement/casting remain untested.
- Follow-up: the first preview `86a9412` passed native/annotation browser checks and deployment identity before main promotion. A final keyboard review found Escape closing new dialogs also left Present; the handler now closes any open deck dialog first, covered for annotations and display selection.
- Receiver privacy: annotation loading is disabled in audience/cast/speaker-preview documents, preventing origin-shared local storage from painting private reader highlights on another view; browser regression saves a note before opening an audience window.
- Delivery pending: verified branch preview, then checked main deployment. Source package release recorded by Changeset; no manual npm release.

## Previous milestone

# Presentation workspace — September 14, 2026

User requested native presenting modes, usable controls, theme/style support, illustrated decks with thumbnails, and responsive layouts that work without configuration.

- Parent owns responsive CSS, automatic content layout, compiler layout comments, integration, browser and release validation.
- `slide_widgets` owns the presentation controls/runtime and its browser regression script.
- `slides_site` owns demo/starter schemas, covers, index/routes, examples, and authoring documentation.
- Implemented: immersive Present/Read, overview, speaker view, keyboard help, pointer, blackout, timed advance, theme presets and CSS hooks, responsive auto layout plus optional aspect/slide overrides, four illustrated demo decks and starter cover.
- Design: existing Ubuntu/Caveat typography; inherited host tokens by default, paper/chalk/blueprint deck presets; slide uses the stage, controls stay quiet, optional tools live in one menu. Layout is CSS reflow via Reveal `disableLayout`, with bounded text fitting and readable overflow for excessive content. Source: https://revealjs.com/presentation-size/ (verified September 14, 2026).
- Observed: full verify passed (111 tests, 107 validated output pages), formatting passed, and fresh tarball-backed packages/starter passed. Chromium 153 and WebKit 26.5 pass controls, actual timed navigation, aspect ratios, theme tokens, presenter synchronization, lifecycle, media, print capture, mobile and no-JavaScript checks. All 76 slide/viewport cases fit without horizontal or vertical content overflow at 1440, 1280, 1024, and 390px; minimum text size is 20px. Evidence: `.alkemist/presentation-*-final.log` and `presentation-verify.log`.
- Browser review fixed injected Astro scripts being counted as prose, native summary/modifier keyboard handling, overview speaker-note leakage and focus, multi-image split overlap, tablet video sizing, and teardown reactivating a disposed model during WebKit pagehide. SVG covers now build in the fresh starter.
- Follow-up: the first preview `86a9412` passed native/annotation browser checks and deployment identity before main promotion. A final keyboard review found Escape closing new dialogs also left Present; the handler now closes any open deck dialog first, covered for annotations and display selection.
- Receiver privacy: annotation loading is disabled in audience/cast/speaker-preview documents, preventing origin-shared local storage from painting private reader highlights on another view; browser regression saves a note before opening an audience window.
- Delivery pending: branch preview and checked main deployment. No PDF pagination, editable PowerPoint, video export, or saved presenter ink claim.
- Gates: full verify, format, independent installed packages/starter, desktop/mobile and WebKit interaction/layout checks, branch preview then checked main deployment. Existing widget state, print capture, embedded identity and no-JavaScript reading remain regression requirements.

## Previous milestone

# Browser slides — implementation, September 14, 2026

User authorized Markdown-first native browser slides and test presentations, with `/slides/` and `src/content/slides/` as defaults alongside Blog. Preserve existing article and widget behavior. Design source: `docs/slides-and-annotations.md`.

- Parent owns presentation runtime, note/step/diagram components, widget lifecycle, dependencies, integration, release checks, and browser validation.
- `slides_compiler` owns the opt-in Astro Markdown/MDX transform and focused compiler tests.
- `slides_site` owns demo and starter collections/routes/content/navigation/documentation.
- Implemented: opt-in AST compilation, shared Slides/Note/Step/SpeakerNotes/Diagram components, widget activation, default collection/routes in demo and starter, and three example decks.
- Observed: full verify passed (109 tests, 105 validated pages). Chromium and WebKit exercised controls, notes synchronization, media pause, preserved widget instances, GPU print captures, 390px reading, and no-JavaScript fallback. Two installed embedded decks keep unique IDs, valid ARIA targets, separate positions, and no URL hash changes.
- Evidence: `.alkemist/slides-verify.log`, `slides-browser.log`, `slides-webkit-browser.log`, `slides-embedded.log`, `slides-packages-check.log`, `slides-starter-check.log`, and `slides-*.png`. Browser regression scripts are in `scripts/check-slides*browser.mjs`.
- Limits: no editable PPTX/video export, point annotations, or presenter ink. Presenter windows belong to standalone decks. Print layout was inspected in browser print media; paper pagination remains dependent on authored content and printer settings.

## Previous milestone record

# Optional publishing sections

## Objective

Implement and push optional Blog (developed writing), Logs (quick notes), Labs (interactive one-off apps), Docs (project reference), and Book (curated ordered guide), preserving Info. These are project-owned conventions rather than a required taxonomy.

## Ownership and scope

- Parent: public adoption docs, agent setup guide, homepage links, deployment checks, integration, browser verification, Git/Cloudflare delivery.
- sections_demo: demo section configuration, navigation, new Logs and Book collections/routes/content.
- sections_starter: source template, optional route generation, starter configuration tests.
- All existing published article URLs remain valid. No npm version bump or publication is part of this milestone; a pending Changeset records the starter addition for a deliberate future release.

## Required checks

- Full `npm run verify`, format, and independent `npm run check:starter`.
- Starter disabled-section and custom-base checks; drafts excluded; book order/navigation.
- Desktop/mobile browser review of Logs, Book, and expanded navigation.
- Commit and push, verify Cloudflare branch preview, then promote checked source to main and verify production identity.

## Prior release state

The four `1.0.0-beta.1` npm packages exist, and fresh registry consumers plus the published generator passed. Trusted publisher bindings were created and read back. npm initially attached `latest` to beta; tag cleanup is unresolved after authentication and DELETE errors. The user explicitly moved focus away from repeated publishing. Keep that issue recorded without blocking this website milestone or silently publishing another package version.

## Validation completed

Full verify, format, independent starter (including optional sections/drafts/base paths), and packed consumers pass. Browser chapter flow, log permalinks, and responsive navigation pass. Evidence: `.alkemist/verify-sections.log`, `.alkemist/starter-sections.log`, `.alkemist/packages-sections.log`. Starter fixture `/var/folders/vw/dfz65vvd78n17m0mty_gr1ww0000gn/T/alkemist-consumer-4SL2sm/my-lab` was reviewed under `/sections/`. Remaining delivery: branch preview and main production identity checks.

## Added scope: post images

User requested thumbnail display and asked about using the same image in posts. Implement optional blog `cover` frontmatter shared by listing thumbnail and article header, with crop/contain, focal coordinates, caption, and `showInPost`. Clarification about “form fill” is pending; do not infer a CMS or authoring form. Keep source-starter and demo contracts aligned and test missing covers and thumbnail-only covers.

Post-image implementation complete. Full verify and independent starter image cases pass. Docs examples were copied into a generated site and passed its build/link check. User did not clarify “form fill”; implementation uses fit/crop controls, not an authoring UI. Remaining: final branch preview, CI, main promotion, and production check.
