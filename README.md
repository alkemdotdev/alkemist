# Alkemist

An Astro workbench for inventors and researchers. The demo website, documentation, and development notebook consume the same Alkemist theme packages.

Production: https://alkemist.alkem.dev

## Develop

```sh
npm ci
npm run dev
npm run verify
```

Use Node 24.20.0 (`.nvmrc`). Astro is pinned to 7.3.2; TypeScript 6.0.3 matches the current Astro checker's supported peer range.

## Structure

- `packages/astro`: shared Astro integration and MDX defaults.
- `packages/ui`: `AlkLayout`, theme tokens, and local fonts.
- `apps/site`: demo, docs, notebook, and site-owned routes/content.
- `infra/cloudflare.json`: managed Cloudflare Pages/Git/domain configuration.
- `docs/proposal.md`: full product scope and intended component contracts.
- `docs/progress.md`: implementation and deployment evidence.

Public custom components/types use `Alk*`. Packages use `@alkemist/*`.

## Deployment

Cloudflare Pages uses its native GitHub integration. Main is production; all other repository branches are preview-eligible. The build command is `npm ci && npm run verify`, with output `apps/site/dist`. GitHub Actions independently verifies production and preview builds; it does not deploy.

Operator commands:

```sh
npm run cloudflare:status
npm run cloudflare:setup
```

These require an externally supplied `CLOUDFLARE_API_TOKEN` with appropriate Pages and zone/DNS access. No token belongs in Git, the Pages build environment, or command output. Setup checks remote repository identity and DNS before reconciliation. See `docs/deployment.md` for the verified live state.

## Current scope

The shared publishing theme and documentation foundation are implemented. Rich charts and scientific/3D widgets remain the next phase. Documented future syntax is labeled as proposed; there is no published `create-alkemist` or npm release yet.
