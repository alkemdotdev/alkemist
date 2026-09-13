# Component embed review

Date: 2026-09-13. Reviewed all fourteen public components. The reproducible
[embed lab](https://alkemist.alkem.dev/labs/embeds/) renders twelve specimens
without Layout or the global theme, at selectable 320, 480, 640, and full widths.

## Evidence matrix

| Component       | Change or decision                                                                                                                     | Observed browser evidence                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout          | Keep as a full-page shell; use individual components inside existing pages.                                                            | Documentation shell reviewed at desktop and 390px; mobile search dialog opens/closes.                                                                                               |
| Math            | Reduce surrounding display-math spacing; retain horizontal overflow for long equations.                                                | 320px host fits; docs preview automatically sizes to 131px for the default equation.                                                                                                |
| Code            | Reduce outer spacing; retain filename, copy, source scrolling, and existing authoring features.                                        | 320px host fits with internal source scrolling; Copy changes to Copied.                                                                                                             |
| Audio           | Keep play, timeline/time, mute, and Settings; group secondary tools.                                                                   | Compact toolbar fits at 320px; native controls appear before enhancement.                                                                                                           |
| Video           | Same toolbar with primary fullscreen; secondary seek, volume, speed, captions, loop, chapters, and platform controls live in Settings. | Playback advances; High tone seeks into the last chapter; speed changes to 1.5x; caption language changes to Español; Loop toggles. Final closed toolbar fits in two rows at 320px. |
| Chart           | Remove generic type badges and ready diagnostics; keep synthetic-data provenance, download, and data-table disclosure.                 | Data table opens; bar preset regenerates the preview/source and retains visible Download CSV.                                                                                       |
| Midi            | Preserve the preceding direct-editing toolbar milestone.                                                                               | 320px host fits with intentional piano-roll scrolling. Earlier editing/playback evidence remains in progress.md.                                                                    |
| Model           | Container-sized canvas; View options groups secondary tools; ordinary wheel scroll belongs to the page.                                | Top and Wireframe work; ordinary wheel scrolling over the model advances the article.                                                                                               |
| Shader          | Container-sized canvas and compact controls; omit redundant format/formula framing.                                                    | Play/Pause changes animation state at 320px.                                                                                                                                        |
| Playground      | Full-width docs previews with Source/Parameters disclosures; optional fixed previewHeight for scrolling specimens.                     | Bar preset updates source and preview; Math auto-sizes; Navigation/TOC frames stay 440px high.                                                                                      |
| Navigation      | Keep established indented branch design; avoid nested navigation landmarks for attached section links.                                 | Docs branch and section links render at desktop/mobile widths.                                                                                                                      |
| TableOfContents | Omit empty output and preserve readable indentation.                                                                                   | Sidebar section click sets aria-current=location; Reference inside the preview scrolls its frame and becomes current.                                                               |
| PostList        | Tighten typography/spacing; leave no cover gutter for absent or unusable images.                                                       | Switch Featured + grid to Rows; coverless row occupies the available width.                                                                                                         |
| Search          | Scope styles; standalone field/results fit the host in document flow, including mobile. Header retains its dialog presentation.        | MIDI/models queries return results; results stay within the 320px host; Escape dismisses; mobile header dialog opens/closes.                                                        |

All twelve embed surfaces had matching client and scroll widths at 320px on a
desktop viewport and on a 390px viewport. This checks outer overflow; Code and
Midi intentionally retain internal horizontal scrolling. Screenshots covered
light standalone hosts and the dark documentation theme. No physical-device,
AirPlay, or persistent PiP/fullscreen claims are added by this review.

## Current boundaries and struggle points

- Layout owns a document shell; it is not an embedded widget.
- Shader is a fixed two-source interference study, not an arbitrary GLSL runner.
- Complex charts still need deliberate width, labels, and data-shape choices.
- Search requires a generated and served Pagefind index.
- At very small widths, moving infrequent controls into disclosures adds one
  click. The primary content and playback controls remain immediately available.

## Validation

`npm run verify` passed: zero Astro diagnostics, 92 tests, and 99 generated
pages with internal links and assets checked. `npm run release:pack` and
`npm run check:packages` passed standalone component/prop-type consumers,
theme isolation, MDX processing, and fresh packed-starter generation.
Deployment identity and routes are checked separately with
`scripts/check-deployment.mjs`; this file records the local review evidence.
