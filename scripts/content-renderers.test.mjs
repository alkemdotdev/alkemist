import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderCode,
  renderMath,
  renderNativeContent,
} from '../packages/components/src/content-renderers.ts';

test('math keeps the bounded untrusted KaTeX contract', () => {
  const math = renderMath({ tex: String.raw`\href{https://example.com}{x}` });
  assert.match(math, /katex/);
  assert.doesNotMatch(math, /href="https:\/\/example\.com"/);
  assert.throws(
    () => renderMath({ tex: String.raw`\def\x{\x}\x` }),
    /KaTeX parse error|Too many expansions/,
  );
});

test('code keeps the shared theme and transformer while escaping source and title', async () => {
  const html = await renderCode({
    code: '<script>alert(1)</script>',
    lang: 'typescript',
    title: '<img src=x onerror=alert(1)>',
    highlightLines: [1],
  });
  assert.match(html, /alk-code/);
  assert.match(html, /alk-code-highlight/);
  assert.match(html, /&#x3C;/);
  assert.match(html, /&#x3C;img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(html, /<script>/);
});

test('native renderers only create semantic safe markup', () => {
  const paragraph = renderNativeContent('html', {
    type: 'paragraph',
    text: '<script>alert(1)</script>',
  });
  assert.equal(paragraph, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');

  const image = renderNativeContent('image', {
    src: 'javascript:alert(1)',
    alt: '" onerror="alert(1)',
    width: 320,
    fit: 'cover',
  });
  assert.doesNotMatch(image, /javascript:| src=/);
  assert.match(image, /alt="&quot; onerror=&quot;alert\(1\)"/);
  assert.match(image, /width="320"/);
  assert.match(image, /object-fit: cover/);

  const video = renderNativeContent('video', {
    src: '/clips/sample.mp4',
    poster: 'data:image/svg+xml,evil',
    autoplay: true,
    muted: true,
    loop: true,
    preload: 'metadata',
    width: 640,
  });
  assert.match(
    video,
    /^<video controls src="\/clips\/sample\.mp4" autoplay muted loop preload="metadata" width="640">/,
  );
  assert.doesNotMatch(video, /data:/);

  const input = renderNativeContent('html', {
    type: 'input',
    label: 'Email',
    inputType: 'email',
    placeholder: 'you@example.com',
  });
  assert.match(
    input,
    /<label>Email<input type="email" placeholder="you@example.com" \/><\/label>/,
  );
});

test('live math preserves display captions and inline structure', () => {
  const display = renderMath({ tex: 'x^2', label: '<Energy>' });
  assert.match(display, /^<figure class="alk-math">/);
  assert.match(display, /aria-label="&lt;Energy&gt;"/);
  assert.match(display, /<figcaption>&lt;Energy&gt;<\/figcaption>/);
  const inline = renderMath({ tex: 'x', display: false });
  assert.match(inline, /^<span class="alk-math-inline">/);
  assert.doesNotMatch(inline, /<figure|<figcaption/);
});
