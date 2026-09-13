import type { ShikiTransformer, ThemeRegistration } from 'shiki';
import type { Element, ElementContent, Text } from 'hast';
import { INKS } from '@alkemdotdev/alkemist-theme/palette';

const inks = Object.fromEntries(INKS.map(({ id, hex }) => [id, hex]));

/** One fixed ink set on a black code surface, independent of the page theme. */
export const codeTheme: ThemeRegistration = {
  name: 'alkemist-board',
  type: 'dark',
  colors: { 'editor.background': '#111111', 'editor.foreground': '#eeeeee' },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#999999', fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'punctuation.definition.template-expression',
      ],
      settings: { foreground: inks.violet },
    },
    {
      scope: ['string', 'markup.inserted'],
      settings: { foreground: inks.fern },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.constant'],
      settings: { foreground: inks.ochre },
    },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: inks.cyan },
    },
    {
      scope: [
        'entity.name.type',
        'support.type',
        'support.class',
        'entity.name.class',
      ],
      settings: { foreground: inks.cobalt },
    },
    {
      scope: ['variable.parameter', 'entity.other.attribute-name'],
      settings: { foreground: inks.rose },
    },
    {
      scope: ['entity.name.tag', 'markup.deleted'],
      settings: { foreground: inks.vermilion },
    },
    {
      scope: ['markup.heading', 'markup.bold'],
      settings: { foreground: '#eeeeee', fontStyle: 'bold' },
    },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
    {
      scope: ['invalid'],
      settings: { foreground: '#eeeeee', fontStyle: 'underline' },
    },
  ],
};

export interface CodeRange {
  start: number;
  end: number;
}
export interface CollapsedCodeRange extends CodeRange {
  label?: string;
}
export interface CodeAnnotation {
  line: number;
  text: string;
}

/** Options shared by Markdown fences, renderCode(), and the Code component. */
export interface CodeOptions {
  title?: string;
  highlightLines?: number[];
  lineNumbers?: boolean;
  focusLines?: number[];
  addedLines?: number[];
  removedLines?: number[];
  collapsedRanges?: CollapsedCodeRange[];
  annotations?: CodeAnnotation[];
  highlightText?: string[];
  wrap?: boolean;
}

type HastNode = ElementContent;
type HastText = Text;
type HastElement = Element;

const rangePattern = /^(\d+)(?:-(\d+))?$/;

function parseRanges(raw: string, name: string): CodeRange[] {
  if (!raw.trim()) throw new Error(`Alkemist: ${name} ranges cannot be empty.`);
  return validateRanges(
    raw.split(',').map((item) => {
      const match = item.trim().match(rangePattern);
      if (!match)
        throw new Error(`Alkemist: invalid ${name} range "${item.trim()}".`);
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 1 ||
        end < start
      ) {
        throw new Error(
          `Alkemist: ${name} ranges must be positive, increasing integers: "${item.trim()}".`,
        );
      }
      return { start, end };
    }),
    name,
  );
}

function validateRanges<T extends CodeRange>(ranges: T[], name: string): T[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  for (const range of sorted) {
    if (
      !Number.isSafeInteger(range.start) ||
      !Number.isSafeInteger(range.end) ||
      range.start < 1 ||
      range.end < range.start
    ) {
      throw new Error(
        `Alkemist: ${name} ranges must use positive, increasing integers.`,
      );
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].start <= sorted[index - 1].end)
      throw new Error(`Alkemist: ${name} ranges cannot overlap.`);
  }
  return sorted;
}

function validateLines(
  lines: number[] | undefined,
  name: string,
): number[] | undefined {
  if (lines === undefined) return undefined;
  if (!Array.isArray(lines))
    throw new Error(`Alkemist: ${name} must be an array of line numbers.`);
  if (lines.some((line) => !Number.isSafeInteger(line) || line < 1))
    throw new Error(
      `Alkemist: ${name} must contain positive integer line numbers.`,
    );
  return [...new Set(lines)];
}

function expandRanges(ranges: CodeRange[] | undefined): number[] {
  return (
    ranges?.flatMap(({ start, end }) =>
      Array.from({ length: end - start + 1 }, (_, index) => start + index),
    ) ?? []
  );
}

