export const sourceAccess =
  'Public source preview · packages are not on npm yet';

export const setupProviders = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    title: 'Cloudflare Pages',
    guide: '/docs/hosting/cloudflare/',
    detail:
      'Connect your Git repository. Main publishes your site; other branches get previews.',
  },
  {
    id: 'gitlab',
    name: 'GitLab Pages',
    title: 'GitLab Pages',
    guide: '/docs/hosting/gitlab-pages/',
    detail:
      'Use GitLab CI for Pages. The starter deploys main and checks other branches; parallel previews need a paid GitLab tier.',
  },
  {
    id: 'custom',
    name: 'Custom host',
    title: 'your chosen static hosting provider',
    guide: '/docs/hosting/custom/',
    detail:
      'Build ordinary static files. Keep your provider’s deployment command, domain, and preview setup in your own repository.',
  },
] as const;

export type AlkSetupProvider = (typeof setupProviders)[number];

export function setupCommands(provider: AlkSetupProvider) {
  return `git clone https://github.com/alkemdotdev/alkemist.git alkemist-source
cd alkemist-source
npm ci
npm run create:site -- ../my-lab --provider ${provider.id}
cd ../my-lab
npm install
npm run verify
npm run dev`;
}

export function setupPrompt(provider: AlkSetupProvider) {
  return `Set up my own research website with Alkemist, using ${provider.title} for hosting.

Read https://alkemist.alkem.dev/docs/agent-setup.md and https://alkemist.alkem.dev${provider.guide} first.

Inspect my current workspace and its instructions. Establish the site name, destination directory/repository, hosting account, and intended URL from available context; ask together for the missing details. The Alkemist source repository is public, but no npm starter has been published.

Use the source repository's create:site generator with --provider ${provider.id} to create a separate site. Preserve existing work and make the site identity, content, and Git remote mine. Include Blog, Labs, and Info; add my own Docs only if needed. Keep a small Test page for styling and interactions.

Install dependencies, commit the lockfile and vendored packages, verify the build, and exercise the site on desktop and mobile. Set up the chosen provider's Git deployment and domain using my account and the documented recipe. Follow my existing authorization for external changes; identify any missing account access or consequential decision clearly.

Finish by checking the real production URL, deployed source revision, links, asset paths, and applicable branch previews. Report the URL, commit, completed checks, and any steps still requiring account access. Distinguish a successful local build from a verified deployment.`;
}

export function agentSetupGuide() {
  return `# Set up an Alkemist website

This is the agent-readable companion to https://alkemist.alkem.dev/docs/getting-started/.
Contract version: 2. https://github.com/alkemdotdev/alkemist is public, but no create-alkemist command or npm release is claimed.

## Inputs and workspace

Determine the intended site name, directory, content scope, Git repository, production branch (default main), provider, public URL, and optional base path from the user's instructions and existing configuration. Ask for missing relevant inputs together. Use the user's existing authorized account access; never request that secrets be placed in source files or chat.

Read the destination's instructions and inspect Git status/remotes before edits. Generate a new site into an empty directory. For an existing application, create a separate temporary starter and integrate a reviewed diff; do not overwrite the application. The upstream Alkemist repository and infra/cloudflare.json belong to the Alkemist demo, not the new site.

## Generate and customize

Use Node 24.20.0, matching the source .nvmrc. Clone the public source, run npm ci in that checkout, and run its create:site generator with the chosen provider. The generated site uses real local npm package tarballs under vendor/; retain those files and commit the generated package-lock.json. Package snapshots are not a public registry release.

Set the site's name, description, navigation, content, favicon, and canonical URL in its own configuration. Keep user-owned content and custom styles out of the shared packages. The main sections are Blog, Labs, and Info. Docs is optional project documentation; Test is one styling/interaction page. Link to installed component docs, and use current explicit component props and public asset URLs. File-relative figure APIs and metadata sidecars are still proposals.

## Hosting recipes

${setupProviders
  .map(
    (provider) => `### ${provider.name}

${provider.detail}
Full recipe: https://alkemist.alkem.dev${provider.guide}

\`\`\`sh
${setupCommands(provider)}
\`\`\`
`,
  )
  .join('\n')}

## Build and publish

Run the generated site's npm run verify. Inspect the local site in a real browser at desktop and mobile widths, including navigation, charts/models used by the page, theme switching, and errors. Configure SITE_URL and, when the real address uses a project subpath, BASE_PATH. Do not guess a project base from the repository name; use the provider's actual Pages URL. Validate asset and internal-link paths under that base.

Initialize or reuse the user's intended Git repository, commit the lockfile and vendor tarballs, and push to the correct remote according to the user's authorization. Cloudflare uses native Git integration. GitLab uses the supplied Pages pipeline; its optional parallel-preview recipe has tier requirements. A custom host uses its own verified build/upload workflow. Create or change domain records only for the user's intended site and verify the provider's configuration after applying it.

## Completion evidence

Confirm the production domain serves the expected build.json revision and site identity. Test an actual unknown URL for a real 404, inspect MIME types for models/data, and verify internal links and downloads. Exercise the live app. If branch previews are enabled, push a separate branch and prove its preview advances while production remains on main; check its indexing policy. GitLab's free-tier branch validation is not a preview deployment.

Record setup, hosting configuration, and checked results in the new repository. Report installed source/package versions, the deployed commit and URL, completed checks, and unresolved account-dependent work. Do not describe a recipe or local preview as a verified live deployment.

## Updates

Use the generator's explicit --update mode from a reviewed newer Alkemist source checkout to refresh package snapshots in a generated site. Review the dependency diff, reinstall to update the lockfile, run verification, and exercise customized pages. Source snapshot refresh checks preservation of user files; it does not guarantee compatibility with every future Alkemist version.
`;
}
