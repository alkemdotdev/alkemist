import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/test/[[asset]].js';

const bytes = Uint8Array.from({ length: 20 }, (_, index) => index);
const baseHeaders = {
  'content-type': 'audio/wav',
  'content-length': String(bytes.length),
  etag: '"fixture-v1"',
  'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
  'cache-control': 'public, max-age=0, must-revalidate',
  'x-robots-tag': 'index',
};

function context(
  path,
  {
    method = 'GET',
    headers = {},
    branch = 'preview',
    assetBytes = bytes,
    assetHeaders = baseHeaders,
  } = {},
) {
  const request = new Request(`https://example.pages.dev${path}`, {
    method,
    headers,
  });
  return {
    request,
    env: {
      CF_PAGES_BRANCH: branch,
      ASSETS: {
        fetch: async () =>
          new Response(assetBytes.slice(), { headers: assetHeaders }),
      },
    },
  };
}

test('serves a single byte range with preserved asset headers', async () => {
  const response = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=2-5' },
    }),
  );
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/20');
  assert.equal(response.headers.get('content-length'), '4');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-type'), 'audio/wav');
  assert.equal(
    response.headers.get('cache-control'),
    `${baseHeaders['cache-control']}, no-transform`,
  );
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [2, 3, 4, 5],
  );
});

test('supports suffix and open-ended ranges, and rejects unsatisfiable ranges', async () => {
  const suffix = await onRequest(
    context('/test/tone.wav', { headers: { range: 'bytes=-3' } }),
  );
  assert.equal(suffix.headers.get('content-range'), 'bytes 17-19/20');
  assert.deepEqual(
    [...new Uint8Array(await suffix.arrayBuffer())],
    [17, 18, 19],
  );
  const open = await onRequest(
    context('/test/waves.mp4', { headers: { range: 'bytes=18-' } }),
  );
  assert.equal(open.headers.get('content-range'), 'bytes 18-19/20');
  const unsatisfiable = await onRequest(
    context('/test/waves.mp4', { headers: { range: 'bytes=20-21' } }),
  );
  assert.equal(unsatisfiable.status, 416);
  assert.equal(unsatisfiable.headers.get('content-range'), 'bytes */20');
  const empty = await onRequest(
    context('/test/tone.wav', {
      headers: { range: 'bytes=-3' },
      assetBytes: new Uint8Array(),
    }),
  );
  assert.equal(empty.status, 416);
  assert.equal(empty.headers.get('content-range'), 'bytes */0');
});

test('malformed or multi ranges and If-Range mismatches retain the full response', async () => {
  for (const headers of [
    { range: 'bytes=0-1,4-5' },
    { range: 'things=0-1' },
    { range: 'bytes=0-1', 'if-range': '"other"' },
    { range: 'bytes=0-1', 'if-range': 'Sun, 31 Dec 2023 00:00:00 GMT' },
    { range: 'bytes=0-1', 'if-range': 'Tue, 02 Jan 2024 00:00:00 GMT' },
  ]) {
    const response = await onRequest(
      context('/test/media-study.mp4', { headers }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-length'), '20');
    assert.deepEqual(
      [...new Uint8Array(await response.arrayBuffer())],
      [...bytes],
    );
  }
});

test('If-Range matches an ETag or exact date; HEAD ignores Range', async () => {
  const etag = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=1-1', 'if-range': '"fixture-v1"' },
    }),
  );
  assert.equal(etag.status, 206);
  const date = await onRequest(
    context('/test/media-study.wav', {
      headers: {
        range: 'bytes=1-1',
        'if-range': 'Mon, 01 Jan 2024 00:00:00 GMT',
      },
    }),
  );
  assert.equal(date.status, 206);
  const head = await onRequest(
    context('/test/media-study.wav', {
      method: 'HEAD',
      headers: { range: 'bytes=1-2' },
      branch: 'main',
    }),
  );
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-range'), null);
  assert.equal(head.headers.get('content-length'), '20');
  assert.equal(head.headers.get('x-robots-tag'), 'noindex');
  assert.equal(await head.text(), '');
});

test('measures a missing content length and rejects oversized fixtures', async () => {
  const missingLength = { ...baseHeaders };
  delete missingLength['content-length'];
  const measured = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=16-19' },
      assetHeaders: missingLength,
    }),
  );
  assert.equal(measured.status, 206);
  assert.equal(measured.headers.get('content-range'), 'bytes 16-19/20');
  const large = Uint8Array.from({ length: 2 * 1024 * 1024 + 1 });
  const oversized = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=0-1' },
      assetBytes: large,
      assetHeaders: { ...baseHeaders, 'content-length': String(large.length) },
    }),
  );
  assert.equal(oversized.status, 502);
  assert.equal(await oversized.text(), 'Demo media exceeds the fixture limit.');
});

test('rejects unexpectedly encoded origin bytes instead of mislabelling a range', async () => {
  const response = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=0-1' },
      assetHeaders: { ...baseHeaders, 'content-encoding': 'br' },
    }),
  );
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store, no-transform');
  const identity = await onRequest(
    context('/test/media-study.wav', {
      headers: { range: 'bytes=0-1' },
      assetHeaders: { ...baseHeaders, 'content-encoding': 'identity' },
    }),
  );
  assert.equal(identity.status, 206);
});

test('the function is an allowlist, not an arbitrary range proxy', async () => {
  const response = await onRequest(
    context('/test/torus-knot.glb', {
      headers: { range: 'bytes=0-2' },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('accept-ranges'), null);
});
