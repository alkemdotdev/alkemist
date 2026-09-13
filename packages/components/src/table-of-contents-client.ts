class TableOfContentsElement extends HTMLElement {
  private abort?: AbortController;
  private frame?: number;
  private links = new Map<string, HTMLAnchorElement>();
  private headings: HTMLElement[] = [];

  connectedCallback() {
    if (this.abort) return;

    this.abort = new AbortController();
    this.links = new Map(
      Array.from(
        this.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'),
      ).map((link) => [link.dataset.tocLink ?? '', link]),
    );
    this.headings = Array.from(this.links.keys())
      .map((slug) => document.getElementById(slug))
      .filter((heading): heading is HTMLElement => heading !== null);

    window.addEventListener('hashchange', this.syncHash, {
      signal: this.abort.signal,
    });
    window.addEventListener('scroll', this.schedulePosition, {
      passive: true,
      signal: this.abort.signal,
    });
    window.addEventListener('resize', this.schedulePosition, {
      passive: true,
      signal: this.abort.signal,
    });
    this.syncHash();
    this.schedulePosition();
  }

  disconnectedCallback() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.abort?.abort();
    this.abort = undefined;
    this.links.clear();
    this.headings = [];
  }

  private setCurrent(slug?: string) {
    this.links.forEach((link, linkSlug) => {
      if (linkSlug === slug) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  private syncHash = () => {
    let slug: string;
    try {
      slug = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (slug && this.links.has(slug)) this.setCurrent(slug);
  };

  private syncPosition = () => {
    const threshold = window.innerHeight * 0.3;
    const current = this.headings
      .filter((heading) => heading.getBoundingClientRect().top <= threshold)
      .at(-1);
    const visible = current ?? this.headings[0];
    if (visible) this.setCurrent(visible.id);
  };

  private schedulePosition = () => {
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.syncPosition();
    });
  };
}

if (!customElements.get('alk-table-of-contents')) {
  customElements.define('alk-table-of-contents', TableOfContentsElement);
}