function metadata(raw: string, options: CodeOptions) {
  let metaTitle: string | undefined;
  const flags = raw.replace(
    /(?:^|\s)title="([^"]*)"/g,
    (_match, value: string) => {
      metaTitle ??= value;
      return ' ';
    },
  );
  const metaRanges = (name: string) => {
    const match = flags.match(new RegExp(`(?:^|\\s)${name}=\\{([^}]*)\\}`));
    return match ? parseRanges(match[1], name) : undefined;
  };
  const shorthand = flags.match(/(?:^|\s)\{([^}]+)\}/)?.[1];
  const highlighted = shorthand
    ? parseRanges(shorthand, 'code highlight')
    : undefined;
  if (
    options.collapsedRanges !== undefined &&
    !Array.isArray(options.collapsedRanges)
  ) {
    throw new Error('Alkemist: collapsedRanges must be an array of ranges.');
  }
  const collapsed =
    options.collapsedRanges !== undefined
      ? validateRanges(options.collapsedRanges, 'collapse').map((range) => ({
          ...range,
        }))
      : metaRanges('collapse');
  if (
    options.annotations !== undefined &&
    !Array.isArray(options.annotations)
  ) {
    throw new Error('Alkemist: annotations must be an array of notes.');
  }
  const annotations = options.annotations ?? [];
  if (
    annotations.some(
      ({ line, text }) =>
        !Number.isSafeInteger(line) ||
        line < 1 ||
        typeof text !== 'string' ||
        !text.trim(),
    )
  ) {
    throw new Error(
      'Alkemist: annotations require a positive line number and non-empty text.',
    );
  }
  if (
    options.highlightText !== undefined &&
    !Array.isArray(options.highlightText)
  ) {
    throw new Error('Alkemist: highlightText must be an array of strings.');
  }
  const highlightText = options.highlightText ?? [];
  if (highlightText.some((value) => typeof value !== 'string' || !value))
    throw new Error('Alkemist: highlightText must contain non-empty strings.');
  return {
    title: options.title ?? metaTitle,
    lineNumbers:
      options.lineNumbers ?? !/(?:^|\s)no-line-numbers(?:\s|$)/.test(flags),
    highlighted:
      validateLines(options.highlightLines, 'highlightLines') ??
      expandRanges(highlighted),
    focused:
      validateLines(options.focusLines, 'focusLines') ??
      expandRanges(metaRanges('focus')),
    added:
      validateLines(options.addedLines, 'addedLines') ??
      expandRanges(metaRanges('ins')),
    removed:
      validateLines(options.removedLines, 'removedLines') ??
      expandRanges(metaRanges('del')),
    collapsed: collapsed ?? [],
    annotations,
    highlightText: [...new Set(highlightText)],
    wrap: options.wrap ?? /(?:^|\s)wrap(?:\s|$)/.test(flags),
  };
}

function addTextHighlights(node: HastElement, phrases: string[]) {
  if (!phrases.length) return;
  const leaves: HastText[] = [];
  const collect = (item: HastNode) => {
    if (item.type === 'text') leaves.push(item);
    else if (item.type === 'element') item.children.forEach(collect);
  };
  node.children.forEach(collect);
  const source = leaves.map((leaf) => leaf.value).join('');
  const matches: Array<{ start: number; end: number }> = [];
  for (const phrase of phrases)
    for (
      let start = source.indexOf(phrase);
      start !== -1;
      start = source.indexOf(phrase, start + phrase.length)
    )
      matches.push({ start, end: start + phrase.length });
  const merged = matches
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<Array<{ start: number; end: number }>>((result, match) => {
      const previous = result.at(-1);
      if (previous && match.start <= previous.end)
        previous.end = Math.max(previous.end, match.end);
      else result.push(match);
      return result;
    }, []);
  let offset = 0;
  for (const leaf of leaves) {
    const end = offset + leaf.value.length;
    const portions: HastNode[] = [];
    let cursor = offset;
    for (const match of merged) {
      if (match.end <= offset || match.start >= end) continue;
      const start = Math.max(match.start, offset);
      const finish = Math.min(match.end, end);
      if (start > cursor)
        portions.push({
          type: 'text',
          value: leaf.value.slice(cursor - offset, start - offset),
        });
      portions.push({
        type: 'element',
        tagName: 'mark',
        properties: { className: ['alk-code-text-highlight'] },
        children: [
          {
            type: 'text',
            value: leaf.value.slice(start - offset, finish - offset),
          },
        ],
      });
      cursor = finish;
    }
    if (cursor < end)
      portions.push({ type: 'text', value: leaf.value.slice(cursor - offset) });
    if (portions.length)
      Object.assign(leaf, {
        type: 'element',
        tagName: 'span',
        properties: {},
        children: portions,
      });
    offset = end;
  }
}

function makePre(pre: HastElement, lines: HastElement[]): HastElement {
  const code = pre.children.find(
    (child): child is HastElement =>
      child.type === 'element' && child.tagName === 'code',
  );
  if (!code) throw new Error('Alkemist: Shiki did not produce a code element.');
  return {
    type: 'element',
    tagName: 'pre',
    properties: { ...pre.properties },
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { ...code.properties },
        children: lines.flatMap((line, index) =>
          index ? [{ type: 'text', value: '\n' } as HastText, line] : [line],
        ),
      },
    ],
  };
}

