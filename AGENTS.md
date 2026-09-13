# Alkemist

Alkemist is a reusable Astro publishing toolkit for inventors and researchers.

- `packages/components` owns reusable layouts and scientific components; `packages/theme` owns tokens, fonts, palette data, and theme helpers; `packages/astro` owns the integration. Their public names are `@alkemdotdev/alkemist-components`, `@alkemdotdev/alkemist-theme`, and `@alkemdotdev/alkemist-astro`. `apps/site` consumes them and owns site content.
- Public components and exported prop/config types use plain names: `Layout`, `LayoutProps`, `Chart`. Import a component from its lowercase, extensionless entry (for example, `@alkemdotdev/alkemist-components/layout`); import its types from that same entry. Packages remain `@alkemdotdev/alkemist-*`; the integration function is `alkemist()`.
- Demo, documentation, and notebook use the same packages. Mark proposed APIs and incomplete features explicitly.
- Keep heavy visualization engines lazy and domain-specific. Prefer existing engines and build/document the Alkemist authoring and lifecycle layer.
- Run `npm run verify`. Validate visible changes in a browser at desktop/mobile widths.
- Prefer descriptive headings and concrete link labels. Omit decorative category labels that repeat adjacent headings, and extra calls to action that restate the same link.
- Keep homepage artwork free of viewer toolbars and instructional captions. Inspection controls belong in Labs and content figures.
- Commit and push completed, verified milestones regularly. Publish a branch preview first, then promote the checked revision to main. Keep design proposals in Labs until the user chooses a replacement for the homepage.
- Hosting is Cloudflare Pages. `infra/cloudflare.json` and `scripts/cloudflare.mjs` own reproducible configuration. Native Git builds deploy `main` to production and other branches to previews; do not add a second deployment system.
- Keep tokens out of source, output, and build environment. Native Cloudflare Git integration needs no repository deploy secret.
- Record meaningful work and observed evidence in `docs/progress.md`; publish readable development blog articles in `apps/site/src/content/blog`.
- Never claim an upstream capability or a concept sketch is an implemented Alkemist feature.
- Public package versions move together through Changesets. Publish `1.0.0-beta.1` to `beta`, then exit pre mode and publish a new stable version to `latest`; never promote a prerelease to `latest`. GitHub OIDC authenticates npm and no npm secret belongs in GitHub or Cloudflare. Verified main revisions publish commit-addressed canaries automatically through the same OIDC workflow. Registry bootstrap is complete; beta/stable releases remain coordinated through Changesets.
