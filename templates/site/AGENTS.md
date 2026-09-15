# This site belongs to its author

- Read README.md and HOSTING.md before changing setup. `src/`, `public/`, and site configuration are user-owned. Alkemist's reusable behavior lives in the installed `@alkemdotdev/alkemist-*` packages.
- Run `npm run verify`. Exercise changed pages in a browser at phone and desktop widths. Check chart controls, model controls, and browser errors when changing a lab.
- Use descriptive headings and concrete link labels. Do not add decorative eyebrows or kickers above headings. Omit category labels that repeat adjacent headings and extra calls to action that restate the same link.
- Configure the site sections in `src/lib/site.ts`. Blog is for developed writing, Logs for quick notes, Labs for interactive one-off apps, Presentations (the slides section) for Markdown or MDX browser decks, Docs for project reference, Book for a curated ordered guide, and Info for the project. Slides need `format: slides` frontmatter and use top-level `---` boundaries. These are authoring conventions, not enforced taxonomy; disable or relabel any section there.
- A blog post can optionally declare a local `cover` frontmatter object. Give it meaningful alt text; use focal coordinates and `fit` only when the default centered cover frame is not right. Covers do not apply to other content collections.
- Use `withBase()` from `src/lib/site.ts` for site-local links and public assets. `./file.csv` does not currently resolve relative to an MDX source file.
- Never describe proposed components or metadata schemas as implemented. Charts currently need explicit type/axes/title/description; models support uncompressed glTF 2.0.
- Read the selected provider instructions before deploying. Verify repository, account, domain, branch, build command, output directory, and credentials without printing secrets. Do not reuse the Alkemist demo's infrastructure identifiers.
- Do not initialize Git, create a remote, push, publish, change DNS, or incur charges without the user's authorization. Once authorized, complete setup and verify the live commit and assets.
- Keep one deployment owner. Cloudflare native Git builds and GitLab Pages CI are alternatives, not simultaneous publishers of the same site.
- Commit package-lock.json. Package upgrades do not replace this site's content or styles; inspect and test changes before accepting an update.
