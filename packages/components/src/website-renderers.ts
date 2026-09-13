import {
  navigationHref,
  navigationIsExpanded,
  pagePath,
  type NavigationItem,
} from './navigation/helpers.ts';
import {
  preparePostListItems,
  type PostListProps,
} from './post-list-helpers.ts';
import type { TableOfContentsHeading } from './table-of-contents.astro';
import type { NavigationProps } from './navigation.astro';
import type { SearchProps } from './search.astro';
import type { LayoutProps, NavLink } from './layout.astro';

/** Escape data before placing it in either text or attribute HTML context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>'\"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ]!,
  );
}

const safeLocalUrl = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return (trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\')) ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
    ? trimmed
    : undefined;
};

export function renderTableOfContents({
  headings,
  label = 'On this page',
  showLabel = true,
}: {
  headings: TableOfContentsHeading[];
  label?: string;
  showLabel?: boolean;
}): string {
  const visible = headings.filter(
    (heading) =>
      heading.depth >= 2 && heading.depth <= 4 && heading.slug.trim(),
  );
  return `<alk-table-of-contents class="alk-table-of-contents"><nav aria-label="${escapeHtml(label)}">${showLabel ? `<p class="alk-table-of-contents-label">${escapeHtml(label)}</p>` : ''}${visible.length ? `<ol class="alk-table-of-contents-list">${visible.map((heading) => `<li data-depth="${heading.depth}"><a href="#${encodeURIComponent(heading.slug)}" data-toc-link="${escapeHtml(heading.slug)}">${escapeHtml(heading.text)}</a></li>`).join('')}</ol>` : ''}</nav></alk-table-of-contents>`;
}

function renderNavigationTree(
  items: NavigationItem[],
  currentPath: string,
  expandedDepth: number,
  headings: TableOfContentsHeading[],
  depth = 0,
): string {
  return `<ul class="alk-navigation-list" data-depth="${depth}">${items
    .map((item) => {
      const href = navigationHref(item.href);
      const current = pagePath(item.href) === pagePath(currentPath);
      const children = item.children?.length ? item.children : undefined;
      const content = href
        ? `<a href="${escapeHtml(href)}"${current ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`
        : `<span${current ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</span>`;
      const sections =
        current && headings.length
          ? `<div class="alk-navigation-sections">${renderTableOfContents({ headings, showLabel: false })}</div>`
          : '';
      return `<li class="alk-navigation-item">${
        children
          ? `<details${navigationIsExpanded(item, currentPath, depth, expandedDepth) ? ' open' : ''}><summary>${content}</summary>${sections}${renderNavigationTree(children, currentPath, expandedDepth, headings, depth + 1)}</details>`
          : `${content}${sections}`
      }</li>`;
    })
    .join('')}</ul>`;
}

export function renderNavigation({
  items,
  currentPath,
  label = 'Documentation',
  expandedDepth = 1,
  headings = [],
}: NavigationProps): string {
  return `<nav class="alk-navigation" aria-label="${escapeHtml(label)}">${renderNavigationTree(items, currentPath, expandedDepth, headings)}</nav>`;
}

export function renderSearch({
  indexUrl = '/pagefind/pagefind.js',
  placeholder = 'Search',
  label = 'Search this site',
  variant = 'standalone',
}: SearchProps = {}): string {
  const url = safeLocalUrl(indexUrl) ?? '/pagefind/pagefind.js';
  const text = escapeHtml(label);
  const field = `<label><span class="alk-sr-only">${text}</span><input type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off" spellcheck="false" data-search-input></label>`;
  return `<alk-search class="alk-search" data-pagefind-ignore data-index-url="${escapeHtml(url)}" data-variant="${escapeHtml(variant)}"><form class="alk-search-desktop" role="search" data-search-form>${field}<kbd aria-hidden="true">⌘K</kbd></form><button class="alk-search-mobile alk-icon-button" type="button" aria-label="${text}" title="${text}" data-search-open><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4 4"></path></svg></button><section class="alk-search-results" aria-live="polite" data-search-results hidden></section><dialog class="alk-search-dialog" aria-label="${text}" data-search-dialog><div class="alk-search-dialog-bar"><form role="search" data-search-form><label><span>${text}</span><input type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off" spellcheck="false" data-search-input></label></form><button type="button" class="alk-icon-button" data-search-close aria-label="Close search" title="Close search">×</button></div><section class="alk-search-results" aria-live="polite" data-search-results hidden></section></dialog></alk-search>`;
}

export function renderPostList(
  props: PostListProps,
  resolvedImages: readonly (string | undefined)[] = [],
): string {
  const {
    layout = 'rows',
    selectable = false,
    featuredHref,
    label = 'Posts',
  } = props;
  const items = preparePostListItems(props.items, featuredHref);
  const options = [
    ['rows', 'Rows'],
    ['featured', 'Featured + rows'],
    ['grid', 'Grid'],
    ['featured-grid', 'Featured + grid'],
  ];
  const control = selectable
    ? `<label class="alk-post-list-layout-control"><span>Layout</span><select data-post-list-layout aria-label="${escapeHtml(label)} layout">${options.map(([value, name]) => `<option value="${value}"${value === layout ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`
    : '';
  return `<alk-post-list class="alk-post-list" data-layout="${escapeHtml(layout)}">${control}<section class="alk-post-list-collection" aria-label="${escapeHtml(label)}"><div class="alk-post-list-items" role="list">${items
    .map((item, index) => {
      const cover = item.cover;
      const fallback =
        cover && typeof cover.src === 'string' && navigationHref(cover.src)
          ? `<img src="${escapeHtml(cover.src)}" alt="${escapeHtml(cover.alt)}" width="1200" height="800" loading="${index === 0 ? 'eager' : 'lazy'}" fetchpriority="${index === 0 ? 'high' : 'auto'}">`
          : '';
      const image = resolvedImages[index] ?? fallback;
      const thumbnail =
        cover && image
          ? `<div class="alk-post-thumbnail" data-fit="${cover.fit === 'contain' ? 'contain' : 'cover'}" style="--alk-post-focal-x: ${Number.isFinite(cover.focalX) ? cover.focalX : 50}%; --alk-post-focal-y: ${Number.isFinite(cover.focalY) ? cover.focalY : 50}%;">${image}</div>`
          : '';
      const date = item.date
        ? `<time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time>`
        : '';
      return `<article class="alk-post-list-item" role="listitem"${index === 0 ? ' data-lead' : ''}${cover ? ' data-has-cover' : ''}><a class="alk-post-list-link" href="${escapeHtml(navigationHref(item.href) ?? '#')}">${thumbnail}<div class="alk-post-list-copy"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p>${date}</div></a></article>`;
    })
    .join('')}</div></section></alk-post-list>`;
}

const renderLinks = (links: NavLink[], currentPath: string) =>
  links
    .map(({ label, href }) => {
      const current =
        pagePath(href) === pagePath(currentPath) ? ' aria-current="page"' : '';
      return `<a href="${escapeHtml(navigationHref(href) ?? '#')}"${current}>${escapeHtml(label)}</a>`;
    })
    .join('');

/** Update a server-rendered Layout preview without recreating its document or slot. */
export function updateLayoutPreview(
  document: Document,
  props: LayoutProps,
): void {
  const siteName = props.siteName ?? 'Alkemist';
  const title =
    props.title === siteName ? props.title : `${props.title} · ${siteName}`;
  document.title = title;
  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (description)
    description.content =
      props.description ??
      'An open workbench for publishing technical ideas. Built on Astro.';
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon && props.faviconHref)
    favicon.href = safeLocalUrl(props.faviconHref) ?? favicon.href;
  const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (props.preview && !robots)
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="robots" content="noindex, nofollow">',
    );
  else if (!props.preview) robots?.remove();
  const preview = document.querySelector<HTMLElement>('.alk-preview');
  if (props.preview && !preview)
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div class="alk-preview">Branch preview · development build</div>',
    );
  else if (!props.preview) preview?.remove();
  const brand = document.querySelector<HTMLAnchorElement>('.alk-brand');
  if (brand) {
    brand.textContent = siteName === 'Alkemist' ? 'alkemist' : siteName;
    if (props.tagline)
      brand.insertAdjacentHTML(
        'beforeend',
        `<span class="alk-brand-detail"> / ${escapeHtml(props.tagline)}</span>`,
      );
    brand.setAttribute('aria-label', `${siteName} home`);
  }
  const nav = document.querySelector<HTMLElement>('.alk-desktop-nav');
  if (nav) {
    nav.querySelectorAll(':scope > a').forEach((link) => link.remove());
    nav.insertAdjacentHTML(
      'afterbegin',
      renderLinks(props.navigation ?? [], document.location.pathname),
    );
  }
  // Preserve the server-rendered disclosure elements and their event handlers.
  const moreMenu = document.querySelector<HTMLDetailsElement>('.alk-more');
  const more = moreMenu?.querySelector<HTMLElement>('.alk-more-links');
  if (more)
    more.innerHTML = renderLinks(
      props.moreNavigation ?? [],
      document.location.pathname,
    );
  if (moreMenu) {
    moreMenu.hidden = !props.moreNavigation?.length;
    if (moreMenu.hidden) moreMenu.open = false;
  }
  const mobileMenu =
    document.querySelector<HTMLDetailsElement>('.alk-mobile-menu');
  const mobile = mobileMenu?.querySelector<HTMLElement>('.alk-mobile-links');
  if (mobile) {
    const icon = mobile.querySelector('a svg')?.outerHTML ?? '';
    const mobileLinks = (links: NavLink[]) => {
      const template = document.createElement('template');
      template.innerHTML = renderLinks(links, document.location.pathname);
      template.content.querySelectorAll('a').forEach((link) => {
        const label = document.createElement('span');
        label.textContent = link.textContent;
        link.replaceChildren(label);
        link.insertAdjacentHTML('beforeend', icon);
      });
      return template.innerHTML;
    };
    mobile.innerHTML =
      mobileLinks(props.navigation ?? []) +
      (props.moreNavigation?.length
        ? '<div class="alk-mobile-secondary">' +
          mobileLinks(props.moreNavigation) +
          '</div>'
        : '');
  }
  if (mobileMenu) {
    mobileMenu.hidden =
      !props.navigation?.length && !props.moreNavigation?.length;
    if (mobileMenu.hidden) mobileMenu.open = false;
  }
  const footer = document.querySelector<HTMLElement>('.alk-footer');
  if (footer)
    footer
      .querySelectorAll(':scope > a:not(:first-child)')
      .forEach((link) => link.remove());
  const footerBrand = footer?.querySelector<HTMLAnchorElement>(':scope > a');
  if (footerBrand) footerBrand.textContent = siteName;
  if (footer)
    footer.insertAdjacentHTML(
      'beforeend',
      renderLinks(props.footerNavigation ?? [], document.location.pathname),
    );
  const eyebrow = document.querySelector<HTMLElement>(
    '.alk-main > .alk-eyebrow',
  );
  if (props.section) {
    if (eyebrow) eyebrow.textContent = props.section;
    else
      document
        .querySelector('.alk-main')
        ?.insertAdjacentHTML(
          'afterbegin',
          `<p class="alk-eyebrow">${escapeHtml(props.section)}</p>`,
        );
  } else eyebrow?.remove();
  const actions = document.querySelector<HTMLElement>('.alk-header-actions');
  const oldSearch = actions?.querySelector('alk-search');
  if (props.search) {
    const html = renderSearch(
      props.search === true
        ? { variant: 'header' }
        : { ...props.search, variant: 'header' },
    );
    if (oldSearch) oldSearch.outerHTML = html;
    else actions?.insertAdjacentHTML('afterbegin', html);
  } else oldSearch?.remove();
}
