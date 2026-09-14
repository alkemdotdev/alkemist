export interface TextQuoteSelector {
  type: 'TextQuoteSelector';
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface TextPositionSelector {
  type: 'TextPositionSelector';
  start: number;
  end: number;
}

export interface Annotation {
  id: string;
  type: 'Annotation';
  target: {
    source: string;
    selector: [TextQuoteSelector, TextPositionSelector];
  };
  body?: { type: 'TextualBody'; value: string; format: 'text/plain' };
  created: string;
  modified: string;
}

export type AnchorResult =
  | { kind: 'found'; start: number; end: number }
  | { kind: 'ambiguous' }
  | { kind: 'missing' };

/** Matches the worst-case UTF-8 JSON-LD export for 250 max-size annotations. */
export const MAX_IMPORT_BYTES = 22_000_000;
export const MAX_ANNOTATIONS = 250;
export const MAX_TEXT_OFFSET = 10_000_000;
const annotationContext = 'http://www.w3.org/ns/anno.jsonld';
const presentationParameters = new Set([
  'receiver',
  'print-pdf',
  'present',
  'alkAudience',
  'alkCast',
]);

/**
 * This component's text scope excludes controls, speaker notes, and live
 * widgets. Positions are W3C Unicode code-point offsets within that scope;
 * quote/context anchoring remains the primary recovery strategy.
 */
export function codePointOffset(text: string, utf16Offset: number) {
  if (
    utf16Offset < 0 ||
    utf16Offset > text.length ||
    (utf16Offset > 0 &&
      utf16Offset < text.length &&
      /[\uD800-\uDBFF]/.test(text[utf16Offset - 1]) &&
      /[\uDC00-\uDFFF]/.test(text[utf16Offset]))
  )
    throw new Error('Text anchors cannot split a Unicode surrogate pair.');
  return Array.from(text.slice(0, utf16Offset)).length;
}

export function utf16Offset(text: string, pointOffset: number) {
  if (!Number.isInteger(pointOffset) || pointOffset < 0)
    throw new Error('Text anchor offsets must be non-negative integers.');
  let points = 0;
  let units = 0;
  for (const character of text) {
    if (points === pointOffset) return units;
    points++;
    units += character.length;
  }
  if (points === pointOffset) return units;
  throw new Error('Text anchor offset is outside the current text.');
}

type RandomSource = Pick<Crypto, 'getRandomValues'> & {
  randomUUID?: () => string;
};

export function createAnnotationId(random: RandomSource = crypto) {
  if (random.randomUUID) return `urn:uuid:${random.randomUUID()}`;
  const bytes = random.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
  return `urn:uuid:${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function canonicalSource(href: string) {
  const url = new URL(href);
  for (const parameter of presentationParameters)
    url.searchParams.delete(parameter);
  url.hash = '';
  return url.href;
}

export function makeQuote(
  text: string,
  start: number,
  end: number,
): TextQuoteSelector {
  const startUnit = utf16Offset(text, start);
  const endUnit = utf16Offset(text, end);
  return {
    type: 'TextQuoteSelector',
    exact: text.slice(startUnit, endUnit),
    prefix: Array.from(text.slice(0, startUnit)).slice(-32).join(''),
    suffix: Array.from(text.slice(endUnit)).slice(0, 32).join(''),
  };
}

function matchesQuote(text: string, quote: TextQuoteSelector, index: number) {
  return (
    text.startsWith(quote.exact, index) &&
    (!quote.prefix ||
      text.slice(Math.max(0, index - quote.prefix.length), index) ===
        quote.prefix) &&
    (!quote.suffix ||
      text.slice(
        index + quote.exact.length,
        index + quote.exact.length + quote.suffix.length,
      ) === quote.suffix)
  );
}

export function anchorQuote(
  text: string,
  quote: TextQuoteSelector,
  position?: TextPositionSelector,
): AnchorResult {
  if (!quote.exact) return { kind: 'missing' };
  if (
    position &&
    position.start >= 0 &&
    position.end >= position.start &&
    (() => {
      try {
        const start = utf16Offset(text, position.start);
        const end = utf16Offset(text, position.end);
        return (
          text.slice(start, end) === quote.exact &&
          matchesQuote(text, quote, start)
        );
      } catch {
        return false;
      }
    })()
  )
    return { kind: 'found', start: position.start, end: position.end };
  const positions: number[] = [];
  let at = text.indexOf(quote.exact);
  while (at !== -1) {
    if (matchesQuote(text, quote, at)) positions.push(at);
    at = text.indexOf(quote.exact, at + 1);
  }
  if (positions.length === 1)
    return {
      kind: 'found',
      start: codePointOffset(text, positions[0]),
      end: codePointOffset(text, positions[0] + quote.exact.length),
    };
  return positions.length ? { kind: 'ambiguous' } : { kind: 'missing' };
}

const plain = (value: unknown, maximum: number) =>
  typeof value === 'string' && value.length <= maximum ? value : undefined;

export function validateImport(input: unknown, source: string): Annotation[] {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Import must be a W3C Web Annotation JSON-LD document.');
  const document = input as Record<string, unknown>;
  if (document['@context'] !== annotationContext)
    throw new Error(
      'Import must declare the W3C Web Annotation JSON-LD context.',
    );
  const list = document['@graph'];
  if (!Array.isArray(list) || list.length > MAX_ANNOTATIONS)
    throw new Error('Import must contain no more than 250 annotations.');
  const ids = new Set<string>();
  return list.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw new Error('Import contains an invalid annotation.');
    const item = candidate as Record<string, unknown>;
    const target = item.target as Record<string, unknown> | undefined;
    const selectors = target?.selector;
    if (
      item.type !== 'Annotation' ||
      target?.source !== source ||
      !Array.isArray(selectors)
    )
      throw new Error('Import source does not match this page.');
    const quote = selectors.find(
      (selector): selector is TextQuoteSelector =>
        !!selector &&
        typeof selector === 'object' &&
        (selector as { type?: unknown }).type === 'TextQuoteSelector',
    ) as TextQuoteSelector | undefined;
    const position = selectors.find(
      (selector): selector is TextPositionSelector =>
        !!selector &&
        typeof selector === 'object' &&
        (selector as { type?: unknown }).type === 'TextPositionSelector',
    ) as TextPositionSelector | undefined;
    if (
      selectors.length !== 2 ||
      selectors.filter(
        (selector) =>
          !!selector &&
          typeof selector === 'object' &&
          (selector as { type?: unknown }).type === 'TextQuoteSelector',
      ).length !== 1 ||
      selectors.filter(
        (selector) =>
          !!selector &&
          typeof selector === 'object' &&
          (selector as { type?: unknown }).type === 'TextPositionSelector',
      ).length !== 1
    )
      throw new Error('Import contains an invalid selector set.');
    const exact = plain(quote?.exact, 10_000);
    const id = plain(item.id, 160);
    const created = plain(item.created, 64);
    const modified = plain(item.modified, 64);
    if (
      !exact ||
      !id ||
      !/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      ids.has(id) ||
      !created ||
      !modified ||
      !position ||
      !Number.isInteger(position.start) ||
      !Number.isInteger(position.end) ||
      position.start < 0 ||
      position.end < position.start ||
      position.end > MAX_TEXT_OFFSET ||
      position.end - position.start !== Array.from(exact).length ||
      (quote?.prefix !== undefined && plain(quote.prefix, 128) === undefined) ||
      (quote?.suffix !== undefined && plain(quote.suffix, 128) === undefined)
    )
      throw new Error('Import contains an invalid text anchor.');
    ids.add(id);
    const bodyInput = item.body as Record<string, unknown> | undefined;
    const value = bodyInput ? plain(bodyInput.value, 10_000) : undefined;
    if (
      bodyInput &&
      (bodyInput.type !== 'TextualBody' ||
        bodyInput.format !== 'text/plain' ||
        value === undefined)
    )
      throw new Error('Import contains an invalid note body.');
    return {
      id,
      type: 'Annotation',
      target: {
        source,
        selector: [
          {
            type: 'TextQuoteSelector',
            exact,
            prefix: plain(quote?.prefix, 128),
            suffix: plain(quote?.suffix, 128),
          },
          {
            type: 'TextPositionSelector',
            start: position.start,
            end: position.end,
          },
        ],
      },
      ...(value
        ? {
            body: { type: 'TextualBody', value, format: 'text/plain' as const },
          }
        : {}),
      created,
      modified,
    };
  });
}

export function editAnnotation(
  annotation: Annotation,
  value: string,
  modified: string,
): Annotation {
  const comment = value.trim();
  if (comment.length > 10_000)
    throw new Error('Annotation comments must be 10,000 characters or fewer.');
  return {
    ...annotation,
    ...(comment
      ? {
          body: {
            type: 'TextualBody',
            value: comment,
            format: 'text/plain' as const,
          },
        }
      : { body: undefined }),
    modified,
  };
}
