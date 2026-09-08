# Deployment

The user authorized the public Cloudflare deployment, automatic deployment from `main`, and previews from other repository branches on September 8, 2026.

## Managed target

- Project: `alkemist`, Cloudflare Pages in Alkemical Development Admin.
- Source: GitHub `alkemdev/alkemist`, repository ID `1361643737`.
- Production branch: `main`.
- Preview branches: all other repository branches.
- Domain: `alkemist.alkem.dev`.
- Build: `npm ci && npm run verify` at the repository root.
- Output: `apps/site/dist`.
- Node: `24.20.0`; automatic dependency installation disabled because the build command runs `npm ci`.
- Native GitHub integration owns deployment; GitHub Actions is validation-only.
- PR comments are disabled. The source repository remains private; published site content and preview links are public.

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

Initial provisioning and remote deployment verification are in progress. See `docs/progress.md` for the latest completed steps; the configured intent above is not yet proof that the host deployed it.

## Sources

- [Cloudflare GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
