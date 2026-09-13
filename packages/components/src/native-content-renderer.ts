export type NativeContentKind = 'html' | 'image' | 'audio' | 'video';

export interface NativeHtmlValues {
  type?:
    | 'paragraph'
    | 'heading-2'
    | 'heading-3'
    | 'blockquote'
    | 'list'
    | 'table'
    | 'details'
    | 'button'
    | 'input';
  element?: NativeHtmlValues['type'];
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  summary?: string;
  label?: string;
  inputType?: 'text' | 'checkbox' | 'email' | 'number' | 'search' | 'url';
  value?: string;
  placeholder?: string;
  checked?: boolean;
  disabled?: boolean;
  open?: boolean;
  ordered?: boolean;
}

export interface NativeImageValues {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  caption?: string;
}

export interface NativeMediaValues {
  src?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  poster?: string;
  width?: number;
}

export type NativeContentValues =
  NativeHtmlValues | NativeImageValues | NativeMediaValues;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function safeUrl(value: unknown) {
  const source = String(value ?? '').trim();
  if (!source) return undefined;
  if (
    source.startsWith('/') ||
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('#')
  )
    return source;
  try {
    const url = new URL(source);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? source
      : undefined;
  } catch {
    return undefined;
  }
}

function positiveDimension(value: unknown) {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0
    ? Math.min(Math.round(dimension), 10000)
    : undefined;
}

const booleanAttribute = (name: string, value: unknown) =>
  value ? ` ${name}` : '';

function allowedValue<T extends string>(value: unknown, values: readonly T[]) {
  return values.includes(value as T) ? (value as T) : undefined;
}

function renderNativeHtml(values: NativeHtmlValues) {
  const type = values.type ?? values.element ?? 'paragraph';
  const text = escapeHtml(values.text);
  switch (type) {
    case 'heading-2':
      return `<h2>${text}</h2>`;
    case 'heading-3':
      return `<h3>${text}</h3>`;
    case 'blockquote':
      return `<blockquote><p>${text}</p></blockquote>`;
    case 'list': {
      const tag = values.ordered ? 'ol' : 'ul';
      return `<${tag}>${(values.items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
    }
    case 'table': {
      const headers = values.headers ?? [];
      const head = headers.length
        ? `<thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead>`
        : '';
      const body = (values.rows ?? [])
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
        )
        .join('');
      return `<table>${head}<tbody>${body}</tbody></table>`;
    }
    case 'details':
      return `<details${booleanAttribute('open', values.open)}><summary>${escapeHtml(values.summary ?? 'Details')}</summary><p>${text}</p></details>`;
    case 'button':
      return `<button type="button"${booleanAttribute('disabled', values.disabled)}>${text || 'Button'}</button>`;
    case 'input': {
      const inputType =
        allowedValue(values.inputType, [
          'text',
          'checkbox',
          'email',
          'number',
          'search',
          'url',
        ]) ?? 'text';
      const label = escapeHtml(values.label ?? 'Input');
      const value =
        values.value === undefined
          ? ''
          : ` value="${escapeHtml(values.value)}"`;
      const placeholder =
        values.placeholder === undefined
          ? ''
          : ` placeholder="${escapeHtml(values.placeholder)}"`;
      return `<label>${label}<input type="${inputType}"${value}${placeholder}${booleanAttribute('checked', values.checked)}${booleanAttribute('disabled', values.disabled)} /></label>`;
    }
    case 'paragraph':
    default:
      return `<p>${text}</p>`;
  }
}

function renderNativeImage(values: NativeImageValues) {
  const src = safeUrl(values.src);
  const fitValue = allowedValue(values.fit, [
    'contain',
    'cover',
    'fill',
    'none',
    'scale-down',
  ]);
  const dimensions = [
    ['width', positiveDimension(values.width)],
    ['height', positiveDimension(values.height)],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('');
  const fit = fitValue ? ` style="object-fit: ${fitValue}"` : '';
  const image = `<img${src ? ` src="${escapeHtml(src)}"` : ''} alt="${escapeHtml(values.alt)}"${dimensions}${fit} />`;
  return values.caption === undefined
    ? image
    : `<figure>${image}<figcaption>${escapeHtml(values.caption)}</figcaption></figure>`;
}

function renderNativeMedia(kind: 'audio' | 'video', values: NativeMediaValues) {
  const src = safeUrl(values.src);
  const preloadValue = allowedValue(values.preload, [
    'none',
    'metadata',
    'auto',
  ]);
  const preload = preloadValue ? ` preload="${preloadValue}"` : '';
  const videoWidth = positiveDimension(values.width);
  const width = kind === 'video' && videoWidth ? ` width="${videoWidth}"` : '';
  const posterUrl = kind === 'video' ? safeUrl(values.poster) : undefined;
  const poster = posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : '';
  return `<${kind} controls${src ? ` src="${escapeHtml(src)}"` : ''}${booleanAttribute('autoplay', values.autoplay)}${booleanAttribute('muted', values.muted)}${booleanAttribute('loop', values.loop)}${preload}${poster}${width}></${kind}>`;
}

/** Render a deliberately small semantic HTML/media specimen with escaped content and safe URLs. */
export function renderNativeContent(
  kind: NativeContentKind,
  values: NativeContentValues,
): string {
  switch (kind) {
    case 'html':
      return renderNativeHtml(values as NativeHtmlValues);
    case 'image':
      return renderNativeImage(values as NativeImageValues);
    case 'audio':
      return renderNativeMedia('audio', values as NativeMediaValues);
    case 'video':
      return renderNativeMedia('video', values as NativeMediaValues);
  }
}
