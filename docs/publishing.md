# Publishing Alkemist packages

The component library, optional theme, Astro integration, and starter are one
coordinated release: `@alkemdotdev/alkemist-components`,
`@alkemdotdev/alkemist-theme`, `@alkemdotdev/alkemist-astro`, and
`create-alkemist`. The public npm account is `alkemdotdev`; no separate npm
organization is required.

## Versions and public contracts

The initial release is published as `1.0.0-beta.1`. Beta prerelease mode is active in
`.changeset/pre.json`. Changesets advances the four packages together.

- Patch: compatible corrections.
- Minor: compatible additions, including components and optional props.
- Major: changes requiring consumers to migrate imports, props, slots, CSS
  tokens, layout defaults, or supported Node/Astro versions.

A version such as `1.0.0-beta.2` is published with the `beta` tag. Stable
versions use `latest`. Never tag a prerelease as `latest`. To leave beta, run
`npm exec changeset pre exit`, then the version command and the full release
gate; this creates a new stable package version, not a retagged prerelease.

## Normal release

Add a changeset with `npm run changeset` when public package behavior changes.
Explain the consumer impact and migration, including visual changes. GitHub
Actions maintains a release PR containing version and changelog updates. Review
its Cloudflare branch preview and run the Verify workflow on that branch before
merging. GitHub's built-in token does not automatically trigger another Actions
run when it creates a PR; Verify supports explicit workflow dispatch.

On main, `.github/workflows/release.yml` verifies the project and independent
starter, packs the four packages, and tests those exact tarballs in an existing
Astro site. The beta/stable release path publishes only when package versions
change or the workflow is explicitly dispatched, and only when no changesets
remain to be versioned. The npm environment permits the main branch only.

Publishing runs in its own job with `id-token: write`, using npm OIDC trusted
publishing. The job downloads the verified artifacts; it does not reinstall
build dependencies or repack source. SHA-256, SHA-512 integrity, package
identities, versions, and source revision are checked before publication.
Afterward, a separate job installs from npm and exercises standalone
components, existing MDX integration, and the published starter.

The root commands for a local release are:

```sh
npm run version:packages
npm run format:check
npm run verify
npm run check:starter
# Commit and preview the versioned revision before publication.
npm run release:pack
npm run check:packages
npm run release:publish
npm run release:verify
npm run check:packages -- --registry
```

`release:pack` builds the bundled starter template and records tarball hashes
in `.alkemist/release/manifest.json`. Normal `release:publish` requires clean
committed source and derives the tag from the package version. It skips an
existing version only if registry integrity matches exactly. A partially
completed publish can be resumed using the same artifacts. Changed published
bytes require a new version.

`release:verify` checks registry integrity and tags; `check:packages --registry`
performs fresh installations. A successful build alone does not prove either
registry publication or website deployment.

## Main-branch canaries

Every passing push to `main` also publishes all four packages under the
`canary` tag. The version is the checked-in package version followed by
`-canary.<full commit SHA>`, so it is deterministic, unique to that commit,
and never moves `beta` or `latest`. The component packages, integration, and
the starter's bundled template all use that exact same canary version.

The workflow derives those versions only after the normal source checks pass,
packs the resulting tarballs, and exercises an independent existing-site
consumer before uploading the artifact. Its OIDC publication job checks out
the same commit, recreates only the four package-manifest and starter-template
version edits, and rejects every other worktree change before publishing the
downloaded tarballs. It then performs the registry consumer check. Canary
publication creates no GitHub Release.

Canaries coexist with the Changesets release PR flow. A pending changeset
still creates a beta or stable version PR; once that versioned PR is merged,
the ordinary release job publishes the checked release artifacts with `beta`
or `latest` and records its GitHub Release.

## Account bootstrap

All four packages have trusted publisher bindings to `alkemdotdev/alkemist`,
`release.yml`, environment `npm`. The initial beta was published locally;
the first new version published by Actions will verify the OIDC path end to end.

The first real release must be published from the authenticated npm account
before a trusted publisher can be configured for those package names. Use
`npm login` and complete npm's normal 2FA challenge. Never create placeholder
packages just to reserve names. Local first publication does not have GitHub
OIDC provenance; subsequent workflow publications do.

After the first publish, configure each package:

```sh
for package_name in @alkemdotdev/alkemist-theme @alkemdotdev/alkemist-components @alkemdotdev/alkemist-astro create-alkemist; do
  npm trust github "$package_name" --repository alkemdotdev/alkemist --file release.yml --environment npm --allow-publish --yes
  npm trust list "$package_name"
done
```

Inspect dist-tags after a package's first publication: npm may also attach
`latest` even when publishing with `--tag beta`. If `latest` points to this
prerelease, remove it with `npm dist-tag rm <package> latest`; retain `beta`.
The release verification deliberately rejects a prerelease on `latest`.

Use npm 12 for account setup. Account-level 2FA must be enabled. Review any
existing trust entry before adding one; never silently revoke or replace a
publisher. The expected binding is GitHub repository `alkemdotdev/alkemist`,
workflow `release.yml`, environment `npm`, permission `publish`.

GitHub must permit Actions to create release PRs. Default workflow permissions
remain read-only; the version job explicitly requests contents and PR writes.
The organization must allow repositories to opt into this capability. The
repository's `npm` environment has a custom deployment branch rule for `main`.
No npm token is stored in GitHub, source, or Cloudflare.

## Consumer ownership

The source generator creates an independent site in an empty directory and
packs its dependencies into `vendor/`. It does not initialize Git, provision
hosting, or update existing files after creation. The consumer owns content,
configuration, styles, and the generated lockfile.

Its explicit `--update` mode refreshes those snapshots while preserving
consumer files. Template changes are explicit migrations, not forced
overwrites.

Cloudflare's native Git integration continues to deploy the demo and docs.
The npm workflow is not a second website deployment system.

## References

Checked September 12, 2026:
[Changesets fixed packages](https://changesets.dev/guide/fixed-packages),
[Changesets automation](https://changesets.dev/guide/automating),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), and
[npm trust CLI](https://docs.npmjs.com/cli/v12/commands/npm-trust/).
