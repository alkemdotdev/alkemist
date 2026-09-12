import { ALK_INKS } from '@alkemdotdev/alkemist-theme/palette';
import type embed from 'vega-embed';
import type { Result } from 'vega-embed';
import {
  alkChartInks,
  createAlkChartSpec,
  prepareAlkChartRows,
  type AlkChartProps,
  type AlkChartRow,
  type AlkChartTheme,
} from './charts';

class AlkChartElement extends HTMLElement {
  private config!: AlkChartProps;
  private rows?: AlkChartRow[];
  private raw?: AlkChartRow[];
  private embed?: typeof embed;
  private result?: Result;
  private visible?: IntersectionObserver;
  private resize?: ResizeObserver;
  private abort?: AbortController;
  private generation = 0;
  private width = 0;
  private resizeTimer?: number;
  private themeChange = () => {
    if (this.rows) void this.render();
  };
  private resetView = () => {
    void this.render();
  };
  private retryLoad = () => {
    void this.load();
  };

  connectedCallback() {
    this.config = JSON.parse(this.dataset.config ?? '{}');
    this.abort = new AbortController();
    this.querySelector('[data-chart-reset]')?.addEventListener(
      'click',
      this.resetView,
    );
    this.querySelector('[data-chart-retry]')?.addEventListener(
      'click',
      this.retryLoad,
    );
    window.addEventListener('alk:theme-change', this.themeChange);
    this.resize = new ResizeObserver(() => {
      const width = Math.floor(this.canvas.clientWidth);
      if (width === this.width || width <= 0) return;
      this.width = width;
      window.clearTimeout(this.resizeTimer);
      // Tick density and legend columns are compiled from the container width.
      // A new specification keeps those readable after a desktop/mobile resize.
      this.resizeTimer = window.setTimeout(() => {
        void this.render();
      }, 120);
    });
    this.resize.observe(this.canvas);
    this.visible = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible?.disconnect();
          void this.load();
        }
      },
      { rootMargin: '160px' },
    );
    this.visible.observe(this);
  }

  disconnectedCallback() {
    this.generation++;
    this.abort?.abort();
    this.visible?.disconnect();
    this.resize?.disconnect();
    window.clearTimeout(this.resizeTimer);
    this.result?.finalize();
    this.result = undefined;
    window.removeEventListener('alk:theme-change', this.themeChange);
    this.querySelector('[data-chart-reset]')?.removeEventListener(
      'click',
      this.resetView,
    );
    this.querySelector('[data-chart-retry]')?.removeEventListener(
      'click',
      this.retryLoad,
    );
  }

  private get canvas() {
    return this.querySelector<HTMLElement>('.alk-chart-canvas')!;
  }

  private setStatus(message: string, state: 'loading' | 'ready' | 'error') {
    this.dataset.state = state;
    this.querySelector('.alk-chart-status')!.textContent = message;
    this.canvas.setAttribute('aria-busy', String(state === 'loading'));
    const reset = this.querySelector<HTMLButtonElement>('[data-chart-reset]');
    if (reset) reset.disabled = state !== 'ready';
    this.querySelector<HTMLButtonElement>('[data-chart-retry]')!.hidden =
      state !== 'error';
  }

  private async load() {
    const generation = ++this.generation;
    this.setStatus('Loading the CSV and chart engine…', 'loading');
    try {
      const [embedModule, vega, response] = await Promise.all([
        import('vega-embed'),
        import('vega'),
        fetch(this.config.src, { signal: this.abort?.signal }),
      ]);
      if (!response.ok)
        throw new Error(`CSV request failed (${response.status}).`);
      const csv = await response.text();
      if (!this.isConnected || generation !== this.generation) return;
      const raw = vega.read(csv, { type: 'csv' }) as AlkChartRow[];
      this.rows = prepareAlkChartRows(raw, this.config);
      this.raw = raw;
      this.embed = embedModule.default;
      this.renderTable();
      await this.render();
    } catch (error) {
      if (!this.isConnected || generation !== this.generation) return;
      this.fail(error);
    }
  }

  private resolveTheme(): AlkChartTheme {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    const figure = this.querySelector<HTMLElement>('.alk-figure')!;
    figure.append(probe);
    const resolve = (property: string, fallback: string) => {
      probe.style.color = `var(${property}, ${fallback})`;
      return getComputedStyle(probe).color;
    };
    const theme: AlkChartTheme = {
      text: getComputedStyle(figure).color,
      rule: resolve('--alk-rule', '#ccc'),
      inks: Object.fromEntries(
        alkChartInks.map((ink) => [
          ink,
          resolve(
            `--alk-ink-${ink}`,
            ALK_INKS.find((color) => color.id === ink)!.hex,
          ),
        ]),
      ) as AlkChartTheme['inks'],
    };
    probe.remove();
    return theme;
  }

  private async render() {
    if (!this.rows || !this.embed || !this.isConnected) return;
    window.clearTimeout(this.resizeTimer);
    const generation = ++this.generation;
    this.setStatus('Rendering the chart…', 'loading');
    try {
      this.width = Math.max(1, Math.floor(this.canvas.clientWidth));
      const mount = document.createElement('div');
      const result = await this.embed(
        mount,
        createAlkChartSpec(
          this.config,
          this.rows,
          this.resolveTheme(),
          this.width,
        ),
        {
          actions: false,
          renderer: 'svg',
          defaultStyle: false,
          tooltip: { theme: 'custom' },
        },
      );
      if (!this.isConnected || generation !== this.generation) {
        result.finalize();
        return;
      }
      this.result?.finalize();
      this.result = result;
      this.canvas.replaceChildren(mount);
      this.setStatus(
        `${this.rows.length.toLocaleString()} rows loaded from CSV.`,
        'ready',
      );
    } catch (error) {
      if (this.isConnected && generation === this.generation) this.fail(error);
    }
  }

  private fail(error: unknown) {
    this.result?.finalize();
    this.result = undefined;
    this.canvas.replaceChildren();
    this.setStatus(
      `Chart unavailable: ${error instanceof Error ? error.message : 'An unexpected error occurred.'} The source CSV is still available below.`,
      'error',
    );
  }

  private renderTable() {
    if (!this.raw) return;
    const fields = Object.keys(this.raw[0]);
    const visibleRows = this.raw.slice(0, 100);
    const table = document.createElement('table');
    const caption = table.createCaption();
    caption.textContent = `${this.config.title}. ${this.raw.length > 100 ? `Showing the first 100 of ${this.raw.length} rows; download the CSV for all rows.` : `All ${this.raw.length} source rows.`} Empty cells are missing values.`;
    const heading = table.createTHead().insertRow();
    for (const field of fields) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = field;
      heading.append(cell);
    }
    const body = table.createTBody();
    for (const row of visibleRows) {
      const tr = body.insertRow();
      for (const field of fields)
        tr.insertCell().textContent =
          row[field] === null ? '' : String(row[field]);
    }
    this.querySelector('.alk-chart-table-scroll')!.replaceChildren(table);
    this.querySelector('[data-chart-count]')!.textContent =
      `(${this.raw.length.toLocaleString()} rows)`;
  }
}

if (!customElements.get('alk-chart'))
  customElements.define('alk-chart', AlkChartElement);
