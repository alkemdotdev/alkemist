export interface DocsLink {
  label: string;
  href: string;
}

export interface DocsGroup {
  label: string;
  links: DocsLink[];
}

export const docsGroups: DocsGroup[] = [
  {
    label: 'Getting started',
    links: [
      { label: 'Create your site', href: '/docs/getting-started/' },
      { label: 'Agent instructions', href: '/docs/agent-setup.md' },
      {
        label: 'Package publishing',
        href: 'https://github.com/alkemdotdev/alkemist/blob/main/docs/publishing.md',
      },
      { label: 'Site structure', href: '/docs/site-structure/' },
    ],
  },
  {
    label: 'Components',
    links: [
      { label: 'Component catalog', href: '/docs/components/' },
      { label: 'Charts and data', href: '/docs/charts/' },
      { label: 'Math and code', href: '/docs/math-code/' },
      { label: 'Models and shaders', href: '/docs/models/' },
    ],
  },
  {
    label: 'Customization',
    links: [
      { label: 'Boards, fonts, and inks', href: '/docs/palette/' },
      { label: 'Your homepage', href: '/docs/homepage/' },
    ],
  },
  {
    label: 'Hosting',
    links: [
      { label: 'Cloudflare Pages', href: '/docs/hosting/cloudflare/' },
      { label: 'GitLab Pages', href: '/docs/hosting/gitlab-pages/' },
      { label: 'Another provider', href: '/docs/hosting/custom/' },
    ],
  },
];

export const docsReference: DocsLink[] = [
  { label: 'Architecture and upgrades', href: '/docs/architecture/' },
  { label: 'Names and public types', href: '/docs/naming/' },
  { label: 'Project status', href: '/docs/status/' },
  { label: 'Demo hosting', href: '/docs/deployment/' },
];
