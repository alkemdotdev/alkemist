import { chartCanZoom, type ChartProps } from './charts.ts';
import type { ModelProps } from './model.astro';
import type { ShaderProps } from './shader.astro';
import { INKS } from '@alkemdotdev/alkemist-theme/palette';
import { exposedParameters, renderParameters } from './parameters.ts';
import { shaderParameters, chartParameters } from './figure-parameters.ts';
import {
  modelParameters,
  modelViews,
  type ModelView,
} from './model-parameters.ts';

const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
function url(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value, 'https://alkemist.invalid/');
  } catch {
    throw new Error('Use an HTTP(S) or relative asset URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error('Use an HTTP(S) or relative asset URL.');
  return escape(value);
}

/** Shared by Astro output and the live specimen; engines still load lazily. */
export function renderChart(props: ChartProps): string {
  const canZoom = chartCanZoom({ ...props, zoom: true });
  const controls = exposedParameters(
    chartParameters.filter((control) => control.name !== 'zoom' || canZoom),
    props.parameters,
    false,
  );
  const height = Number.isFinite(props.height) ? props.height! : 300;
  return `<alk-chart${props.id ? ` id="${escape(props.id)}"` : ''} class="alk-chart" data-config="${escape(JSON.stringify(props))}">
  <figure class="alk-figure" aria-label="${escape(props.title)}">
    <figcaption class="alk-chart-caption alk-figure-heading"><div>
      ${props.sample ? '<p class="alk-figure-label">Synthetic data</p>' : ''}
      <h3 class="alk-figure-title">${escape(props.title)}</h3>${props.description ? `<p class="alk-figure-description">${escape(props.description)}</p>` : ''}
    </div></figcaption>
    <div class="alk-chart-canvas" style="min-height: ${height}px" aria-busy="true"></div>
    <div class="alk-chart-tools alk-figure-controls" aria-label="${escape(props.title)} controls">
      ${canZoom ? `<button type="button" data-chart-reset${props.zoom === false ? ' hidden' : ''} disabled>Reset view</button>` : ''}
      <button type="button" data-chart-retry hidden>Retry</button>
      <a href="${url(props.src)}" download>Original CSV</a>
      ${canZoom ? `<span class="alk-chart-hint" data-chart-hint${props.zoom === false ? ' hidden' : ''}>Shift + scroll to zoom · drag to pan</span>` : ''}
    </div>
    ${renderParameters(controls, { ink: props.ink ?? 'cobalt', grid: props.grid !== false, zoom: props.zoom !== false })}
    <div class="alk-figure-footer"><p class="alk-chart-status alk-figure-status" role="status" aria-live="polite">Chart loads when visible.</p></div>
    <details class="alk-chart-table alk-chart-data-tools"><summary>Data and export <span data-chart-count></span></summary><div class="alk-chart-data-tools-panel"><p>Inspect the prepared rows plotted in this chart, or save the current chart view.</p><div class="alk-chart-export-actions"><button type="button" data-chart-download-csv disabled>Download plotted CSV</button><button type="button" data-chart-export="svg" disabled>Download SVG</button><button type="button" data-chart-export="png" disabled>Download PNG</button></div>
      <div class="alk-chart-table-scroll" tabindex="0" aria-label="${escape(props.title)} data table"><p data-chart-table-placeholder>The table loads alongside the chart.</p></div><div class="alk-chart-table-pages" aria-label="Data table pages"><button type="button" data-chart-table-previous disabled>Previous page</button><span data-chart-table-page>Page 1 of 1</span><button type="button" data-chart-table-next disabled>Next page</button></div></div></details>
    ${props.caption ? `<p class="alk-chart-source alk-figure-caption">${escape(props.caption)}</p>` : ''}
    <noscript><p class="alk-figure-caption">JavaScript is required for this interactive view. Download the CSV to inspect the source data.</p></noscript>
  </figure></alk-chart>`;
}

export function renderModel({
  id,
  src,
  title,
  description,
  poster,
  view = 'perspective',
  wireframe = false,
  parameters,
  class: className,
}: ModelProps): string {
  const initialView: ModelView = modelViews.includes(view)
    ? view
    : 'perspective';
  const initialParameters = {
    view: initialView,
    wireframe: Boolean(wireframe),
  };
  return `<alk-model${id ? ` id="${escape(id)}"` : ''} class="alk-model ${escape(className)}" data-src="${url(src)}" data-state="idle" data-parameter-values="${escape(JSON.stringify(initialParameters))}">
    <figure class="alk-figure" aria-label="${escape(title)}">
      <figcaption class="alk-model-heading alk-figure-heading"><div>
      <h3 class="alk-figure-title">${escape(title)}</h3>${description ? `<p class="alk-model-description alk-figure-description">${escape(description)}</p>` : ''}</div></figcaption>
      <div class="alk-model-viewport" aria-busy="false">
        ${poster ? `<img class="alk-model-poster" src="${url(poster)}" alt="Static view of ${escape(title)}" loading="lazy" width="960" height="640" />` : ''}
        <canvas aria-label="${escape(title)}. Drag to orbit; Shift + scroll to zoom; arrow keys rotate and plus or minus zoom." role="img" tabindex="0"></canvas>
        <p class="alk-model-hint">Drag to orbit · Shift + scroll to zoom</p>
      </div>
      <div class="alk-model-toolbar alk-figure-controls" aria-label="${escape(title)} controls">
        <button type="button" data-view="perspective" disabled>Reset view</button><details class="alk-figure-options"><summary>View options</summary><div class="alk-figure-options-panel"><div class="alk-model-presets" role="group" aria-label="Camera view"><button type="button" data-view="front" disabled>Front</button><button type="button" data-view="top" disabled>Top</button></div>
        <div class="alk-model-switches"><label><input type="checkbox" data-wireframe${initialParameters.wireframe ? ' checked' : ''} disabled /> Wireframe</label><label><input type="checkbox" data-spin disabled /> Spin</label></div></div></details><a href="${url(src)}" download>Download model</a>
      </div>
      ${renderParameters(exposedParameters(modelParameters, parameters, false), initialParameters)}
      <div class="alk-model-footer alk-figure-footer"><p class="alk-model-status alk-figure-status" role="status" aria-live="polite">Interactive view loads when visible.</p></div>
      <noscript><p class="alk-figure-caption">Enable JavaScript to explore this model. The original file is available above.</p></noscript>
    </figure></alk-model>`;
}

export function renderShader({
  id,
  title = 'Interference field',
  frequency = 9,
  angle = 24,
  parameters,
  class: className,
}: ShaderProps): string {
  const clampStep = (value: number, min: number, max: number, step: number) =>
    Number(
      Math.max(
        min,
        Math.min(max, Math.round((value - min) / step) * step + min),
      ).toFixed(10),
    );
  const f = clampStep(Number.isFinite(frequency) ? frequency : 9, 3, 18, 0.1);
  const a = clampStep(Number.isFinite(angle) ? angle : 24, 0, 180, 1);
  const circles = [-1, 1]
    .map(
      (side) =>
        `<g transform="translate(${480 + side * 145} 260)" fill="none" stroke-width="2">${Array.from(
          { length: 14 },
          (_, i) => {
            const ink = INKS[i % INKS.length];
            return `<circle r="${28 + i * 22}" style="stroke:var(--alk-ink-${ink.id}, ${ink.hex})" />`;
          },
        ).join('')}</g>`,
    )
    .join('');
  return `<alk-shader${id ? ` id="${escape(id)}"` : ''} class="alk-shader ${escape(className)}" data-state="idle" data-parameter-values="${escape(JSON.stringify({ frequency: f, angle: a }))}"><figure class="alk-figure" aria-label="${escape(title)}">
    <figcaption class="alk-shader-heading alk-figure-heading"><div><h3 class="alk-figure-title">${escape(title)}</h3></div></figcaption>
    <div class="alk-shader-viewport"><svg class="alk-shader-poster" viewBox="0 0 960 520" role="img" aria-label="Static illustration of two overlapping concentric wave sources; the interactive shader loads when visible.">${circles}</svg>
    <canvas role="img" aria-label="${escape(title)}: interference contours from two point sources, rendered with the eight Alkemist inks."></canvas></div>
    <div class="alk-shader-controls alk-figure-controls" aria-label="${escape(title)} controls">
      ${renderParameters(exposedParameters(shaderParameters, parameters, true), { frequency: f, angle: a })}
      <button type="button" data-play aria-pressed="false" disabled>Play waves</button>
    </div>
    <div class="alk-shader-footer alk-figure-footer"><p class="alk-figure-status" role="status" aria-live="polite">Shader loads when visible.</p></div>
    <noscript><p class="alk-shader-nojs alk-figure-caption">Enable JavaScript to change the frequency and angle or animate the field.</p></noscript>
  </figure></alk-shader>`;
}
