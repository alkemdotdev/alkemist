# This site belongs to its author

- Read README.md and HOSTING.md before changing setup. `src/`, `public/`, and site configuration are user-owned. Alkemist's reusable behavior lives in the installed `@alkemdotdev/alkemist-*` packages.
- Run `npm run verify`. Exercise changed pages in a browser at phone and desktop widths. Check chart controls, model controls, and browser errors when changing a lab.
- Main navigation is Blog, Labs, Info. More contains the Test page. Documentation is optional; add it only when this project needs it.
- Use `withBase()` from `src/lib/site.ts` for site-local links and public assets. `./file.csv` does not currently resolve relative to an MDX source file.
- Never describe proposed components or metadata schemas as implemented. Charts currently need explicit type/axes/title/description; models support uncompressed glTF 2.0.
- Read the selected provider instructions before deploying. Verify repository, account, domain, branch, build command, output directory, and credentials without printing secrets. Do not reuse the Alkemist demo's infrastructure identifiers.
- Do not initialize Git, create a remote, push, publish, change DNS, or incur charges without the user's authorization. Once authorized, complete setup and verify the live commit and assets.
- Keep one deployment owner. Cloudflare native Git builds and GitLab Pages CI are alternatives, not simultaneous publishers of the same site.
- Commit package-lock.json. Package upgrades do not replace this site's content or styles; inspect and test changes before accepting an update.
