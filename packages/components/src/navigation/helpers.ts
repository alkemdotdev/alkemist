export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

/** Remove the fragment and treat `/guide` and `/guide/` as the same page. */
export function pagePath(value: string): string {
  const hashIndex = value.indexOf('#');
  const path = (hashIndex === -1 ? value : value.slice(0, hashIndex)).trim();

  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

/** Keep navigation links to locations a browser can safely navigate to. */
export function navigationHref(value: string): string | undefined {
  const href = value.trim();
  if (!href) return undefined;

  if (
    href.startsWith('/') ||
    href.startsWith('#') ||
    href.startsWith('./') ||
    href.startsWith('../')
  ) {
    return href;
  }

  try {
    const protocol = new URL(href).protocol;
    return protocol === 'http:' ||
      protocol === 'https:' ||
      protocol === 'mailto:'
      ? href
      : undefined;
  } catch {
    return undefined;
  }
}

export function navigationContainsCurrent(
  item: NavigationItem,
  currentPath: string,
): boolean {
  if (pagePath(item.href) === pagePath(currentPath)) return true;
  return (
    item.children?.some((child) =>
      navigationContainsCurrent(child, currentPath),
    ) ?? false
  );
}

export function navigationIsExpanded(
  item: NavigationItem,
  currentPath: string,
  depth: number,
  expandedDepth = 1,
): boolean {
  return depth < expandedDepth || navigationContainsCurrent(item, currentPath);
}
