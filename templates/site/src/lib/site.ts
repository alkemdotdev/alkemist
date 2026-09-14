import type { PostListProps } from '@alkemdotdev/alkemist-components/post-list';

export const siteName = 'My Lab';
export const tagline = 'Ideas, experiments, and work in progress';

export const sections = {
  blog: { enabled: true, label: 'Blog' },
  logs: { enabled: true, label: 'Logs' },
  labs: { enabled: true, label: 'Labs' },
  slides: { enabled: true, label: 'Slides' },
  docs: { enabled: true, label: 'Docs' },
  book: { enabled: true, label: 'Book' },
  info: { enabled: true, label: 'Info' },
} as const;

export type SectionId = keyof typeof sections;
export type ContentSectionId = Exclude<SectionId, 'labs' | 'info' | 'slides'>;

export const sectionIds = Object.keys(sections) as SectionId[];
export const enabledSections = sectionIds.filter(
  (section) => sections[section].enabled,
);
export const isSectionEnabled = (section: SectionId) =>
  sections[section].enabled;
export const sectionPath = (section: SectionId) => `${section}/`;

/** Site-local paths must include Astro's deployment base. */
export const withBase = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const navigation = enabledSections.map((section) => ({
  label: sections[section].label,
  href: withBase(sectionPath(section)),
}));

/** Choose a fixed layout or let readers switch between the available views. */
export const blogDisplay = {
  layout: 'featured-grid',
  selectable: true,
} satisfies Pick<PostListProps, 'layout' | 'selectable' | 'featuredHref'>;
