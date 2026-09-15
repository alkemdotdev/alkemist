import { INKS } from '@alkemdotdev/alkemist-theme/palette';
import type embed from 'vega-embed';
import type { Result } from 'vega-embed';
import {
  chartInks,
  chartCanZoom,
  createChartSpec,
  prepareChartRows,
  type ChartProps,
  type ChartRow,
  type ChartTheme,
} from './charts';
import { validateParameters, type ParameterValues } from './parameters';
import { chartParameters } from './figure-parameters';

class ChartElement extends HTMLElement {
  private config!: ChartProps;
  private rows?: ChartRow[];
  private raw?: ChartRow[];
  private embed?: typeof embed;
  private result?: Result;
  private visible?: IntersectionObserver;
  private resize?: ResizeObserver;
  private abort?: AbortController;
  private generation = 0;
  private width = 0;
  private height = 0;
  private resizeTimer?: number;
  private isVisible = false;
  private active = true;
  private initialParameters: ParameterValues = {};
  private themeChange = () => {
    if (this.rows) void this.render();
  };
  private resetView = () => {
    void this.render();
  };
  private retryLoad = () => {
    void this.load();
  };

  getParameters() {
    return {
      ink: this.config.ink ?? 'cobalt',
      grid: this.config.grid !== false,
      zoom: this.config.zoom !== false,
    };
  }

  setParameters(patch: Record<string, unknown>) {
    const controls = chartParameters.filter(
      (control) =>
        control.name !== 'zoom' || chartCanZoom({ ...this.config, zoom: true }),
    );
    const values = validateParameters(controls, patch);
    this.config = { ...this.config, ...values } as ChartProps;
    this.syncParameters();
    this.dispatchEvent(
      new CustomEvent('alk:parameters-change', {
        bubbles: true,
        detail: this.getParameters(),
      }),
    );
    if (this.rows) void this.render();
  }

