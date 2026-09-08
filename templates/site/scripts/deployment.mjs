/** @param {Record<string, string | undefined>} env */
export function resolveDeployment(env) {
  const branch = env.CF_PAGES_BRANCH ?? env.CI_COMMIT_REF_NAME ?? 'local';
  const defaultBranch =
    env.PRODUCTION_BRANCH ?? env.CI_DEFAULT_BRANCH ?? 'main';
  const inferredPreview = Boolean(
    env.CI_MERGE_REQUEST_IID ||
    (branch !== 'local' && branch !== defaultBranch),
  );
  if (env.ALK_PREVIEW && !['true', 'false'].includes(env.ALK_PREVIEW)) {
    throw new Error('ALK_PREVIEW must be true or false.');
  }
  const preview = env.ALK_PREVIEW
    ? env.ALK_PREVIEW === 'true'
    : inferredPreview;
  // GitLab includes the parallel deployment prefix in CI_PAGES_URL (17.9+).
  // Preview routes must follow that URL, even when production has a custom domain.
  const pages = env.CI_PAGES_URL ? new URL(env.CI_PAGES_URL) : undefined;
  const origin =
    preview && pages
      ? pages.origin
      : (env.SITE_URL ?? pages?.origin ?? 'http://localhost:4321');
  const site = new URL(origin);
  if (
    !['http:', 'https:'].includes(site.protocol) ||
    site.pathname !== '/' ||
    site.search ||
    site.hash
  ) {
    throw new Error(
      'SITE_URL must be an HTTP(S) origin. Put the path in BASE_PATH.',
    );
  }
  const rawBase =
    preview && pages
      ? pages.pathname
      : (env.BASE_PATH ?? pages?.pathname ?? '/');
  if (
    !rawBase.startsWith('/') ||
    /[?#\\]/.test(rawBase) ||
    rawBase.includes('..') ||
    rawBase.includes('//')
  ) {
    throw new Error(
      'BASE_PATH must be an absolute URL path such as / or /my-lab/.',
    );
  }
  const base = `${rawBase.replace(/\/$/, '')}/`;
  return {
    origin: site.origin,
    base,
    branch,
    preview,
    environment: preview
      ? 'preview'
      : branch === 'local'
        ? 'local'
        : 'production',
    commit: env.CF_PAGES_COMMIT_SHA ?? env.CI_COMMIT_SHA ?? env.COMMIT_SHA,
  };
}
