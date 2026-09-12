import type { ShikiTransformer, ThemeRegistration } from 'shiki';
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

export interface CodeOptions {
  title?: string;
  highlightLines?: number[];
  lineNumbers?: boolean;
}

function metadata(raw: string, options: CodeOptions) {
  let metaTitle: string | undefined;
  // Quoted captions are content; their braces and flag words must stay inert.
  const flags = raw.replace(
    /(?:^|\s)title="([^"]*)"/g,
    (_match, value: string) => {
      metaTitle ??= value;
      return ' ';
    },
  );
  const title = options.title ?? metaTitle;
  const highlighted = flags.match(/(?:^|\s)\{([^}]+)\}/)?.[1];
  const ranges =
    highlighted?.split(',').map((range) => {
      const match = range.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!match)
        throw new Error(`Alkemist: invalid code highlight range "${range}".`);
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      if (start < 1 || end < start || !Number.isSafeInteger(end)) {
        throw new Error(
          `Alkemist: code highlight lines must be positive, increasing integers: "${range}".`,
        );
      }
      return [start, end] as const;
    }) ?? [];
  if (
    options.highlightLines?.some(
      (line) => !Number.isSafeInteger(line) || line < 1,
    )
  ) {
    throw new Error(
      'Alkemist: highlightLines must contain positive integer line numbers.',
    );
  }
  return {
    title,
    lineNumbers:
      options.lineNumbers ?? !/(?:^|\s)no-line-numbers(?:\s|$)/.test(flags),
    isHighlighted: (line: number) =>
      options.highlightLines
        ? options.highlightLines.includes(line)
        : ranges.some(([start, end]) => line >= start && line <= end),
  };
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
      this.addClassToHast(node, 'alk-code-pre');
      if (config.lineNumbers) this.addClassToHast(node, 'alk-code-numbered');
    },
    line(node, line) {
      const config = metadata(this.options.meta?.__raw ?? '', options);
      node.properties.dataLine = String(line);
      if (config.isHighlighted(line))
        this.addClassToHast(node, 'alk-code-highlight');
    },
    root(root) {
      const config = metadata(this.options.meta?.__raw ?? '', options);
      const children = root.children.map((child) => {
        if (child.type === 'doctype') {
          throw new Error(
            'Alkemist: code highlighting must produce an HTML fragment.',
          );
        }
        return child;
      });
      root.children = [
        {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['alk-code'] },
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
                  children: [{ type: 'text', value: config.title ?? 'Source' }],
                },
                {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['alk-code-language'] },
                  children: [{ type: 'text', value: this.options.lang }],
                },
                {
                  type: 'element',
                  tagName: 'button',
                  properties: {
                    type: 'button',
                    className: ['alk-code-copy'],
                    dataAlkCopy: '',
                    hidden: true,
                    ariaLabel: `Copy ${config.title ?? this.options.lang} source code`,
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
            ...children,
          ],
        },
      ];
    },
  };
}
