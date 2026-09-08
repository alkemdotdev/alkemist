export const isPreview = Boolean(
  import.meta.env.CF_PAGES_BRANCH && import.meta.env.CF_PAGES_BRANCH !== 'main',
);
