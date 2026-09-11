# Deployment

The user authorized the public Cloudflare deployment, automatic deployment from `main`, and previews from other repository branches on September 8, 2026.

## Managed target

- Project: `alkemist`, Cloudflare Pages in Alkemical Development Admin.
- Source: GitHub `alkemdotdev/alkemist`, repository ID `1361643737`.
- Production branch: `main`.
- Preview branches: all other repository branches.
- Domain: `alkemist.alkem.dev`.
- Build: `npm ci && npm run verify` at the repository root.
- Output: `apps/site/dist`.
- Node: `24.20.0`; automatic dependency installation disabled because the build command runs `npm ci`.
- Native GitHub integration owns deployment; GitHub Actions is validation-only.
- PR comments are disabled. The source repository, published site content, and preview links are public.

`infra/cloudflare.json` is the desired configuration. `scripts/cloudflare.mjs` reconciles it and verifies readback. It refuses to repoint an existing project at another repository or overwrite unrelated DNS.

```sh
npm run cloudflare:status
npm run cloudflare:setup
```

An operator supplies `CLOUDFLARE_API_TOKEN` via their environment. Credentials are not copied into Pages builds or GitHub secrets.

## Verification procedure

1. Run `npm run verify` and a preview-mode build locally.
2. Push validated source to `main`; verify Pages reports the exact commit and successful production deployment.
3. Check the custom domain and `/build.json` over HTTPS.
4. Push a non-main branch; verify preview environment, source commit, immutable URL, branch alias, no-index response, and visible preview banner.
5. Push a second commit to the same branch; verify the stable alias serves the newer source revision and production is unchanged.

## Live evidence

- Pages project `alkemist` was created and its managed settings passed an exact readback check on September 8, 2026.
- Cloudflare assigned `alkemist-8be.pages.dev` as the project hostname.
- `alkemist.alkem.dev` is associated with that Pages project and has a proxied CNAME to the assigned hostname.
- Domain verification, HTTP validation, and certificate status are active.
- Production commit `8049a95797badcf3cca3159b9abfc3a8db4c2180` deployed through a `github:push` event as deployment `463b9ed1-9720-4984-b665-0b7238fff503`.
- The first preview deployed the same source from `preview/deployment-check` as `7763a3f6-92ef-486f-a896-964b31f93609`.
- Stable preview alias: https://preview-deployment-check.alkemist-8be.pages.dev
- HTTPS checks passed for production, the immutable preview, and the stable preview: exact commit/branch/environment, home/docs/charts/components/notebook content, security headers, robots behavior, and a true 404. Preview responses supplied both Cloudflare's `X-Robots-Tag: noindex` and the site's no-index metadata/banner.
- The second `github:push` preview deployed `5f5e2b9fef610589c8e6a9c57ad459845eb20b6e` as `26e6b87e-9adc-4e95-894d-fec847840881`. At 17:21 UTC the stable alias served that newer revision while production still served `8049a95`; both passed the HTTPS verifier. This establishes automatic branch updates and separation from production.

Repeat the live check using the exact expected source revision and branch:

```sh
node scripts/check-deployment.mjs https://alkemist.alkem.dev <full-main-commit> main
node scripts/check-deployment.mjs https://preview-deployment-check.alkemist-8be.pages.dev <full-preview-commit> preview/deployment-check
```

Reports are saved to the ignored `.alkemist/deployments/` directory. The final publishing commit can be read from `/build.json`; the evidence above records the initial deployment checks, not an assertion that production will remain at that revision.

## Sources

- [Cloudflare GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
