# Alkemist

Alkemist is a reusable Astro publishing toolkit for inventors and researchers.

- `packages/astro` owns the integration; `packages/ui` owns reusable layouts and theme tokens. `apps/site` consumes them and owns site content.
- Public components and exported prop/config types use `Alk`: `AlkLayout`, `AlkLayoutProps`, `AlkChart`. Packages remain `@alkemist/*`; the integration function is `alkemist()`.
- Demo, documentation, and notebook use the same packages. Mark proposed APIs and incomplete features explicitly.
- Keep heavy visualization engines lazy and domain-specific. Prefer existing engines and build/document the Alkemist authoring and lifecycle layer.
- Run `npm run verify`. Validate visible changes in a browser at desktop/mobile widths.
- Prefer descriptive headings and concrete link labels. Omit decorative category labels that repeat adjacent headings, and extra calls to action that restate the same link.
- Commit and push completed, verified milestones regularly. Publish a branch preview first, then promote the checked revision to main. Keep design proposals in Labs until the user chooses a replacement for the homepage.
- Hosting is Cloudflare Pages. `infra/cloudflare.json` and `scripts/cloudflare.mjs` own reproducible configuration. Native Git builds deploy `main` to production and other branches to previews; do not add a second deployment system.
- Keep tokens out of source, output, and build environment. Native Cloudflare Git integration needs no repository deploy secret.
- Record meaningful work and observed evidence in `docs/progress.md`; publish readable development blog articles in `apps/site/src/content/blog`.
- Never claim an upstream capability or a concept sketch is an implemented Alkemist feature.
