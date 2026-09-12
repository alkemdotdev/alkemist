import type { ImageMetadata } from 'astro';

export type PostListLayout = 'rows' | 'featured' | 'grid' | 'featured-grid';

export interface PostListCover {
  /** A local Astro image import, or a remote/public image URL. */
  src: ImageMetadata | string;
  alt: string;
  fit?: 'cover' | 'contain';
  /** Percentage used for `object-position` when `fit` is `cover`. */
  focalX?: number;
  /** Percentage used for `object-position` when `fit` is `cover`. */
  focalY?: number;
}

export interface PostListItem {
  href: string;
  title: string;
  description: string;
  /** An ISO calendar date in YYYY-MM-DD form. */
  date?: string;
  cover?: PostListCover;
}

/** Public options accepted by {@link PostList}. */
export interface PostListProps {
  items: PostListItem[];
  layout?: PostListLayout;
  /** Show the progressive-enhancement layout selector. */
  selectable?: boolean;
  /** Item href that should lead a featured layout. */
  featuredHref?: string;
  /** Accessible name for the post collection. */
  label?: string;
}

export const postListLayouts = [
  'rows',
  'featured',
  'grid',
  'featured-grid',
] as const satisfies readonly PostListLayout[];

/**
 * Moves the explicitly featured item to the lead position without duplicating
 * it. Other items retain their relative order.
 */
export function preparePostListItems(
  items: readonly PostListItem[],
  featuredHref?: string,
): PostListItem[] {
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
