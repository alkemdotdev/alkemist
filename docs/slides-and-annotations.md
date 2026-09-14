# Browser slides and shared annotations

Alkemist uses Astro's Markdown/MDX compiler, Reveal.js for presentation, and the existing widget components. The default collection is `src/content/slides/`; its index is `/slides/`, and each entry appears at `/slides/<id>/`. The demo and generated starter both include this convention.

## Authoring contract

Enable `alkemist({ slides: true })`. Only documents with `format: slides` interpret top-level Markdown rules as slide boundaries. Articles keep their horizontal rules. Markdown parsing, math, highlighting, and component rendering happen once, before presentation enhancement.

```md
---
title: First talk
description: One question and one observation.
format: slides
incremental: true
---

# The question

What changed between these two runs?

<!-- notes: Introduce the experiment before showing the result. -->

---

## The observation

- State the result.
- Link the source.[^source]

[^source]: Keep a reference beside the claim it supports.
```

Plain `.md` supports headings, lists, tables, task lists, strikethrough, links, images, quotes, code fences, math, and footnotes. With slide authoring enabled, GitHub-style `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]` blockquotes become callouts; `mermaid` fences become lazy diagrams with their source retained. These two enhancements also work in ordinary articles.

Use `.mdx` for interactive or specialized components. Decks automatically import unbound `Chart`, `Model`, `Shader`, `Math`, `Code`, `Audio`, `Video`, `Midi`, `Diagram`, `Note`, `Step`, and `SpeakerNotes`. Explicit imports and local bindings win. Custom components use normal imports. This import convenience is limited to `format: slides` documents.

```mdx
<Chart
  id="signal"
  src="/test/oscillation.csv"
  x="time"
  y="position"
  title="Damped oscillator"
  sample
/>

<Note for="signal">An analytic test fixture, not measured data.</Note>

<Step>Compare the envelope with the frequency.</Step>

<SpeakerNotes>Ask which parameter controls the decay.</SpeakerNotes>
```

`incremental: true` reveals list items in order, regardless of the list marker used. `<Step>` reveals a block; `<Step each>` reveals direct children, or list items when its sole child is a list. All steps remain visible in reading and no-JavaScript views.

Speaker comments in `.md` must use the explicit `<!-- notes: ... -->` form. Ordinary comments remain comments. MDX uses `<SpeakerNotes>` because MDX does not accept HTML comments. Footnotes stay reader-visible and are rendered on each referencing slide. Speaker notes are hidden from the reading canvas but remain in distributed HTML.

The Chart, Model, Shader, Audio, Video, and Midi components accept optional `id`. A `Note` links to the named figure; Slides adds its accessible description relationship and reports a missing target visibly. Point/coordinate annotations, presenter drawing, and saved ink are not implemented.

## Reusable components

Import components and their prop types from the same lowercase entry:

```astro
---
import Slides, {
  type SlidesProps,
} from '@alkemdotdev/alkemist-components/slides';
---

<Slides title="A talk" embedded>
  <section data-alk-slide id="question"><h1>The question</h1></section>
  <section data-alk-slide id="result"><h2>The result</h2></section>
</Slides>
```

`Slides` accepts `title`, optional `description`, `view` (`present` by default), `embedded`, `id`, `theme`, `transition`, `aspect`, plus optional `class` and `style` for a site-owned custom surface. Themes are `inherit`, `paper`, `chalk`, and `blueprint`; transitions are `none`, `fade`, and `slide`; `aspect` defaults to responsive `auto` and can be fixed to `16:9` or `4:3`. It is a component inside a host layout, not a document wrapper. A collection route passes the `Content` returned by Astro's `render(entry)` into its slot. The compiler creates the semantic sections for Markdown authors.

Decks infer a layout from their content: title, split image/prose, media, quote, or content. Use `<!-- layout: split -->` in Markdown or `{/* layout: split */}` in MDX directly before a slide when that inference needs an explicit override. The reading document remains responsive and contains the same semantic sections. The theme variables `--alk-slide-background`, `--alk-slide-foreground`, `--alk-slide-accent`, `--alk-slide-font`, and `--alk-slide-heading-font` support site-owned custom surfaces.

Present uses an immersive stage with Overview, a compact Tools menu, keyboard help, optional timed advance, a laser pointer, and blackout. Browser shortcuts and native form controls retain their own keys. Overview excerpts exclude speaker notes.

Standalone decks keep deep links and provide a presenter window with current/upcoming slides and notes. Embedded instances namespace their IDs, avoid URL navigation, and keep independent controls. Presenter windows are available on standalone decks. Small screens start in reading mode; Present remains available. Without JavaScript, the same server-rendered document stays readable.

Reveal's Markdown, math, and highlighting plugins are unnecessary: Astro already owns those operations. Reveal itself loads only when a reader starts presentation. Mermaid loads only when a diagram approaches the visible area. Each widget retains its own lazy engine and lifecycle.

## Widget lifecycle and printing

Slides signals active/inactive state to the existing widgets. Hidden slides and unrevealed steps do not start engines. Leaving a slide pauses media and GPU animation; returning preserves the widget instance and its controls. Audio/video/MIDI playback requires a new user action after leaving a slide. Model and shader animation can resume their previously selected state. Document visibility and element disconnection retain the existing cleanup paths.

Keyboard navigation is scoped to the focused deck and yields to inputs, media editors, links, buttons, and canvases. Existing widget controls remain usable. Resizing and fullscreen relayout the presentation. Oversized content stays scrollable rather than being silently clipped.

Print prepares the reading view, waits for lazy figures, and captures model/shader frames synchronously after a GPU redraw. It then opens the browser print dialog and restores the previous view afterward. Browser print uses page breaks between slides; it is not an editable PowerPoint or video export. Oversized authored slides may require layout adjustments for paper. Direct browser print without the component's preparation button can use a widget's existing static fallback.

## Examples and checks

The demo contains four authored decks:

- `working-with-a-signal.md`: Markdown, math, code metadata, image, local footnote, callout, Mermaid, and speaker comments.
- `field-notebook.mdx`: Chart, Model, Shader, figure notes, and steps.
- `listening-to-the-fixture.mdx`: Audio, Video, and the editable MIDI player.
- `layout-sampler.md`: title, image/prose, list, quote, table, and code layouts.

`npm run verify` checks compilation, contracts, the production build, local assets, and links. `npm run release:pack`, `npm run check:packages -- --keep`, and `npm run check:starter -- --keep` exercise installed packages and the generated site, including draft filtering, disabled sections, and deployment bases. `scripts/check-slides-browser.mjs` is a Playwright CLI regression flow for a production preview; its command is in the file header. Observed evidence and remaining limits belong in `docs/progress.md`.

## Design references

Marp supplies a useful precedent for Markdown separators, frontmatter, and speaker comments. Its image-alt directives and special incremental-list markers are renderer conventions; Alkemist does not claim Marp compatibility. Explicit `incremental` and Step keep behavior stable under formatting. [Marpit Markdown](https://marpit.marp.app/markdown), [directives](https://marpit.marp.app/directives), [fragmented lists](https://marpit.marp.app/fragmented-list).

Reveal supplies presentation behavior while preserving the Astro component model. [Initialization](https://revealjs.com/initialization/), [fragments](https://revealjs.com/fragments/), [speaker view](https://revealjs.com/speaker-view/). Mermaid uses its strict rendering mode and keeps a visible source/error fallback. [Mermaid usage](https://mermaid.js.org/config/usage.html).
