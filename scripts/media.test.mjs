import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMedia } from '../packages/components/src/media.ts';

test('audio and video retain native playback in server-rendered output', () => {
  for (const kind of ['audio', 'video']) {
    const html = renderMedia(kind, {
      src: '/sample.mp4',
      title: 'Study',
      poster: '',
    });
    assert.match(
      html,
      new RegExp(`<${kind}[^>]*controls[^>]*src="/sample.mp4"`),
    );
    assert.match(html, /media-time-range/);
    assert.match(html, /media-play-button/);
    assert.match(html, /media-volume-range/);
    if (kind === 'video') assert.match(html, /playsinline/);
    else assert.doesNotMatch(html, /media-fullscreen-button/);
  }
});

test('media author text is escaped and unsafe asset protocols are rejected', () => {
  const html = renderMedia('video', {
    src: '/clip.mp4?a=1&b=2',
    title: '<script>bad()</script>',
    transcript: '<img src=x onerror=alert(1)>',
    caption: '"quoted"',
    tracks: [
      { src: '/en.vtt', kind: 'captions', srclang: 'en', label: '<English>' },
    ],
  });
  assert.doesNotMatch(html, /<script>|<img /);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp;b=2/);
  for (const src of [
    'javascript:alert(1)',
    'data:text/html,bad',
    'file:///tmp/private',
    '',
    '   ',
  ]) {
    assert.throws(() => renderMedia('audio', { src }));
    assert.throws(() =>
      renderMedia('video', {
        src: '/clip.mp4',
        tracks: [{ src, kind: 'captions', srclang: 'en', label: 'English' }],
      }),
    );
  }
});

test('explicit invalid media configuration fails instead of silently changing it', () => {
  for (const props of [
    { seekOffset: 0 },
    { seekOffset: -1 },
    { seekOffset: Infinity },
    { playbackRates: [] },
    { playbackRates: [1, 0] },
    { playbackRates: [1, '2'] },
    { tracks: {} },
    { tracks: [null] },
    {
      tracks: [
        { src: '/x', kind: 'metadata', srclang: 'en', label: 'English' },
      ],
    },
    { preload: 'invalid' },
  ])
    assert.throws(
      () => renderMedia('video', { src: '/clip.mp4', ...props }),
      JSON.stringify(props),
    );
});

test('tracks, transcript and original download retain their authored data', () => {
  const html = renderMedia('video', {
    src: '/clip.mp4',
    download: true,
    transcript: 'First line\nSecond line',
    tracks: [
      {
        src: '/en.vtt',
        kind: 'captions',
        srclang: 'en',
        label: 'English',
        default: true,
      },
      { src: '/es.vtt', kind: 'subtitles', srclang: 'es', label: 'Español' },
      {
        src: '/chapters.vtt',
        kind: 'chapters',
        srclang: 'en',
        label: 'Sections',
      },
    ],
  });
  assert.match(html, /kind="captions"[^>]*default/);
  assert.match(html, /kind="subtitles"/);
  assert.match(html, /kind="chapters"/);
  assert.match(html, /crossorigin="anonymous"/);
  assert.match(html, /href="\/clip.mp4" download/);
  assert.match(html, /First line\nSecond line/);
});
