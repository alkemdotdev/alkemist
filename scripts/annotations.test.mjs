import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anchorQuote,
  canonicalSource,
  codePointOffset,
  createAnnotationId,
  editAnnotation,
  makeQuote,
  utf16Offset,
  validateImport,
} from '../packages/components/src/annotations.ts';

const source = 'https://example.test/paper/';
const context = 'http://www.w3.org/ns/anno.jsonld';

test('quote anchors use positions first and survive a moved unique passage', () => {
  const original = 'A measured signal makes a useful record.';
  const quote = makeQuote(original, 2, 17);
  assert.deepEqual(
    anchorQuote(original, quote, {
      type: 'TextPositionSelector',
      start: 2,
      end: 17,
    }),
    { kind: 'found', start: 2, end: 17 },
  );
  assert.deepEqual(anchorQuote(`Preface. ${original}`, quote), {
    kind: 'found',
    start: 11,
    end: 26,
  });
  assert.equal(
    canonicalSource('https://example.test/paper/?present=1#slide-2'),
    source,
  );
  assert.equal(
    canonicalSource('https://example.test/paper/?experiment=2&receiver=1'),
    'https://example.test/paper/?experiment=2',
  );
  assert.equal(
    canonicalSource(
      'https://example.test/paper/?alkAudience=1&alkCast=1&experiment=2',
    ),
    'https://example.test/paper/?experiment=2',
  );
});

test('ambiguous quotes remain explicit instead of choosing an arbitrary range', () => {
  assert.deepEqual(
    anchorQuote('same words and same words', {
      type: 'TextQuoteSelector',
      exact: 'same words',
    }),
    { kind: 'ambiguous' },
  );
});

test('text positions count Unicode code points and never split a surrogate pair', () => {
  const text = 'A 😀 signal';
  const quote = makeQuote(text, 2, 3);
  assert.equal(quote.exact, '😀');
  assert.deepEqual(
    anchorQuote(text, quote, {
      type: 'TextPositionSelector',
      start: 2,
      end: 3,
    }),
    { kind: 'found', start: 2, end: 3 },
  );
  assert.equal(utf16Offset(text, 3), 4);
  assert.throws(() => codePointOffset(text, 3), /surrogate/);
  const context = makeQuote(`${'😀'.repeat(33)}x`, 33, 34);
  assert.equal(context.prefix, '😀'.repeat(32));
});

test('UUID creation falls back to getRandomValues outside secure randomUUID contexts', () => {
  const id = createAnnotationId({
    getRandomValues(bytes) {
      bytes.fill(0);
      return bytes;
    },
  });
  assert.match(id, /^urn:uuid:00000000-0000-4000-8000-000000000000$/);
});

test('emoji quote selectors roundtrip through the W3C import shape in code points', () => {
  const text = 'A 😀 signal';
  const quote = makeQuote(text, 2, 3);
  const [annotation] = validateImport(
    {
      '@context': context,
      '@graph': [
        {
          id: 'urn:uuid:7b13697f-e7f1-42a1-8cbc-7b4a8efbbf98',
          type: 'Annotation',
          created: '2026-01-01T00:00:00.000Z',
          modified: '2026-01-01T00:00:00.000Z',
          target: {
            source,
            selector: [
              quote,
              { type: 'TextPositionSelector', start: 2, end: 3 },
            ],
          },
        },
      ],
    },
    source,
  );
  assert.deepEqual(annotation.target.selector[0], quote);
});

test('annotation import validates context, IDs, offsets, and safe plain-text edits', () => {
  const annotation = {
    id: 'urn:uuid:7b13697f-e7f1-42a1-8cbc-7b4a8efbbf98',
    type: 'Annotation',
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-02T00:00:00.000Z',
    target: {
      source,
      selector: [
        {
          type: 'TextQuoteSelector',
          exact: 'signal',
          prefix: 'A ',
          suffix: ' makes',
        },
        { type: 'TextPositionSelector', start: 2, end: 8 },
      ],
    },
    body: {
      type: 'TextualBody',
      format: 'text/plain',
      value: '<img src=x onerror=alert(1)>',
    },
  };
  const document = { '@context': context, '@graph': [annotation] };
  const [parsed] = validateImport(document, source);
  assert.equal(parsed.body.value, annotation.body.value);
  const edited = editAnnotation(
    parsed,
    '  revised note  ',
    '2026-01-03T00:00:00.000Z',
  );
  assert.equal(edited.body.value, 'revised note');
  assert.equal(edited.modified, '2026-01-03T00:00:00.000Z');
  assert.throws(
    () => validateImport({ '@graph': [annotation] }, source),
    /context/,
  );
  assert.throws(
    () =>
      validateImport(
        { '@context': context, '@graph': [annotation, annotation] },
        source,
      ),
    /anchor/,
  );
  assert.throws(
    () =>
      validateImport(
        {
          '@context': context,
          '@graph': [
            {
              ...annotation,
              target: {
                ...annotation.target,
                source: 'https://elsewhere.test/',
              },
            },
          ],
        },
        source,
      ),
    /source/,
  );
  assert.throws(
    () =>
      validateImport(
        {
          '@context': context,
          '@graph': [
            {
              ...annotation,
              body: { ...annotation.body, format: 'text/html' },
            },
          ],
        },
        source,
      ),
    /body/,
  );
  assert.throws(
    () =>
      validateImport(
        {
          '@context': context,
          '@graph': [{ ...annotation, id: { __proto__: { polluted: true } } }],
        },
        source,
      ),
    /anchor/,
  );
  assert.throws(
    () =>
      validateImport(
        {
          '@context': context,
          '@graph': [
            {
              ...annotation,
              target: {
                ...annotation.target,
                selector: [
                  annotation.target.selector[0],
                  { type: 'TextPositionSelector', start: 0, end: 1 },
                ],
              },
            },
          ],
        },
        source,
      ),
    /anchor/,
  );
  assert.equal({}.polluted, undefined);
});
