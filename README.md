# Alkemist

An Astro workbench for inventors and researchers. The demo website, documentation, and development notebook consume the same Alkemist theme packages.

[Production](https://alkemist.alkem.dev) · [Interactive specimen board](https://alkemist.alkem.dev/test/)

## Start your own site

This is a public source preview: the packages are not published on npm yet. Clone the repository, use Node 24.20.0, and create a separate site:

```sh
npm ci
npm run create:site -- ../my-lab --provider cloudflare
cd ../my-lab
npm install
npm run verify
npm run dev
```

Choose `cloudflare`, `gitlab`, or `custom`. The generator packages the shared integration and UI into local tarballs; the new site owns its content, identity, configuration, and Git history. Commit its `vendor/` files and generated lockfile. Read the generated `AGENTS.md` and `HOSTING.md`, or start with the [setup guide](https://alkemist.alkem.dev/docs/getting-started/) and [agent instructions](https://alkemist.alkem.dev/docs/agent-setup.md).

To refresh the packaged dependencies later, run `npm run create:site -- ../my-lab --update` from the Alkemist checkout, then `npm install` and `npm run verify` in the site. Updates preserve user content and configuration; review changes before deploying.

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
- `packages/ui`: shared layouts, math, code, charts, model/shader viewers, theme tokens, and local fonts.
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

Splats, point clouds, robotics, compressed-asset pipelines, more statistical charts, and a general shader API remain future work. There is no published `create-alkemist` or npm release yet.

Run `npm run generate:palette` to regenerate CSS/JSON from the shared palette and `npm run generate:fixtures` to regenerate the synthetic datasets and GLB.
