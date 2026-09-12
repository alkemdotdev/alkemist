# Alkemist

An Astro publishing toolkit for inventors and researchers. The demo website, documentation, and development notebook consume the same Alkemist packages.

[Production](https://alkemist.alkem.dev) · [Interactive specimen board](https://alkemist.alkem.dev/test/)

## Adopt Alkemist

The public package interface is fixed at `1.0.0-beta.1`:

- `@alkemdotdev/alkemist-components` supplies layouts, math, code, charts, models, and the bounded shader study.
- `@alkemdotdev/alkemist-theme` supplies optional tokens, global CSS, palette data, and theme helpers.
- `@alkemdotdev/alkemist-astro` supplies optional Astro integration and MDX defaults.
- `create-alkemist` generates a complete site.

All four packages are available on npm with the `beta` tag. Install the fixed
`1.0.0-beta.1` release while the beta line is active.

### Add a component to an existing Astro site

```sh
npm install @alkemdotdev/alkemist-components@1.0.0-beta.1
```

Import exactly the component you need, such as `@alkemdotdev/alkemist-components/AlkChart.astro`. Add `@alkemdotdev/alkemist-theme@1.0.0-beta.1` for Alkemist's visual system, and `@alkemdotdev/alkemist-astro@1.0.0-beta.1` only when you want its integration defaults.

### Generate a complete site

```sh
npm create alkemist@beta -- my-lab --provider cloudflare
cd my-lab
npm install
npm run verify
npm run dev
```

Choose `cloudflare`, `gitlab`, or `custom`. `create-alkemist` writes an empty-destination project once. It does not initialize Git, install dependencies, provision hosting, deploy, or modify the site's files after creation.

### Choose your publishing sections

The source starter offers optional Blog (developed writing), Logs (quick notes), Labs (interactive apps), Docs (project reference), and Book (an ordered guide), with Info for project background. Enable only what your project needs and choose your own labels. These conventions live in your generated site, not in the component package.

The published `create-alkemist@1.0.0-beta.1` predates this scaffold. Use the source generator below for the new sections until the next deliberate npm release; existing generated sites keep their own files.

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
- `packages/components`: reusable layouts, math, code, charts, model/shader viewers.
- `packages/theme`: optional theme tokens, fonts, palette data, and browser helpers.
- `packages/create-alkemist`: the registry generator and its installed template.
- `apps/site`: blog, labs, info, optional docs, one test page, and site-owned content.
- `templates/site`: independently installed starter, agent instructions, and provider recipes.
- `infra/cloudflare.json`: managed Cloudflare Pages/Git/domain configuration.
- `docs/proposal.md`: full product scope and intended component contracts.
- `docs/progress.md`: implementation and deployment evidence.

Public custom components/types use `Alk*`. Packages use `@alkemist/*`.

## Alkemist demo deployment

Cloudflare Pages uses its native GitHub integration. Main is production; all other repository branches are preview-eligible. The build command is `npm ci && npm run verify`, with output `apps/site/dist`. GitHub Actions independently verifies production and preview builds; it does not deploy.

Operator commands:

```sh
npm run cloudflare:status
npm run cloudflare:setup
```

These require an externally supplied `CLOUDFLARE_API_TOKEN` with appropriate Pages and zone/DNS access. No token belongs in Git, the Pages build environment, or command output. Setup checks remote repository identity and DNS before reconciliation. See `docs/deployment.md` for the verified live state.

## Current scope

Ubuntu/Ubuntu Mono, handwritten annotations, #eee/#111 boards, and eight invariant inks are implemented. The reusable components cover KaTeX math, highlighted code, six CSV chart presets, uncompressed GLB/glTF, and a fixed interactive GLSL study. `/test/` exercises these beside rich MDX and ordinary controls.

Splats, point clouds, robotics, compressed-asset pipelines, more statistical charts, and a general shader API remain future work. See [publishing.md](docs/publishing.md) for the beta-to-stable policy and registry prerequisite.

Run `npm run generate:palette` to regenerate CSS/JSON from the shared palette and `npm run generate:fixtures` to regenerate the synthetic datasets and GLB.

## License

[Apache-2.0](LICENSE). The source and `1.0.0-beta.1` npm packages are public.
