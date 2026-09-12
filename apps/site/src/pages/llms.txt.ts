export function GET() {
  return new Response(
    `# Alkemist

> An Astro publishing toolkit for inventors and researchers. The 1.0.0-beta.1 package set is available on npm.

## Setup
- [The Alkemist book](https://alkemist.alkem.dev/book/): a curated path from choosing sections to publishing a working site.
- [Agent setup instructions](https://alkemist.alkem.dev/docs/agent-setup.md): workspace inspection, standalone generation, customization, hosting, and completion evidence.
- [Getting started](https://alkemist.alkem.dev/docs/getting-started/): the human setup guide and copyable provider prompts.
- [Cloudflare Pages](https://alkemist.alkem.dev/docs/hosting/cloudflare/): native Git deployment and branch previews.
- [GitLab Pages](https://alkemist.alkem.dev/docs/hosting/gitlab-pages/): Pages CI and optional parallel previews.
- [Custom static hosting](https://alkemist.alkem.dev/docs/hosting/custom/): build artifact and provider requirements.

## Reference
- [Quick logs](https://alkemist.alkem.dev/logs/): short project observations.
- [Components](https://alkemist.alkem.dev/docs/components/)
- [Site structure](https://alkemist.alkem.dev/docs/site-structure/)
- [Project status](https://alkemist.alkem.dev/docs/status/): implemented capabilities and limitations.
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
