import { definitions } from './definitions';
import {
  validatePlaygroundValues,
  type JSONValue,
} from '@alkemdotdev/alkemist-components/playground';

const host = document.querySelector<HTMLElement>('#playground-host')!;
const id = host.dataset.example!;
const definition = definitions[id];
let revision = 0;
let lastError = '';
let currentValues = structuredClone(definition.defaults);
const reply = (type: string, extra: Record<string, unknown> = {}) => {
  if (window.parent !== window)
    window.parent.postMessage(
      { type, id, revision, ...extra },
      location.origin,
    );
};
const error = (message: string) => {
  lastError = message;
  reply('alk:playground:error', { message });
};

function validateStructure(values: Record<string, JSONValue>) {
  const array = (name: string) => {
    if (!Array.isArray(values[name]))
      throw new Error(`${name} must be a JSON array.`);
  };
  if (['navigation', 'post-list'].includes(id)) array('items');
  if (['navigation', 'table-of-contents'].includes(id)) array('headings');
  if (id === 'code') {
    array('highlightLines');
    if (
      !(values.highlightLines as JSONValue[]).every(
        (n) => typeof n === 'number' && Number.isInteger(n) && n > 0,
      )
    )
      throw new Error('highlightLines must contain positive whole numbers.');
  }
  if (id === 'layout') {
    for (const key of ['navigation', 'moreNavigation', 'footerNavigation'])
      array(key);
    if (
      typeof values.search !== 'boolean' &&
      (values.search === null ||
        typeof values.search !== 'object' ||
        Array.isArray(values.search))
    )
      throw new Error(
        'search must be true, false, or an object of Search props.',
      );
  }
  if (id === 'chart' && values.type === 'heatmap' && !values.value)
    throw new Error(
      'A heatmap needs a value column. Choose the Heatmap preset or enter its column name.',
    );
  if (id === 'search' || id === 'layout') {
    const index =
      id === 'search'
        ? values.indexUrl
        : typeof values.search === 'object' &&
            values.search &&
            !Array.isArray(values.search)
          ? values.search.indexUrl
          : undefined;
    if (
      index &&
      (typeof index !== 'string' ||
        new URL(index, location.href).origin !== location.origin)
    )
      throw new Error('Use a same-origin Pagefind index URL in this preview.');
  }
}

function headingSamples(
  target: HTMLElement,
  values: Record<string, JSONValue>,
) {
  if (!['navigation', 'table-of-contents'].includes(id)) return;
  const samples = document.createElement('div');
  samples.className = 'playground-heading-samples';
  for (const heading of values.headings as {
    depth: number;
    slug: string;
    text: string;
  }[]) {
    if (![2, 3, 4].includes(heading.depth)) continue;
    const h = document.createElement(`h${heading.depth}`);
    h.id = heading.slug;
    h.textContent = heading.text;
    const p = document.createElement('p');
    p.textContent =
      'This sample section is a real destination. Scroll the preview to follow its position in the contents.';
    samples.append(h, p);
  }
  target.append(samples);
}

async function render(values: Record<string, JSONValue>, version: number) {
  validateStructure(values);
  let html = '';
  let native = false;
  if (['html', 'image', 'audio', 'video'].includes(id)) {
    const m =
      await import('../../../../../packages/components/src/native-content-renderer');
    html = m.renderNativeContent(
      id as Parameters<typeof m.renderNativeContent>[0],
      values,
    );
    native = true;
  } else if (id === 'math' || id === 'code') {
    const m =
      await import('../../../../../packages/components/src/content-renderers');
    html =
      id === 'math'
        ? m.renderMath(values as unknown as Parameters<typeof m.renderMath>[0])
        : await m.renderCode(
            values as unknown as Parameters<typeof m.renderCode>[0],
          );
  } else if (['chart', 'model', 'shader'].includes(id)) {
    const m =
      await import('../../../../../packages/components/src/visualization-renderers');
    html =
      id === 'chart'
        ? m.renderChart(
            values as unknown as Parameters<typeof m.renderChart>[0],
          )
        : id === 'model'
          ? m.renderModel(
              values as unknown as Parameters<typeof m.renderModel>[0],
            )
          : m.renderShader(
              values as unknown as Parameters<typeof m.renderShader>[0],
            );
  } else {
    const m =
      await import('../../../../../packages/components/src/website-renderers');
    if (version !== revision) return;
    if (id === 'layout') {
      await import('../../../../../packages/components/src/search-client');
      if (version !== revision) return;
      m.updateLayoutPreview(
        document,
        values as unknown as Parameters<typeof m.updateLayoutPreview>[1],
      );
      reply('alk:playground:rendered');
      return;
    }
    if (id === 'navigation')
      html = m.renderNavigation(
        values as unknown as Parameters<typeof m.renderNavigation>[0],
      );
    if (id === 'table-of-contents')
      html = m.renderTableOfContents(
        values as unknown as Parameters<typeof m.renderTableOfContents>[0],
      );
    if (id === 'post-list')
      html = m.renderPostList(
        values as unknown as Parameters<typeof m.renderPostList>[0],
      );
    if (id === 'search')
      html = m.renderSearch(
        values as unknown as Parameters<typeof m.renderSearch>[0],
      );
  }
  if (version !== revision) return;
  // Only renderer-produced, escaped markup enters this trusted frame. Source text is never evaluated.
  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  headingSamples(fragment, values);
  host.replaceChildren(...fragment.childNodes);
  if (id === 'code') {
    const { enhanceCode } =
      await import('../../../../../packages/components/src/code-copy');
    if (version !== revision) return;
    enhanceCode(host);
  }
  reply('alk:playground:rendered', native ? { source: html } : {});
}

