export const siteName = 'My Lab';
export const tagline = 'Ideas, experiments, and work in progress';

/** Site-local paths must include Astro's deployment base. */
export const withBase = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const navigation = [
  { label: 'Blog', href: withBase('blog/') },
  { label: 'Labs', href: withBase('labs/') },
  { label: 'Info', href: withBase('info/') },
];