function foldPre(pre: HastElement, ranges: CollapsedCodeRange[]): HastNode[] {
  if (!ranges.length) return [pre];
  const code = pre.children.find(
    (child): child is HastElement =>
      child.type === 'element' && child.tagName === 'code',
  );
  if (!code) throw new Error('Alkemist: Shiki did not produce a code element.');
  const lines = code.children.filter(
    (child): child is HastElement =>
      child.type === 'element' &&
      child.tagName === 'span' &&
      Boolean(child.properties.dataLine),
  );
  const result: HastNode[] = [];
  let cursor = 1;
  for (const range of ranges) {
    if (range.end > lines.length)
      throw new Error(
        `Alkemist: collapse range ${range.start}-${range.end} exceeds the ${lines.length}-line source.`,
      );
    if (range.start > cursor)
      result.push(makePre(pre, lines.slice(cursor - 1, range.start - 1)));
    const count = range.end - range.start + 1;
    result.push({
      type: 'element',
      tagName: 'details',
      properties: { className: ['alk-code-fold'] },
      children: [
        {
          type: 'element',
          tagName: 'summary',
          properties: {},
          children: [
            {
              type: 'text',
              value:
                range.label ??
                `${count} ${count === 1 ? 'line' : 'lines'} collapsed`,
            },
          ],
        },
        makePre(pre, lines.slice(range.start - 1, range.end)),
      ],
    });
    cursor = range.end + 1;
  }
  if (cursor <= lines.length)
    result.push(makePre(pre, lines.slice(cursor - 1)));
  return result;
}

/** Shared by Markdown fences and Code; all source and metadata become HAST text. */
export function createCodeTransformer(
  options: CodeOptions = {},
): ShikiTransformer {
  return {
    name: 'alkemist-code',
    pre(node) {
      const config = metadata(this.options.meta?.__raw ?? '', options);
      node.properties.tabindex = 0;
      node.properties.ariaLabel = `${config.title ?? this.options.lang} source code`;
      if (config.wrap) this.addClassToHast(node, 'alk-code-wrap');
      this.addClassToHast(node, 'alk-code-pre');
      if (config.lineNumbers) this.addClassToHast(node, 'alk-code-numbered');
    },
    line(node, line) {
      const config = metadata(this.options.meta?.__raw ?? '', options);
      node.properties.dataLine = String(line);
      if (config.highlighted.includes(line))
        this.addClassToHast(node, 'alk-code-highlight');
      if (config.focused.length && !config.focused.includes(line))
        this.addClassToHast(node, 'alk-code-dim');
      if (config.added.includes(line))
        this.addClassToHast(node, 'alk-code-added');
      if (config.removed.includes(line))
        this.addClassToHast(node, 'alk-code-removed');
      if (config.added.includes(line)) node.properties.dataDiff = '+';
      if (config.removed.includes(line)) node.properties.dataDiff = '−';
      addTextHighlights(node as unknown as HastElement, config.highlightText);
      for (const annotation of config.annotations.filter(
        (item) => item.line === line,
      )) {
        node.children.unshift({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            className: ['alk-code-annotation-marker'],
            ariaLabel: `Note: ${annotation.text}`,
          },
          children: [{ type: 'text', value: '†' }],
        });
        node.children.push({
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['alk-code-annotation-tooltip'],
            role: 'tooltip',
          },
          children: [{ type: 'text', value: annotation.text }],
        });
      }
    },
    root(root) {
      const config = metadata(this.options.meta?.__raw ?? '', options);
      const pre = root.children.find(
        (child): child is HastElement =>
          child.type === 'element' && child.tagName === 'pre',
      );
      if (!pre)
        throw new Error(
          'Alkemist: Shiki did not produce a preformatted code block.',
        );
      const title = config.title ?? 'Source';
      root.children = [
        {
          type: 'element',
          tagName: 'figure',
          properties: {
            className: ['alk-code'],
            dataAlkSource: encodeURIComponent(this.source),
          },
          children: [
            {
              type: 'element',
              tagName: 'figcaption',
              properties: { className: ['alk-code-caption'] },
              children: [
                {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['alk-code-title'] },
                  children: [{ type: 'text', value: title }],
                },
                {
                  type: 'element',
                  tagName: 'button',
                  properties: {
                    type: 'button',
                    className: ['alk-code-copy'],
                    dataAlkCopy: '',
                    hidden: true,
                    ariaLabel: `Copy ${title} source code`,
                  },
                  children: [{ type: 'text', value: 'Copy' }],
                },
                {
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    className: ['alk-sr-only'],
                    role: 'status',
                    dataAlkCopyStatus: '',
                  },
                  children: [],
                },
              ],
            },
            ...foldPre(pre, config.collapsed),
          ],
        },
      ];
    },
  };
}
