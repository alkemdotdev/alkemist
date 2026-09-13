import { decodeHTML } from 'entities';

export interface CodeSourceInput {
  code?: unknown;
  slotHtml?: string;
}

const markup = /<!--|<\/?[A-Za-z][^>]*>|<![A-Za-z]|<\?/;

function unwrapMarkdownParagraphs(slotHtml: string): string {
  if (!markup.test(slotHtml)) return slotHtml;

  const paragraphs: string[] = [];
  const paragraph = /<p>([\s\S]*?)<\/p>/gy;
  let cursor = 0;
  while (cursor < slotHtml.length) {
    const between = slotHtml.slice(cursor).match(/^\s*/)?.[0] ?? '';
    cursor += between.length;
    if (cursor === slotHtml.length) break;

    paragraph.lastIndex = cursor;
    const match = paragraph.exec(slotHtml);
    if (!match || markup.test(match[1])) {
      throw new Error(
        '<Code> default slot must contain text or plain Markdown paragraphs, not nested markup.',
      );
    }
    paragraphs.push(match[1]);
    cursor = paragraph.lastIndex;
  }

  if (paragraphs.length === 0) {
    throw new Error(
      '<Code> default slot must contain text or plain Markdown paragraphs, not nested markup.',
    );
  }

  return paragraphs.join('\n\n');
}

function dedentSlotSource(source: string): string {
  const lines = source.split('\n');

  while (lines[0]?.trim() === '') lines.shift();
  while (lines.at(-1)?.trim() === '') lines.pop();

  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.match(/^[\t ]*/)?.[0] ?? '');
  const indent = indents.reduce((common, current) => {
    let length = 0;
    while (
      length < common.length &&
      length < current.length &&
      common[length] === current[length]
    ) {
      length += 1;
    }
    return common.slice(0, length);
  }, indents[0] ?? '');

  return lines
    .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n');
}

/**
 * Resolves a Code source prop or its default text slot. MDX paragraph wrappers
 * are normalized, while other nodes are rejected without stripping.
 */
export function resolveCodeSource({ code, slotHtml }: CodeSourceInput): string {
  if (code !== undefined && typeof code !== 'string') {
    throw new TypeError('<Code> `code` must be a string when provided.');
  }

  const slotText =
    slotHtml === undefined ? undefined : unwrapMarkdownParagraphs(slotHtml);
  const slotSource = slotText === undefined ? undefined : decodeHTML(slotText);
  const hasSlotSource = (slotSource?.trim().length ?? 0) !== 0;

  if (code !== undefined) {
    if (hasSlotSource) {
      throw new Error(
        '<Code> accepts source through either `code` or its default slot, not both.',
      );
    }
    return code;
  }

  if (slotSource === undefined || !hasSlotSource) {
    throw new Error(
      '<Code> requires source through `code` or its default slot.',
    );
  }

  return dedentSlotSource(slotSource);
}