window.addEventListener('message', async (event: MessageEvent) => {
  if (
    event.origin !== location.origin ||
    event.source !== window.parent ||
    event.data?.type !== 'alk:playground:update' ||
    event.data.id !== id
  )
    return;
  const data = event.data;
  if (!Number.isSafeInteger(data.revision) || data.revision < revision) return;
  revision = data.revision;
  const version = revision;
  lastError = '';
  try {
    if (
      !data.values ||
      typeof data.values !== 'object' ||
      Array.isArray(data.values)
    )
      throw new Error('Parameters must be an object.');
    const result = validatePlaygroundValues(definition, data.values);
    if (!result.valid) throw new Error(Object.values(result.errors).join(' '));
    const theme = ['light', 'dark', 'system'].includes(data.theme)
      ? data.theme
      : 'system';
    document.documentElement.dataset.alkTheme = theme;
    document.documentElement.style.colorScheme =
      theme === 'system' ? 'light dark' : theme;
    window.dispatchEvent(new CustomEvent('alk:theme-change'));
    currentValues = structuredClone(result.values);
    await render(result.values, version);
  } catch (cause) {
    if (version === revision)
      error(
        cause instanceof Error
          ? cause.message
          : 'This combination could not render.',
      );
  }
});
new MutationObserver(() => {
  const failed = host.querySelector<HTMLElement>('[data-state="error"]');
  const message = failed
    ?.querySelector('.alk-figure-status')
    ?.textContent?.trim();
  if (message && message !== lastError) error(message);
}).observe(host, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['data-state'],
});
reply('alk:playground:ready');

// A theme choice inside the sample Layout must not persist into the host site's preferences.
if (id === 'layout')
  document.addEventListener(
    'change',
    (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== 'alk-theme')
        return;
      event.stopImmediatePropagation();
      document.documentElement.dataset.alkTheme = input.value;
      document.documentElement.style.colorScheme =
        input.value === 'system' ? 'light dark' : input.value;
    },
    true,
  );

function shareValues(values: Record<string, JSONValue>) {
  currentValues = { ...currentValues, ...values };
  reply('alk:playground:values', { values });
}
host.addEventListener('input', (event) => {
  const input = event.target;
  if (id !== 'shader' || !(input instanceof HTMLInputElement)) return;
  if (input.matches('[data-frequency]'))
    shareValues({ frequency: Number(input.value) });
  if (input.matches('[data-angle]'))
    shareValues({ angle: Number(input.value) });
});
host.addEventListener('change', (event) => {
  if (
    id === 'post-list' &&
    event.target instanceof HTMLSelectElement &&
    event.target.matches('[data-post-list-layout]')
  )
    shareValues({ layout: event.target.value });
});
host.addEventListener('click', (event) => {
  if (id !== 'navigation' || !(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a');
  if (!link || link.getAttribute('href')?.startsWith('#')) return;
  event.preventDefault();
  shareValues({ currentPath: link.getAttribute('href') ?? '/' });
  void render(currentValues, revision).catch((cause) => error(String(cause)));
});
