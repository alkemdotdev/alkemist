# Alkemist

An Astro publishing toolkit for inventors and researchers. The demo website, documentation, and development notebook consume the same Alkemist packages.

[Production](https://alkemist.alkem.dev) · [Interactive specimen board](https://alkemist.alkem.dev/test/)

## Adopt Alkemist

Adopt individual packages or generate a complete site:

- `@alkemdotdev/alkemist-components` supplies layouts, math, code, audio, video, charts, MIDI piano rolls, models, and the bounded shader study.
- `@alkemdotdev/alkemist-theme` supplies optional tokens, global CSS, palette data, and theme helpers.
- `@alkemdotdev/alkemist-astro` supplies optional Astro integration and MDX defaults.
- `create-alkemist` generates a complete site.

The `canary` npm channel follows verified `main` revisions automatically. It carries the current API and may contain breaking changes. The older `1.0.0-beta.1` release uses the earlier interface. Coordinated beta/stable releases remain separate from canaries.

### Add a component to an existing Astro site

```sh
npm install --save-exact @alkemdotdev/alkemist-components@canary
```

Import exactly the component you need, such as `@alkemdotdev/alkemist-components/chart`. Install optional theme and integration packages from the same channel when needed. Commit your lockfile to retain the tested versions.

### Generate a complete site

```sh
npm create alkemist@canary -- my-lab --provider cloudflare
cd my-lab
npm install
npm run verify
npm run dev
```

Search is enabled in the starter. Use `npm run build` followed by `npm run preview` to exercise the production search index locally. The source generator below remains available for tarball-backed adoption.

### Choose your publishing sections

The source starter offers optional Blog (developed writing), Logs (quick notes), Labs (interactive apps), Slides (browser presentations), Docs (project reference), and Book (an ordered guide), with Info for project background. Enable only what your project needs and choose your own labels. These conventions live in your generated site, not in the component package.

The source starter includes these sections; generated sites keep their own files.

Add talks under `src/content/slides/` as `.md` or `.mdx` with `format: slides`.
Top-level `---` separates slides; ordinary Markdown provides the content, and
MDX adds the same interactive components used in articles. See the
[slide guide](https://alkemist.alkem.dev/docs/slides/) and [example decks](https://alkemist.alkem.dev/slides/).

### Use the source generator

Clone the repository, use Node 24.20.0, and create a separate site:

```sh
npm ci
npm run create:site -- ../my-lab --provider cloudflare
cd ../my-lab
npm install
npm run verify
npm run dev
```

The source generator packages the shared dependencies into local tarballs; the new site owns its content, identity, configuration, and Git history. Commit its `vendor/` files and generated lockfile. Read the generated `AGENTS.md` and `HOSTING.md`, or start with the [setup guide](https://alkemist.alkem.dev/docs/getting-started/) and [agent instructions](https://alkemist.alkem.dev/docs/agent-setup.md).

To refresh source-generated package snapshots later, run `npm run create:site -- ../my-lab --update` from a reviewed Alkemist checkout, then `npm install` and `npm run verify` in the site. Updates preserve user content and configuration; review changes before deploying. The registry generator has no update mode and never owns user files after creation.

## Develop

```sh
npm ci
npm run dev
npm run verify
npm run check:starter
```

Use Node 24.20.0 (`.nvmrc`). Astro is pinned to 7.3.2; TypeScript 6.0.3 matches the current Astro checker's supported peer range.

## Structure

- `packages/astro`: shared Astro integration and MDX defaults.
- `packages/components`: reusable layouts, math, code, audio/video players, charts, MIDI editors and synthesized voices, model/shader viewers.
- `packages/theme`: optional theme tokens, fonts, palette data, and browser helpers.
- `packages/create-alkemist`: the registry generator and its installed template.
- `apps/site`: blog, labs, info, optional docs, one test page, and site-owned content.
- `templates/site`: independently installed starter, agent instructions, and provider recipes.
- `infra/cloudflare.json`: managed Cloudflare Pages/Git/domain configuration.
- `docs/proposal.md`: full product scope and intended component contracts.
- `docs/progress.md`: implementation and deployment evidence.

Public components and types use plain names. Import components and their types
from lowercase, extensionless entries such as
`@alkemdotdev/alkemist-components/chart`.

## Alkemist demo deployment

Cloudflare Pages uses its native GitHub integration. Main is production; all other repository branches are preview-eligible. The build command is `npm ci && npm run verify`, with output `apps/site/dist`. GitHub Actions independently verifies production and preview builds; it does not deploy.

Operator commands:

```sh
npm run cloudflare:status
npm run cloudflare:setup
```

These require an externally supplied `CLOUDFLARE_API_TOKEN` with appropriate Pages and zone/DNS access. No token belongs in Git, the Pages build environment, or command output. Setup checks remote repository identity and DNS before reconciliation. See `docs/deployment.md` for the verified live state.

## Current scope

Ubuntu/Ubuntu Mono, handwritten annotations, #eee/#111 boards, and eight invariant inks are implemented. The reusable components cover KaTeX math, highlighted code, accessible audio/video controls, six CSV chart presets, uncompressed GLB/glTF, and a fixed interactive GLSL study. `/test/` exercises these beside rich MDX and ordinary controls.

Splats, point clouds, robotics, compressed-asset pipelines, more statistical charts, and a general shader API remain future work. See [publishing.md](docs/publishing.md) for the beta-to-stable policy and registry prerequisite.

Run `npm run generate:palette` to regenerate CSS/JSON from the shared palette and `npm run generate:fixtures` to regenerate the synthetic datasets and GLB.

## License

[Apache-2.0](LICENSE).
