# Browser slides — implementation, September 14, 2026

User authorized Markdown-first native browser slides and test presentations, with `/slides/` and `src/content/slides/` as defaults alongside Blog. Preserve existing article and widget behavior. Design source: `docs/slides-and-annotations.md`.

- Parent owns presentation runtime, note/step/diagram components, widget lifecycle, dependencies, integration, release checks, and browser validation.
- `slides_compiler` owns the opt-in Astro Markdown/MDX transform and focused compiler tests.
- `slides_site` owns demo and starter collections/routes/content/navigation/documentation.
- Implemented: opt-in AST compilation, shared Slides/Note/Step/SpeakerNotes/Diagram components, widget activation, default collection/routes in demo and starter, and three example decks.
- Observed: full verify passed (108 tests, 105 validated pages). Chromium and WebKit exercised controls, notes synchronization, media pause, preserved widget instances, GPU print captures, 390px reading, and no-JavaScript fallback. Two installed embedded decks keep unique IDs, valid ARIA targets, separate positions, and no URL hash changes.
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
