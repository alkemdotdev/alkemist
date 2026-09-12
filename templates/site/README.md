# Your Alkemist site

This is an independent Astro project. Its content, navigation, styles, and hosting configuration belong to you. Alkemist is installed from versioned npm packages pinned in `package.json`.

```sh
npm install
npm run verify
npm run dev
```

Edit `src/lib/site.ts` to change the name, tagline, and `sections` configuration. Each section (`blog`, `logs`, `labs`, `docs`, `book`, and `info`) has an `enabled` flag and label; disabled sections produce no index or detail routes and are omitted from navigation. Edit `src/styles/site.css` for theme overrides, the matching `src/content/` directory for writing, and `src/pages/labs/[id].astro` for interactive apps.

The oscillator data is synthetic. The tetrahedron is an original, small glTF fixture. Replace them with your own evidence and record units, provenance, and license terms. Math and fenced code in MDX work through the installed integration. Charts and models load their rendering engines when visible.

## Hosting

Follow HOSTING.md for the provider selected when generating this site. Set `SITE_URL` to your production origin and `BASE_PATH` to `/` or your project path. Copy `.env.example` to `.env` for local overrides. CI variables override values in `.env`. Never commit tokens.

`npm run verify` checks Astro types, builds `dist/`, verifies local page links and assets, and checks preview metadata. It does not prove an external deployment succeeded. After publication, open the live site, inspect its labs, and compare `/build.json` with the intended commit.

## Updating the installed packages

Choose a newer documented Alkemist release, update the three `@alkemdotdev/alkemist-*` versions together in `package.json`, then run `npm install` and `npm run verify`. Inspect the dependency diff and changed pages before committing the package manifest and lockfile.

The packages do not replace your content, styles, navigation, or provider setup. Read release migration notes before changing a package's major version. This workflow does not automatically migrate your site's Astro version.
