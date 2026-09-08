# Custom static hosting

Alkemist produces ordinary static files. Choose one provider or your own server; no Cloudflare runtime or account is required.

1. Run `npm install` once, then commit `package-lock.json` and `vendor/*.tgz` alongside the site's source.
2. Configure Node 24 and the build command `npm ci && npm run verify` in your provider or CI. Set `SITE_URL` to the canonical HTTP(S) origin, and `BASE_PATH` to `/` or the deployed path such as `/my-lab/`. A local check is `SITE_URL=https://example.org BASE_PATH=/my-lab/ npm run verify`.
3. Publish the contents of `dist/` at that path. Serve directory requests such as `/blog/` from `blog/index.html`; preserve file types and serve `404.html` with a 404 status for missing pages. This is a static site, so it needs no SPA catch-all rewrite.
4. Keep production and preview outputs separate. On previews, set `ALK_PREVIEW=true`, and provide `COMMIT_SHA` for build provenance. Use the correct preview base if it differs. This marks pages noindex and emits a restrictive robots.txt; it does not make the preview private.
5. Configure HTTPS, DNS, and publish only within the owner's authorization. Verify the live HTML, data/model requests, routes under the configured base, and `build.json` against the intended commit.

The provider's upload command and secret storage are deliberately yours to choose. Do not put credentials in source or generated HTML. Keep one authoritative deployment workflow and document its rollback mechanism.
