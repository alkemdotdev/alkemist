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
import {
  chartExportFilename,
  chartRowsToCsv,
  chartTablePage,
} from './chart-data';
import { validateParameters, type ParameterValues } from './parameters';
import { chartParameters } from './figure-parameters';

class ChartElement extends HTMLElement {
  private config!: ChartProps;
  private rows?: ChartRow[];
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
  private tablePage = 0;
  private themeChange = () => {
    if (this.rows) void this.render();
  };
  private resetView = () => {
    void this.render({ preserveZoom: false });
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
    this.querySelector('[data-chart-download-csv]')?.addEventListener(
      'click',
      () => this.downloadCsv(),
      { signal: this.abort.signal },
    );
    this.querySelectorAll<HTMLButtonElement>('[data-chart-export]').forEach(
      (control) => {
        control.addEventListener(
          'click',
          () =>
            void this.exportChart(control.dataset.chartExport as 'svg' | 'png'),
          { signal: this.abort!.signal },
        );
      },
    );
    this.querySelector('[data-chart-table-previous]')?.addEventListener(
      'click',
      () => this.changeTablePage(-1),
      { signal: this.abort.signal },
    );
    this.querySelector('[data-chart-table-next]')?.addEventListener(
      'click',
      () => this.changeTablePage(1),
      { signal: this.abort.signal },
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
    this.querySelectorAll<HTMLButtonElement>(
      '[data-chart-download-csv], [data-chart-export], [data-chart-table-previous], [data-chart-table-next]',
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

  private async render({ preserveZoom = true } = {}) {
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
      const priorState = preserveZoom ? this.interactionState() : undefined;
      this.result?.finalize();
      this.result = result;
      const domains = Object.entries(priorState?.signals ?? {});
      if (domains.length) {
        for (const [name, domain] of domains) result.view.signal(name, domain);
        await result.view.runAsync();
      }
      if (!this.isCurrent(result, generation)) {
        result.finalize();
        return;
      }
      this.canvas.replaceChildren(mount);
      this.setStatus(
        `${this.rows.length.toLocaleString()} prepared rows plotted from CSV.`,
        'ready',
      );
      this.renderTable();
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

  private interactionState() {
    if (!chartCanZoom(this.config)) return;
    const state = this.result?.view.getState({
      signals: (name) => name?.startsWith('alk_window_') ?? false,
      data: () => false,
      recurse: false,
    });
    if (!state) return;
    return {
      signals: Object.fromEntries(
        Object.entries(state.signals ?? {}).filter(([, value]) =>
          isZoomDomain(value),
        ),
      ),
    };
  }

  private isCurrent(result: Result, generation: number) {
    return (
      this.isConnected &&
      generation === this.generation &&
      this.result === result
    );
  }

  private renderTable() {
    if (!this.rows) return;
    const page = chartTablePage(this.rows, this.tablePage);
    this.tablePage = page.page;
    const table = document.createElement('table');
    const caption = table.createCaption();
    caption.textContent = `${this.config.title}. Prepared rows plotted in this chart. Showing rows ${page.total ? page.page * 25 + 1 : 0}–${Math.min((page.page + 1) * 25, page.total)} of ${page.total}. Empty cells are missing values.`;
    const heading = table.createTHead().insertRow();
    for (const field of page.fields) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = field;
      heading.append(cell);
    }
    const body = table.createTBody();
    for (const row of page.rows) {
      const tr = body.insertRow();
      for (const field of page.fields)
        tr.insertCell().textContent =
          row[field] === null ? '' : String(row[field]);
    }
    this.querySelector('.alk-chart-table-scroll')!.replaceChildren(table);
    this.querySelector('[data-chart-count]')!.textContent =
      `(${page.total.toLocaleString()} prepared rows)`;
    const current = this.querySelector<HTMLElement>('[data-chart-table-page]');
    if (current)
      current.textContent = `Page ${page.page + 1} of ${page.pageCount}`;
    const previous = this.querySelector<HTMLButtonElement>(
      '[data-chart-table-previous]',
    );
    const next = this.querySelector<HTMLButtonElement>(
      '[data-chart-table-next]',
    );
    if (previous)
      previous.disabled = page.page === 0 || this.dataset.state !== 'ready';
    if (next)
      next.disabled =
        page.page >= page.pageCount - 1 || this.dataset.state !== 'ready';
  }

  private changeTablePage(delta: number) {
    if (!this.rows) return;
    this.tablePage += delta;
    this.renderTable();
  }

  private downloadCsv() {
    if (!this.rows) return;
    this.download(
      new Blob([chartRowsToCsv(this.rows)], { type: 'text/csv;charset=utf-8' }),
      chartExportFilename(this.config.title, 'csv'),
    );
    this.setStatus('Prepared plotted data exported as CSV.', 'ready');
    this.renderTable();
  }

  private async exportChart(format: 'svg' | 'png') {
    const result = this.result;
    const generation = this.generation;
    if (!result) return;
    const control = this.querySelector<HTMLButtonElement>(
      `[data-chart-export="${format}"]`,
    );
    if (control) control.disabled = true;
    this.setStatus(`Preparing ${format.toUpperCase()} export…`, 'loading');
    try {
      if (format === 'svg') {
        const svg = await result.view.toSVG();
        if (!this.isCurrent(result, generation)) return;
        this.download(
          new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
          chartExportFilename(this.config.title, 'svg'),
        );
      } else {
        const url = await result.view.toImageURL('png', 2);
        if (!this.isCurrent(result, generation)) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = chartExportFilename(this.config.title, 'png');
        link.click();
      }
      if (!this.isCurrent(result, generation)) return;
      this.setStatus(`Chart exported as ${format.toUpperCase()}.`, 'ready');
      this.renderTable();
    } catch (error) {
      if (!this.isCurrent(result, generation)) return;
      this.setStatus(
        `Could not export ${format.toUpperCase()}: ${error instanceof Error ? error.message : 'an unexpected error occurred.'}`,
        'ready',
      );
      this.renderTable();
    }
  }

  private download(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

function isZoomDomain(value: unknown): value is [number | Date, number | Date] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (endpoint) => typeof endpoint === 'number' || endpoint instanceof Date,
    )
  );
}

if (!customElements.get('alk-chart'))
  customElements.define('alk-chart', ChartElement);
