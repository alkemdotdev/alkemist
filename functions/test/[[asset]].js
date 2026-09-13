const MEDIA_PATHS = new Set([
  '/test/media-study.wav',
  '/test/media-study.mp4',
  '/test/tone.wav',
  '/test/waves.mp4',
]);
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

function requestWithoutRange(request) {
  const headers = new Headers(request.headers);
  for (const header of [
    'range',
    'if-range',
    'if-none-match',
    'if-modified-since',
  ])
    headers.delete(header);
  // The response body is sliced below, so it must be the stored representation.
  headers.set('accept-encoding', 'identity');
  return new Request(request.url, { method: 'GET', headers });
}

function rangeFor(value, length) {
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/.exec(value ?? '');
  if (!match || (!match[1] && !match[2])) return null;
  if (length === 0) return 'unsatisfiable';
  const startText = match[1];
  const endText = match[2];
  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0)
      return 'unsatisfiable';
    const start = Math.max(0, length - suffixLength);
    return { start, end: length - 1 };
  }
  const start = Number(startText);
  if (!Number.isFinite(start) || start >= length) return 'unsatisfiable';
  if (!endText) return { start, end: length - 1 };
  const requestedEnd = Number(endText);
  if (!Number.isFinite(requestedEnd) || requestedEnd < start)
    return 'unsatisfiable';
  return { start, end: Math.min(requestedEnd, length - 1) };
}

function ifRangeMatches(value, headers) {
  if (!value) return true;
  const validator = value.trim();
  const etag = headers.get('etag');
  if (validator.startsWith('W/') || validator.startsWith('"'))
    return Boolean(etag && !etag.startsWith('W/') && validator === etag);
  const date = Date.parse(validator);
  const modified = Date.parse(headers.get('last-modified') ?? '');
  return (
    Number.isFinite(date) && Number.isFinite(modified) && modified === date
  );
}

async function readSmallAsset(body) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_MEDIA_BYTES) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function rangeFailure(message) {
  return new Response(message, {
    status: 502,
    headers: {
      'cache-control': 'no-store, no-transform',
      'content-type': 'text/plain; charset=utf-8',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'x-robots-tag': 'noindex',
    },
  });
}

function responseHeaders(asset, length) {
  const headers = new Headers(asset.headers);
  headers.delete('content-range');
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('accept-ranges', 'bytes');
  headers.set('content-length', String(length));
  const cacheControl = headers.get('cache-control');
  headers.set(
    'cache-control',
    cacheControl?.includes('no-transform')
      ? cacheControl
      : `${cacheControl ? `${cacheControl}, ` : ''}no-transform`,
  );
  headers.set('x-content-type-options', 'nosniff');
  headers.set(
    'referrer-policy',
    headers.get('referrer-policy') ?? 'strict-origin-when-cross-origin',
  );
  headers.set(
    'x-frame-options',
    headers.get('x-frame-options') ?? 'SAMEORIGIN',
  );
  // These four explicit routes are demo fixtures, including on production.
  // Do not let a missing Pages branch binding accidentally make them indexable.
  headers.set('x-robots-tag', 'noindex');
  return headers;
}

/**
 * Pages serves static range requests as 200. This only repairs four small demo
 * assets; it is deliberately not a general asset proxy or large-media service.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const pathname = new URL(request.url).pathname;
  if (!MEDIA_PATHS.has(pathname) || !['GET', 'HEAD'].includes(request.method))
    return env.ASSETS.fetch(request);

  const asset = await env.ASSETS.fetch(requestWithoutRange(request));
  if (!asset.ok) return asset;
  const encoding = asset.headers.get('content-encoding');
  if (encoding && encoding.toLowerCase() !== 'identity')
    return rangeFailure('Demo media could not be prepared for byte ranges.');
  const bytes = await readSmallAsset(asset.body);
  if (!bytes) return rangeFailure('Demo media exceeds the fixture limit.');
  const length = bytes.byteLength;

  const headers = responseHeaders(asset, length);
  // Range is ignored for HEAD, which reports the full selected representation.
  if (request.method === 'HEAD')
    return new Response(null, { status: 200, headers });
  const range = request.headers.get('range');
  if (
    !range ||
    !ifRangeMatches(request.headers.get('if-range'), asset.headers)
  ) {
    return new Response(bytes, { status: 200, headers });
  }

  const parsed = rangeFor(range, length);
  if (parsed === null) {
    return new Response(bytes, { status: 200, headers });
  }
  if (parsed === 'unsatisfiable') {
    headers.set('content-range', `bytes */${length}`);
    headers.set('content-length', '0');
    return new Response(null, { status: 416, headers });
  }

  headers.set('content-range', `bytes ${parsed.start}-${parsed.end}/${length}`);
  headers.set('content-length', String(parsed.end - parsed.start + 1));
  return new Response(bytes.slice(parsed.start, parsed.end + 1), {
    status: 206,
    headers,
  });
}
