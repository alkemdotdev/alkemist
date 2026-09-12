# Component package release

## Objective

Publish Alkemist as individually imported components, optional theme and Astro integration, and an independently installable starter. Use coordinated versions, Changesets release notes, npm trusted publishing, and existing Cloudflare Git deployment.

## Current work

- Branch: `feat/component-packages`, started from a clean `main` checkout.
- Target initial release: `1.0.0-beta.1`; approved public names use @alkemdotdev/alkemist-*.
- Components worker owns `packages/components`, `packages/theme`, `packages/astro`, and palette generation.
- Starter worker owns `packages/create-alkemist`, `templates/site`, and starter scripts/tests.
- Adoption worker owns demo imports, public docs, README, and publishing guide.
- Parent owns release automation, package-consumer verification, integration, and external publishing/deployment.

## Account state

- GitHub repository access works.
- npm browser session is authenticated as `alkemdotdev`, with no organizations listed.
- npm CLI is authenticated as alkemdotdev; user enabled 2FA for authorization/publishing. No credentials belong in this repository.
- GitHub organization and repository permit release PR creation with read-only default tokens. npm environment permits main only.

## Required evidence

- Format, `npm run verify`, independently installed starter and component consumers.
- Actual packed file contents, exports/types, coordinated versions and license/readme checks.
- Browser review at desktop/mobile widths with standalone component and docs usage.
- Branch preview and deployed revision checks before main promotion.
- npm publication and fresh registry installation, or exact account-dependent blocker.

## Next action

Local full gate, starter, and packed consumer checks pass. Complete branch preview, publish the committed beta artifacts, configure npm trust bindings, and validate registry consumers and main deployment.