  connectedCallback() {
    this.config = JSON.parse(this.dataset.config ?? '{}');
    this.initialParameters = this.getParameters();
    this.active = this.dataset.alkActive !== 'false';
    this.abort = new AbortController();
    this.addEventListener(
      'alk:presentation',
      () => {
        this.active = this.dataset.alkActive !== 'false';
        if (this.canRun()) {
          if (this.rows) void this.render();
          else void this.load();
        }
      },
      { signal: this.abort.signal },
    );
    this.querySelector('[data-chart-reset]')?.addEventListener(
      'click',
      this.resetView,
    );
    this.querySelector('[data-chart-retry]')?.addEventListener(
      'click',
      this.retryLoad,
    );
    this.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-parameter]',
    ).forEach((control) => {
      control.addEventListener(
        'input',
        () => {
          this.setParameters({
            [control.dataset.parameter!]:
              control instanceof HTMLInputElement && control.type === 'checkbox'
                ? control.checked
                : control.value,
          });
        },
        { signal: this.abort!.signal },
      );
    });
    this.querySelector<HTMLButtonElement>(
      '[data-parameters-reset]',
    )?.addEventListener(
      'click',
      () => {
        const visible = [
          ...this.querySelectorAll<HTMLElement>('[data-parameter]'),
        ]
          .map((control) => control.dataset.parameter)
          .filter((name): name is string => Boolean(name));
        this.setParameters(
          Object.fromEntries(
            visible.map((name) => [name, this.initialParameters[name]]),
          ),
        );
      },
      { signal: this.abort.signal },
    );
    window.addEventListener('alk:theme-change', this.themeChange);
    this.resize = new ResizeObserver(() => {
      const width = Math.floor(this.canvas.clientWidth);
      const height = this.layoutHeight();
      if ((width === this.width && height === this.height) || width <= 0)
        return;
      this.width = width;
      this.height = height;
      window.clearTimeout(this.resizeTimer);
      // Tick density and legend columns are compiled from the container width.
      // A new specification keeps those readable after a desktop/mobile resize.
      this.resizeTimer = window.setTimeout(() => {
        if (this.canRun()) void this.render();
      }, 120);
    });
    this.resize.observe(this.canvas);
    this.visible = new IntersectionObserver(
      (entries) => {
        this.isVisible = entries.some((entry) => entry.isIntersecting);
        if (this.canRun()) {
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

  private layoutHeight() {
    return getComputedStyle(this.canvas)
      .getPropertyValue('--alk-chart-height')
      .trim()
      ? Math.max(100, Math.floor(this.canvas.clientHeight) - 12)
      : (this.config.height ?? 300);
  }

  private canRun() {
    return this.active && this.isVisible;
  }

  private setStatus(message: string, state: 'loading' | 'ready' | 'error') {
    this.dataset.state = state;
    this.querySelector('.alk-chart-status')!.textContent = message;
    this.canvas.setAttribute('aria-busy', String(state === 'loading'));
    const reset = this.querySelector<HTMLButtonElement>('[data-chart-reset]');
    if (reset) {
      reset.disabled = state !== 'ready';
      reset.hidden = this.config.zoom === false;
    }
    const hint = this.querySelector<HTMLElement>('[data-chart-hint]');
    if (hint) hint.hidden = this.config.zoom === false;
    this.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >(
      '[data-parameters] input, [data-parameters] select, [data-parameters-reset]',
    ).forEach((control) => {
      control.disabled = state !== 'ready';
    });
    this.querySelector<HTMLButtonElement>('[data-chart-retry]')!.hidden =
      state !== 'error';
  }

  private async load() {
    if (!this.canRun() || this.rows) return;
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
      const raw = vega.read(csv, { type: 'csv' }) as ChartRow[];
      this.rows = prepareChartRows(raw, this.config);
      this.raw = raw;
      this.embed = embedModule.default;
      this.renderTable();
      if (this.canRun()) await this.render();
    } catch (error) {
      if (!this.isConnected || generation !== this.generation) return;
      this.fail(error);
    }
  }

  private resolveTheme(): ChartTheme {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    const figure = this.querySelector<HTMLElement>('.alk-figure')!;
    figure.append(probe);
    const resolve = (property: string, fallback: string) => {
      probe.style.color = `var(${property}, ${fallback})`;
      return getComputedStyle(probe).color;
    };
    const theme: ChartTheme = {
      text: getComputedStyle(figure).color,
      rule: resolve('--alk-rule', '#ccc'),
      inks: Object.fromEntries(
        chartInks.map((ink) => [
          ink,
          resolve(
            `--alk-ink-${ink}`,
            INKS.find((color) => color.id === ink)!.hex,
          ),
        ]),
      ) as ChartTheme['inks'],
    };
    probe.remove();
    return theme;
  }

  private async render() {
    if (!this.rows || !this.embed || !this.isConnected || !this.canRun())
      return;
    window.clearTimeout(this.resizeTimer);
    const generation = ++this.generation;
    this.setStatus('Rendering the chart…', 'loading');
    try {
      this.width = Math.max(1, Math.floor(this.canvas.clientWidth));
      this.height = this.layoutHeight();
      const mount = document.createElement('div');
      const result = await this.embed(
        mount,
        createChartSpec(
          { ...this.config, height: this.height },
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

  private syncParameters() {
    const values: ParameterValues = this.getParameters();
    this.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-parameter]',
    ).forEach((control) => {
      const value = values[control.dataset.parameter!];
      if (control instanceof HTMLInputElement && control.type === 'checkbox')
        control.checked = Boolean(value);
      else control.value = String(value);
    });
    const zoomEnabled = values.zoom === true;
    const reset = this.querySelector<HTMLButtonElement>('[data-chart-reset]');
    if (reset) reset.hidden = !zoomEnabled;
    const hint = this.querySelector<HTMLElement>('[data-chart-hint]');
    if (hint) hint.hidden = !zoomEnabled;
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
  customElements.define('alk-chart', ChartElement);
