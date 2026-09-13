type PagefindResultData = {
  url: string;
  meta: { title?: string };
  excerpt?: string;
};
type PagefindResult = { data: () => Promise<PagefindResultData> };
type Pagefind = {
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
};

const excerptFragment = (excerpt: string | undefined) => {
  const fragment = document.createDocumentFragment();
  if (!excerpt) return fragment;
  const parsed = new DOMParser().parseFromString(excerpt, 'text/html');
  const append = (node: Node, parent: DocumentFragment | HTMLElement) => {
    if (node.nodeType === Node.TEXT_NODE) parent.append(node.textContent ?? '');
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const target =
        element.tagName === 'MARK' ? document.createElement('mark') : parent;
      element.childNodes.forEach((child) => append(child, target));
      if (target !== parent) parent.append(target);
    }
  };
  parsed.body.childNodes.forEach((node) => append(node, fragment));
  return fragment;
};

const safeHref = (value: string) => {
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : undefined;
  } catch {
    return undefined;
  }
};

/** Attach Pagefind search behavior to one rendered alk-search element. */
export function initializeSearch(root: HTMLElement): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const indexUrl = root.dataset.indexUrl ?? '/pagefind/pagefind.js';
  const isDevelopment = root.dataset.development === 'true';
  const inputs = [
    ...root.querySelectorAll<HTMLInputElement>('[data-search-input]'),
  ];
  const results = [
    ...root.querySelectorAll<HTMLElement>('[data-search-results]'),
  ];
  const dialog = root.querySelector<HTMLDialogElement>('[data-search-dialog]');
  const openButton =
    root.querySelector<HTMLButtonElement>('[data-search-open]');
  const closeButton = root.querySelector<HTMLButtonElement>(
    '[data-search-close]',
  );
  let pagefind: Promise<Pagefind> | undefined;
  let request = 0;
  let timer: number | undefined;

  const show = (message?: string) =>
    results.forEach((container) => {
      container.replaceChildren();
      container.hidden = !message;
      if (message) container.append(message);
    });
  const load = () => {
    if (!pagefind)
      pagefind = (
        import(/* @vite-ignore */ indexUrl) as Promise<Pagefind>
      ).catch((error) => {
        pagefind = undefined;
        throw error;
      });
    return pagefind;
  };
  const render = (
    items: PagefindResultData[],
    total: number,
    loadMore?: () => void,
  ) =>
    results.forEach((container) => {
      container.replaceChildren();
      container.hidden = items.length === 0;
      const list = document.createElement('ul');
      list.className = 'alk-search-result-list';
      items.forEach((item) => {
        const href = safeHref(item.url);
        if (!href) return;
        const link = document.createElement('a');
        link.href = href;
        link.className = 'alk-search-result';
        const title = document.createElement('strong');
        title.textContent = item.meta.title || href;
        link.append(title);
        if (item.excerpt) {
          const excerpt = document.createElement('span');
          excerpt.append(excerptFragment(item.excerpt));
          link.append(excerpt);
        }
        const row = document.createElement('li');
        row.append(link);
        list.append(row);
      });
      if (list.childElementCount) container.append(list);
      else {
        container.hidden = false;
        container.append('No safe local results found.');
      }
      if (loadMore) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'alk-search-more';
        more.textContent = `Showing first ${items.length} of ${total} results. Show more results`;
        more.addEventListener('click', loadMore, { signal });
        container.append(more);
      }
    });
  const search = async () => {
    const query = inputs[0]?.value.trim() ?? '';
    inputs.forEach((input) => {
      if (input.value !== query) input.value = query;
    });
    const searchRequest = ++request;
    if (!query) return show();
    if (isDevelopment)
      return show(
        'Search is available after building the site. Run npm run build, then npm run preview.',
      );
    show('Searching…');
    try {
      const response = await (await load()).search(query);
      const records = response.results;
      const items: PagefindResultData[] = [];
      let loadingNext = false;
      const loadNext = async () => {
        if (loadingNext) return;
        loadingNext = true;
        try {
          const next = await Promise.all(
            records
              .slice(items.length, items.length + 20)
              .map((result) => result.data()),
          );
          if (signal.aborted || searchRequest !== request) return;
          items.push(...next);
          render(
            items,
            records.length,
            items.length < records.length
              ? () =>
                  void loadNext().catch(() =>
                    show(
                      'Search is temporarily unavailable. Please try again later.',
                    ),
                  )
              : undefined,
          );
        } finally {
          loadingNext = false;
        }
      };
      await loadNext();
      if (!items.length && searchRequest === request)
        show('No results found. Try another term.');
    } catch (error) {
      if (signal.aborted || searchRequest !== request) return;
      console.warn('Alkemist search could not load the Pagefind index.', error);
      show(
        isDevelopment
          ? 'Search index is unavailable in this development build. Run a production build to generate Pagefind files.'
          : 'Search is temporarily unavailable. Please try again later.',
      );
    }
  };
  const debounce = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void search(), 180);
  };
  root.querySelectorAll<HTMLFormElement>('[data-search-form]').forEach((form) =>
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void search();
      },
      { signal },
    ),
  );
  inputs.forEach((input) =>
    input.addEventListener(
      'input',
      () => {
        request += 1;
        inputs.forEach((other) => {
          if (other !== input) other.value = input.value;
        });
        debounce();
      },
      { signal },
    ),
  );
  const open = () => {
    if (!dialog?.open) dialog?.showModal();
    openButton?.setAttribute('aria-expanded', 'true');
    window.setTimeout(() =>
      dialog?.querySelector<HTMLInputElement>('input')?.focus(),
    );
  };
  const close = () => {
    if (dialog?.open) dialog.close();
    openButton?.setAttribute('aria-expanded', 'false');
    openButton?.focus();
  };
  openButton?.addEventListener('click', open, { signal });
  closeButton?.addEventListener('click', close, { signal });
  dialog?.addEventListener(
    'close',
    () => {
      openButton?.setAttribute('aria-expanded', 'false');
      openButton?.focus();
    },
    { signal },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        if (dialog?.open) close();
        else {
          request += 1;
          show();
        }
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const container = dialog?.open
        ? dialog.querySelector<HTMLElement>('[data-search-results]')
        : root.querySelector<HTMLElement>(':scope > [data-search-results]');
      const links = [
        ...(container?.querySelectorAll<HTMLAnchorElement>(
          '.alk-search-result',
        ) ?? []),
      ];
      const current = links.indexOf(
        document.activeElement as HTMLAnchorElement,
      );
      if (!links.length) return;
      if (current === -1 && event.target instanceof HTMLInputElement) {
        event.preventDefault();
        links[event.key === 'ArrowDown' ? 0 : links.length - 1]?.focus();
      } else if (current >= 0) {
        event.preventDefault();
        links[
          (current + (event.key === 'ArrowDown' ? 1 : links.length - 1)) %
            links.length
        ]?.focus();
      }
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k')
        return;
      event.preventDefault();
      if (matchMedia('(max-width: 650px)').matches) open();
      else inputs[0]?.focus();
    },
    { signal },
  );
  return () => {
    window.clearTimeout(timer);
    request += 1;
    abort.abort();
  };
}

class SearchElement extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    this.cleanup?.();
    this.cleanup = initializeSearch(this);
  }
  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

if (!customElements.get('alk-search'))
  customElements.define('alk-search', SearchElement);
