import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCodeSource } from '../packages/components/src/code-source.ts';

test('code props stay byte-for-byte authoritative', () => {
  const source = '\n  const literal = "<tag>";\n';
  assert.equal(resolveCodeSource({ code: source }), source);
  assert.equal(resolveCodeSource({ code: '', slotHtml: '\n  \n' }), '');
});

test('default source slots decode HTML text once and remove author indentation', () => {
  assert.equal(
    resolveCodeSource({
      slotHtml:
        '\n\n    const label = &quot;&lt;tag&gt;&quot;;\n    &amp;copy;\n  \n\t',
    }),
    'const label = "<tag>";\n&copy;',
  );
  assert.equal(
    resolveCodeSource({ slotHtml: '&amp;lt;tag&amp;gt;' }),
    '&lt;tag&gt;',
  );
});

test('MDX paragraph wrappers preserve text and mark paragraph boundaries', () => {
  assert.equal(
    resolveCodeSource({
      slotHtml:
        '\n<p>  const first = &quot;&lt;tag&gt;&quot;;\n  first();</p>\n\n<p>  const second = 2;</p>\n',
    }),
    'const first = "<tag>";\nfirst();\n\nconst second = 2;',
  );
});

test('default slots reject missing source, competing source, and nested markup', () => {
  assert.throws(
    () => resolveCodeSource({}),
    /requires source through `code` or its default slot/,
  );
  assert.throws(
    () => resolveCodeSource({ slotHtml: '\n  \t  \n' }),
    /requires source through `code` or its default slot/,
  );
  assert.throws(
    () => resolveCodeSource({ code: 'x', slotHtml: 'y' }),
    /either `code` or its default slot/,
  );
  assert.throws(
    () => resolveCodeSource({ slotHtml: '<em>source</em>' }),
    /must contain text or plain Markdown paragraphs, not nested markup/,
  );
  assert.throws(
    () =>
      resolveCodeSource({ slotHtml: '<p>source <strong>here</strong></p>' }),
    /must contain text or plain Markdown paragraphs, not nested markup/,
  );
  assert.throws(
    () => resolveCodeSource({ slotHtml: '<p><code>source</code></p>' }),
    /must contain text or plain Markdown paragraphs, not nested markup/,
  );
});
