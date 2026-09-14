let mermaidLoad: Promise<typeof import('mermaid')> | undefined;
let renderQueue = Promise.resolve();
let diagramId = 0;

class DiagramElement extends HTMLElement {
  private observer?: IntersectionObserver;
  private events?: AbortController;
  private generation = 0;

  connectedCallback() {
    if (this.events) return;
    this.events = new AbortController();
    this.addEventListener(
      'alk:presentation',
      () => {
        if (this.dataset.alkActive !== 'false') {
          // Revealing a fragment changes visibility without changing its
          // intersection rectangle. Request a fresh initial observer entry.
          this.observer?.disconnect();
          this.observer = undefined;
          this.observe();
        }
      },
      { signal: this.events.signal },
    );
    this.observe();
  }

  disconnectedCallback() {
    this.generation++;
    this.observer?.disconnect();
    this.observer = undefined;
    this.events?.abort();
    this.events = undefined;
    if (this.dataset.state === 'loading') delete this.dataset.state;
  }

  private observe() {
    if (
      this.observer ||
      this.dataset.state === 'ready' ||
      this.dataset.state === 'loading' ||
      this.dataset.state === 'error'
    )
      return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          this.dataset.alkActive !== 'false'
        ) {
          this.observer?.disconnect();
          this.observer = undefined;
          void this.render();
        }
      },
      { rootMargin: '120px' },
    );
    this.observer.observe(this);
  }

  private async render() {
    const source = this.querySelector<HTMLElement>(
      '[data-diagram-source], pre',
    );
    if (
      !source ||
      this.dataset.state === 'loading' ||
      this.dataset.state === 'ready'
    )
      return;
    const epoch = ++this.generation;
    this.dataset.state = 'loading';
    this.setAttribute('aria-busy', 'true');
    const task = async () => {
      try {
        const { default: mermaid } = await (mermaidLoad ??= import('mermaid'));
        if (!this.isConnected || epoch !== this.generation) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          fontFamily: 'Ubuntu, sans-serif',
          suppressErrorRendering: true,
        });
        const { svg } = await mermaid.render(
          `alk-diagram-${++diagramId}`,
          source.textContent ?? '',
        );
        if (!this.isConnected || epoch !== this.generation) return;
        const figure = document.createElement('div');
        figure.className = 'alk-diagram-render';
        figure.innerHTML = svg;
        this.prepend(figure);
        const details = document.createElement('details');
        details.className = 'alk-diagram-source';
        const summary = document.createElement('summary');
        summary.textContent = 'Diagram source';
        source.before(details);
        details.append(summary, source);
        this.dataset.state = 'ready';
      } catch (error) {
        if (!this.isConnected || epoch !== this.generation) return;
        mermaidLoad = undefined;
        this.dataset.state = 'error';
        const message = document.createElement('p');
        message.className = 'alk-diagram-error';
        message.setAttribute('role', 'status');
        message.textContent = `Diagram could not render: ${error instanceof Error ? error.message : 'unknown error'}. Source remains available.`;
        this.append(message);
      } finally {
        if (epoch === this.generation) this.setAttribute('aria-busy', 'false');
      }
    };
    renderQueue = renderQueue.then(task, task);
    await renderQueue;
  }
}

if (!customElements.get('alk-diagram'))
  customElements.define('alk-diagram', DiagramElement);
