# Cloudflare Pages · native Git integration

1. Run `npm install` and `npm run verify` locally. Commit this site's source, `vendor/*.tgz`, and `package-lock.json` to your own GitHub or GitLab repository.
2. In your own Cloudflare account, create a Pages project connected to that repository. Choose production branch `main` (or set `PRODUCTION_BRANCH` to your chosen branch).
3. Set root directory to the repository root, build command to `npm ci && npm run verify`, output directory to `dist`, and `NODE_VERSION` to `24`. No deploy token is needed in repository secrets for native Git builds.
4. Set production `SITE_URL` to your canonical origin and `BASE_PATH` to `/`. Set the same values in preview builds so preview pages retain production canonical URLs; previews receive noindex metadata automatically from `CF_PAGES_BRANCH`. Enable previews for your desired non-production branches.
5. Add the custom domain through the Pages project before adjusting DNS as instructed by Cloudflare. Verify HTTPS, the rendered page and labs, and `/build.json` against the intended commit. Push a test branch and verify its separate preview URL and noindex tag.

For an apex domain, the zone must be on Cloudflare. A subdomain can use external DNS with a CNAME after associating it with the Pages project. Provider connection, DNS, and publication require the site owner's authorization. No Cloudflare account IDs, tokens, or Alkemist demo domain are copied into this starter.

Do not add a second CI deploy command alongside native Git publishing. This generator does not create the remote repository or configure a Cloudflare account.

Sources: [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
