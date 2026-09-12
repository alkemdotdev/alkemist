import type { PostListProps } from '@alkemdotdev/alkemist-components/post-list';

export const siteSectionIds = [
  'blog',
  'logs',
  'labs',
  'docs',
  'book',
  'info',
] as const;

export type SiteSectionId = (typeof siteSectionIds)[number];

export interface SiteSection {
  enabled: boolean;
  label: string;
  href: `/${string}/`;
  description: string;
}

/**
 * Site-owned information architecture. Turn off a section to remove it from
 * navigation; generated Logs and Book pages also stop being emitted.
 */
export const siteSections = {
  blog: {
    enabled: true,
    label: 'Blog',
    href: '/blog/',
    description: 'Developed writing, announcements, and research notes.',
  },
  logs: {
    enabled: true,
    label: 'Logs',
    href: '/logs/',
    description: 'Quick working notes and small observations.',
  },
  labs: {
    enabled: true,
    label: 'Labs',
    href: '/labs/',
    description: 'One-off interactive applications and experiments.',
  },
  docs: {
    enabled: true,
    label: 'Docs',
    href: '/docs/',
    description: 'Project reference and implementation guidance.',
  },
  book: {
    enabled: true,
    label: 'Book',
    href: '/book/',
    description: 'A curated, sequential guide.',
  },
  info: {
    enabled: true,
    label: 'Info',
    href: '/info/',
    description: 'About this project and the people behind it.',
  },
} satisfies Record<SiteSectionId, SiteSection>;

export const navigationSections = siteSectionIds.flatMap((id) => {
  const section = siteSections[id];
  return section.enabled ? [{ label: section.label, href: section.href }] : [];
});

/** Editorial selection and reading layouts belong to the adopting site. */
export const blogDisplay = {
  layout: 'featured-grid',
  selectable: true,
  featuredHref: '/blog/fields-with-substance/',
} satisfies Pick<PostListProps, 'layout' | 'selectable' | 'featuredHref'>;
