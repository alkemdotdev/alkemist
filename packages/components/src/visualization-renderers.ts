import { chartCanZoom, type ChartProps } from './charts.ts';
import type { ModelProps } from './model.astro';
import type { ShaderProps } from './shader.astro';
import { INKS } from '@alkemdotdev/alkemist-theme/palette';

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
  const canZoom = chartCanZoom(props);
  const height = Number.isFinite(props.height) ? props.height! : 300;
  return `<alk-chart class="alk-chart" data-config="${escape(JSON.stringify(props))}">
  <figure class="alk-figure" aria-label="${escape(props.title)}">
    <figcaption class="alk-chart-caption alk-figure-heading"><div>
      <p class="alk-chart-kicker alk-figure-label">${props.sample ? 'Synthetic dataset' : 'Data visualization'} · ${escape(props.type)}</p>
      <h3 class="alk-figure-title">${escape(props.title)}</h3><p class="alk-figure-description">${escape(props.description)}</p>
    </div><span class="alk-chart-file alk-figure-format">CSV</span></figcaption>
    <div class="alk-chart-canvas" style="min-height: ${height}px" aria-busy="true"></div>
    <div class="alk-chart-tools alk-figure-controls" aria-label="${escape(props.title)} controls">
      ${canZoom ? '<button type="button" data-chart-reset disabled>Reset view</button>' : ''}
      <button type="button" data-chart-retry hidden>Retry</button>
      ${canZoom ? '<span class="alk-chart-hint">Shift + scroll to zoom · drag to pan</span>' : ''}
    </div>
    <div class="alk-figure-footer"><p class="alk-chart-status alk-figure-status" role="status" aria-live="polite">Chart loads when visible.</p>
      <a href="${url(props.src)}" download>Download CSV <span aria-hidden="true">↓</span></a></div>
    <details class="alk-chart-table"><summary>Data table <span data-chart-count></span></summary>
      <div class="alk-chart-table-scroll" tabindex="0" aria-label="${escape(props.title)} data table"><p data-chart-table-placeholder>The table loads alongside the chart.</p></div></details>
    ${props.caption ? `<p class="alk-chart-source alk-figure-caption">${escape(props.caption)}</p>` : ''}
    <noscript><p class="alk-figure-caption">JavaScript is required for this interactive view. Download the CSV to inspect the source data.</p></noscript>
  </figure></alk-chart>`;
}

export function renderModel({
  src,
  title,
  description,
  poster,
  class: className,
}: ModelProps): string {
  return `<alk-model class="alk-model ${escape(className)}" data-src="${url(src)}" data-state="idle">
    <figure class="alk-figure" aria-label="${escape(title)}">
      <figcaption class="alk-model-heading alk-figure-heading"><div><p class="alk-model-label alk-figure-label">3D model · glTF 2.0</p>
      <h3 class="alk-figure-title">${escape(title)}</h3>${description ? `<p class="alk-model-description alk-figure-description">${escape(description)}</p>` : ''}</div></figcaption>
      <div class="alk-model-viewport" aria-busy="false">
        ${poster ? `<img class="alk-model-poster" src="${url(poster)}" alt="Static view of ${escape(title)}" loading="lazy" width="960" height="640" />` : ''}
        <canvas aria-label="${escape(title)}. Drag to orbit; use arrow keys to rotate and plus or minus to zoom." role="img" tabindex="0"></canvas>
        <div class="alk-model-axis" aria-hidden="true"><span>X</span><span>Y</span><span>Z</span></div><p class="alk-model-hint">Drag to orbit · scroll to zoom</p>
      </div>
      <div class="alk-model-toolbar alk-figure-controls" aria-label="${escape(title)} controls">
        <div class="alk-model-presets" role="group" aria-label="Camera view"><button type="button" data-view="perspective" disabled>Reset view</button><button type="button" data-view="front" disabled>Front</button><button type="button" data-view="top" disabled>Top</button></div>
        <div class="alk-model-switches"><label><input type="checkbox" data-wireframe disabled /> Wireframe</label><label><input type="checkbox" data-spin disabled /> Spin</label></div>
      </div>
      <div class="alk-model-footer alk-figure-footer"><p class="alk-model-status alk-figure-status" role="status" aria-live="polite">Interactive view loads when visible.</p><a href="${url(src)}" download>Download model <span aria-hidden="true">↓</span></a></div>
      <noscript><p class="alk-figure-caption">Enable JavaScript to explore this model. The original file is available above.</p></noscript>
    </figure></alk-model>`;
}

export function renderShader({
  title = 'Interference field',
  frequency = 9,
  angle = 24,
  class: className,
}: ShaderProps): string {
  const f = Math.max(
    3,
    Math.min(18, Number.isFinite(frequency) ? frequency : 9),
  );
  const a = Math.max(0, Math.min(180, Number.isFinite(angle) ? angle : 24));
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
  return `<alk-shader class="alk-shader ${escape(className)}" data-state="idle"><figure class="alk-figure" aria-label="${escape(title)}">
    <figcaption class="alk-shader-heading alk-figure-heading"><div><p class="alk-figure-label">Shader · two wave sources</p><h3 class="alk-figure-title">${escape(title)}</h3></div><span class="alk-shader-tag alk-figure-format">GLSL</span></figcaption>
    <div class="alk-shader-viewport"><svg class="alk-shader-poster" viewBox="0 0 960 520" role="img" aria-label="Static illustration of two overlapping concentric wave sources; the interactive shader loads when visible.">${circles}</svg>
    <canvas role="img" aria-label="${escape(title)}: interference contours from two point sources, rendered with the eight Alkemist inks."></canvas><p class="alk-shader-coordinate" aria-hidden="true">ψ = sin(k r₁ − φ) + sin(k r₂ − φ)</p></div>
    <div class="alk-shader-controls alk-figure-controls" aria-label="${escape(title)} controls">
      <label><span>Frequency <output data-frequency-output>${f.toFixed(1)}</output></span><input type="range" min="3" max="18" step="0.1" value="${f}" data-frequency disabled /></label>
      <label><span>Source angle <output data-angle-output>${a.toFixed(0)}°</output></span><input type="range" min="0" max="180" step="1" value="${a}" data-angle disabled /></label>
      <button type="button" data-play aria-pressed="false" disabled>Play waves</button>
    </div>
    <div class="alk-shader-footer alk-figure-footer"><p class="alk-figure-status" role="status" aria-live="polite">Shader loads when visible.</p></div>
    <noscript><p class="alk-shader-nojs alk-figure-caption">Enable JavaScript to change the frequency and angle or animate the field.</p></noscript>
  </figure></alk-shader>`;
}
