import type { ImageMetadata } from 'astro';

export type AlkPostListLayout = 'rows' | 'featured' | 'grid' | 'featured-grid';

export interface AlkPostListCover {
  /** A local Astro image import, or a remote/public image URL. */
  src: ImageMetadata | string;
  alt: string;
  fit?: 'cover' | 'contain';
  /** Percentage used for `object-position` when `fit` is `cover`. */
  focalX?: number;
  /** Percentage used for `object-position` when `fit` is `cover`. */
  focalY?: number;
}

export interface AlkPostListItem {
  href: string;
  title: string;
  description: string;
  /** An ISO calendar date in YYYY-MM-DD form. */
  date?: string;
  cover?: AlkPostListCover;
}

/** Public options accepted by {@link AlkPostList}. */
export interface AlkPostListProps {
  items: AlkPostListItem[];
  layout?: AlkPostListLayout;
  /** Show the progressive-enhancement layout selector. */
  selectable?: boolean;
  /** Item href that should lead a featured layout. */
  featuredHref?: string;
  /** Accessible name for the post collection. */
  label?: string;
}

export const alkPostListLayouts = [
  'rows',
  'featured',
  'grid',
  'featured-grid',
] as const satisfies readonly AlkPostListLayout[];

/**
 * Moves the explicitly featured item to the lead position without duplicating
 * it. Other items retain their relative order.
 */
export function prepareAlkPostListItems(
  items: readonly AlkPostListItem[],
  featuredHref?: string,
): AlkPostListItem[] {
  if (!featuredHref) return [...items];
  const featuredIndex = items.findIndex((item) => item.href === featuredHref);
  if (featuredIndex <= 0) return [...items];

  const featured = items[featuredIndex]!;
  return [
    featured,
    ...items.slice(0, featuredIndex),
    ...items.slice(featuredIndex + 1),
  ];
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class AlkPostListElement extends HTMLElement {
    private select?: HTMLSelectElement;
    private changeLayout = () => {
      const layout = this.select?.value;
      if (!layout || !alkPostListLayouts.includes(layout as AlkPostListLayout))
        return;
      this.dataset.layout = layout;
    };

    connectedCallback() {
      if (this.dataset.enhanced === 'true') return;
      this.select =
        this.querySelector<HTMLSelectElement>('[data-post-list-layout]') ??
        undefined;
      if (this.select) this.select.value = this.dataset.layout ?? 'rows';
      this.select?.addEventListener('change', this.changeLayout);
      this.dataset.enhanced = 'true';
    }

    disconnectedCallback() {
      this.select?.removeEventListener('change', this.changeLayout);
      this.select = undefined;
      delete this.dataset.enhanced;
    }
  }

  if (!customElements.get('alk-post-list'))
    customElements.define('alk-post-list', AlkPostListElement);
}
