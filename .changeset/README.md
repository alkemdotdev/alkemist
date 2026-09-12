# Release notes

Run `npm run changeset` for a public package change. Describe what a consumer
observes and how to migrate, rather than copying a commit message. Components,
theme, integration, and generator use one fixed version group.

The initial version is `1.0.0-beta.1`. Beta prerelease mode is already active in `pre.json`. Exit it explicitly
with `npm exec changeset pre exit` before versioning the stable release. The release script derives and
checks the npm tag from the actual version; stable versions use `latest`.

Patch: compatible fixes. Minor: compatible additions. Major: changes to public
imports, props, slots, tokens, default layout behavior, or supported runtimes
that require consumer changes. Experimental APIs are identified in their docs.

See [publishing](../docs/publishing.md) for the complete release procedure.
