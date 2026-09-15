# @alkemdotdev/alkemist-components

Astro components for technical publishing: `Layout`, `Math`, `Code`,
`Audio`, `Video`, `Chart`, `Midi`, `Model`, `Shader`, `PostList`, `Search`,
`Navigation`, `TableOfContents`, `Playground`, `Presentation`, `Deck`, `Slide`, `Slides`, `Note`, `Step`,
`SpeakerNotes`, and `Diagram`.

Each component has a lowercase, extensionless public entry. Import its types
from the same entry; there is no root component barrel.

Import a component directly, for example:

```astro
---
import Chart from '@alkemdotdev/alkemist-components/chart';
---
```

`Layout` imports the full `@alkemdotdev/alkemist-theme/theme.css` theme. The standalone
math, code, chart, model, and shader components include scoped fallback tokens,
so they can be used in an existing site without the global reset.

Licensed under [Apache-2.0](./LICENSE).

`Search` is available from `@alkemdotdev/alkemist-components/search`. Enable `alkemist({ search: true })` to build a Pagefind index, then use `<Layout search>` or add `<Search />` to your own layout. Test with a production build and preview. See the [search guide](https://alkemist.alkem.dev/docs/search/).

`Navigation` accepts recursive `{ label, href, children? }` items and a
`currentPath`; it shows one child level by default and expands deeper branches containing the current page. Set `expandedDepth` to change the initial depth. Pass `headings` to display the current page’s table of contents directly beneath its link. Import it
from `@alkemdotdev/alkemist-components/navigation`.

`TableOfContents` accepts `{ depth, slug, text }` headings, renders depths 2–4,
and updates each rendered instance as the reader scrolls. Import it from
`@alkemdotdev/alkemist-components/table-of-contents`.

### Interactive examples

`/playground` exports `Playground`, its definition/control types, and source and validation helpers. Supply a declarative definition and a same-origin preview URL. The shell offers preview, highlighted source, dense parameter controls, presets, and reset. The adopting site owns the trusted preview frame and its renderer. See `/docs/playground/` in the demo site for the revision-checked message contract and a complete example.

The catalog is organized as Content, Visualization, Graphics, and Website. These are documentation categories within this package. Standard HTML/media specimens use native elements and the shared theme; they do not introduce wrapper components.

`Code` shares its Shiki transformer with Markdown fences. Use `highlightLines`,
`focusLines`, `addedLines`, `removedLines`, `highlightText`, `collapsedRanges`,
and `annotations` to explain source; `wrap` controls long lines. Copy includes
all original source, including folded sections. Types such as `CodeAnnotation`
and `CollapsedCodeRange` are exported from `/code`.

Code snippets can be authored as text children: `<Code>const answer = 42;</Code>`.
For braces, tags, or multiline source, use a string child such as
``<Code>{String.raw`const object = { value: 42 };`}</Code>``. Slots decode text
once and remove surrounding blank lines and common indentation. Use
`code={source}` for imported or generated source with exact whitespace.

### Embedding in an existing page

Import only the components you need; `Layout` is optional. Figures size themselves
from the containing column. Model zoom uses Shift + scroll so ordinary scrolling
continues through the article. Audio and Video keep playback and seeking visible;
Settings contains skip, volume, speed, captions, loop, and available platform tools.
Standalone Search keeps results inside its host; use `variant="header"` for the
compact header/dialog presentation.

For docs, `<Playground focusPreview>` gives the specimen full width and reveals
parameters/source on demand. Set `previewHeight={440}` for a deliberately scrolling
frame (finite 80–1600 pixels); omit it to accept the frame's content-size messages.
See the [plain-host embed lab](https://alkemist.alkem.dev/labs/embeds/).

### Inspectable figures

`Chart` includes a paged table of prepared rows and CSV, SVG, and PNG downloads.
Zoom survives theme, parameter, and size changes; Reset view restores the full
plotted domain. The original CSV stays available independently.

`Shader`, `Chart`, and `Model` share `parameters={true|false|keys}` and the mounted
`getParameters()` / `setParameters(patch)` API. Model exposes `view` and
`wireframe`; camera and material changes reuse the loaded scene. Add `Focus`
to enlarge the same figure on a page. See the
[parameter reference](https://alkemist.alkem.dev/docs/parameters/).

### Browser presentations

`Presentation` adds shared presenting controls with an article reading layout. `Deck`
keeps authored slide boundaries visible in Read; `Slide` renders an explicit
section for an Astro composition. Both enhance semantic `<section data-alk-slide>` content in any host layout.
Enable `alkemist({ presentations: true })` to author those sections with Markdown rules
in a `format: deck` document. Add figures using the same components as an
article. `Note for="figure-id"` attaches text to a figure, `Step` controls reveals,
and `SpeakerNotes` supplies presenter notes. `Diagram` renders Mermaid source.
Use `embedded` for independent decks inside a page, or a standalone route for
deep links and the presenter window. Read is the default at every screen size;
Present starts at the reading position, and Back to reading returns to the same
section. Both views preserve the same mounted content and local widget state.
Use `view="present"` or a presentation deep link to start in Present explicitly.
Ordinary posts can use `present: true` with the integration and a `Presentation` wrapper. `Slides` remains a compatible alias for `Deck`,
and the integration still accepts `slides: true` and `format: slides`.
No-JavaScript loads remain readable. See the
[presentation authoring guide](https://alkemist.alkem.dev/docs/slides/).
