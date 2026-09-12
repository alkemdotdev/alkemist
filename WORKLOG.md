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
