import type { NavigationItem } from '@alkemdotdev/alkemist-components/navigation';

export const docsNavigation: NavigationItem[] = [
  { label: 'Getting started', href: '/docs/' },
  {
    label: 'Components',
    href: '/docs/components/',
    children: [
      {
        label: 'Content',
        href: '/docs/content/',
        children: [
          { label: 'Audio and video reference', href: '/docs/media/' },
          { label: 'Math and code reference', href: '/docs/math-code/' },
          { label: 'Native HTML & media', href: '/docs/native-content/' },
        ],
      },
      {
        label: 'Visualization',
        href: '/docs/visualization/',
        children: [
          { label: 'Chart reference', href: '/docs/charts/' },
          { label: 'Music and MIDI', href: '/docs/music/' },
        ],
      },
      {
        label: 'Graphics',
        href: '/docs/graphics/',
        children: [
          { label: 'Model and shader reference', href: '/docs/models/' },
        ],
      },
      {
        label: 'Website',
        href: '/docs/website/',
        children: [
          { label: 'Navigation reference', href: '/docs/navigation/' },
          { label: 'Post list reference', href: '/docs/post-lists/' },
          { label: 'Search reference', href: '/docs/search/' },
          { label: 'Build a playground', href: '/docs/playground/' },
          { label: 'Browser slides', href: '/docs/slides/' },
        ],
      },
    ],
  },
  {
    label: 'Customize',
    href: '/docs/customize/',
    children: [
      { label: 'Site structure', href: '/docs/site-structure/' },
      { label: 'Colors and typography', href: '/docs/palette/' },
      { label: 'Homepage', href: '/docs/homepage/' },
      { label: 'Post images', href: '/docs/post-images/' },
    ],
  },
  {
    label: 'Publish',
    href: '/docs/publish/',
    children: [
      { label: 'Cloudflare Pages', href: '/docs/hosting/cloudflare/' },
      { label: 'GitLab Pages', href: '/docs/hosting/gitlab-pages/' },
      { label: 'Other providers', href: '/docs/hosting/custom/' },
    ],
  },
];
export const docsReference: NavigationItem[] = [
  { label: 'Architecture and upgrades', href: '/docs/architecture/' },
  { label: 'API naming', href: '/docs/naming/' },
  { label: 'Project status', href: '/docs/status/' },
  { label: 'Demo hosting', href: '/docs/deployment/' },
];
