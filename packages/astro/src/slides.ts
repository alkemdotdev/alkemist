/** Markdown and MDX compilation for Alkemist decks. */

import { rehypeHeadingIds } from '@astrojs/markdown-remark';

type Node = {
  type: string;
  name?: string | null;
  value?: string;
  lang?: string | null;
  identifier?: string;
  children?: Node[];
  data?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  tagName?: string;
};

type FileLike = {
  data?: { astro?: { frontmatter?: Record<string, unknown> } };
};

const builtinComponents = {
  Chart: 'chart',
  Model: 'model',
  Shader: 'shader',
  Math: 'math',
  Code: 'code',
  Audio: 'audio',
  Video: 'video',
  Midi: 'midi',
  Note: 'note',
  Step: 'step',
  SpeakerNotes: 'speaker-notes',
  Diagram: 'diagram',
} as const;
const builtinNames = new Set(Object.keys(builtinComponents));

function isSlideDeck(file: FileLike) {
  return file.data?.astro?.frontmatter?.format === 'slides';
}

function visit(node: Node, callback: (current: Node) => void) {
  callback(node);
  node.children?.forEach((child) => visit(child, callback));
}

function referencesIn(nodes: Node[]) {
  const identifiers = new Set<string>();
  for (const node of nodes) {
    visit(node, (current) => {
      if (current.type === 'footnoteReference' && current.identifier)
        identifiers.add(current.identifier);
    });
  }
  return identifiers;
}

function renameReferences(nodes: Node[], prefix: string) {
  for (const node of nodes) {
    visit(node, (current) => {
      if (current.type === 'footnoteReference' && current.identifier)
        current.identifier = `${prefix}${current.identifier}`;
    });
  }
}

function speakerNotesFromComments(
  nodes: Node[],
  parse: (value: string) => Node,
) {
  return nodes.flatMap((node) => {
    if (node.type === 'html' && node.value) {
      const match = node.value.match(/^<!--\s*notes:\s*([\s\S]*?)\s*-->$/i);
      if (match) {
        return {
          type: 'blockquote',
          data: {
            hName: 'aside',
            hProperties: {
              className: ['notes'],
              dataAlkSpeakerNotes: '',
            },
          },
          children: escapeNoteHtml(parse(match[1]).children ?? []),
        };
      }
    }
    if (node.children)
      node.children = speakerNotesFromComments(node.children, parse);
    return node;
  });
}

/** Notes are Markdown, not an HTML injection channel. */
function escapeNoteHtml(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type === 'html') return { type: 'text', value: node.value ?? '' };
    if (node.children) node.children = escapeNoteHtml(node.children);
    return node;
  });
}

type EstreeNode = {
  type?: string;
  name?: string;
  id?: EstreeNode | null;
  declarations?: EstreeNode[];
  declaration?: EstreeNode | null;
  specifiers?: EstreeNode[];
  local?: EstreeNode | null;
  properties?: EstreeNode[];
  value?: EstreeNode | null;
  argument?: EstreeNode | null;
  elements?: (EstreeNode | null)[];
  left?: EstreeNode | null;
};

function collectPatternBindings(
  node: EstreeNode | null | undefined,
  names: Set<string>,
) {
  if (!node) return;
  if (node.type === 'Identifier' && node.name) {
    names.add(node.name);
  } else if (node.type === 'ObjectPattern') {
    node.properties?.forEach((property) => {
      if (property.type === 'RestElement')
        collectPatternBindings(property.argument, names);
      else collectPatternBindings(property.value, names);
    });
  } else if (node.type === 'ArrayPattern') {
    node.elements?.forEach((element) => collectPatternBindings(element, names));
  } else if (node.type === 'AssignmentPattern') {
    collectPatternBindings(node.left, names);
  } else if (node.type === 'RestElement') {
    collectPatternBindings(node.argument, names);
  }
}

function collectDeclarationBindings(
  node: EstreeNode | null | undefined,
  names: Set<string>,
) {
  if (!node) return;
  if (node.type === 'ImportDeclaration') {
    node.specifiers?.forEach((specifier) =>
      collectPatternBindings(specifier.local, names),
    );
  } else if (node.type === 'VariableDeclaration') {
    node.declarations?.forEach((declaration) =>
      collectPatternBindings(declaration.id, names),
    );
  } else if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'ClassDeclaration'
  ) {
    collectPatternBindings(node.id, names);
  } else if (
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportDefaultDeclaration'
  ) {
    collectDeclarationBindings(node.declaration, names);
  }
}

function boundNames(tree: Node) {
  const names = new Set<string>();
  for (const child of tree.children ?? []) {
    if (child.type !== 'mdxjsEsm') continue;
    const program = child.data?.estree as { body?: EstreeNode[] } | undefined;
    program?.body?.forEach((statement) =>
      collectDeclarationBindings(statement, names),
    );
  }
  return names;
}

function usedBuiltinNames(tree: Node) {
  const names = new Set<string>();
  visit(tree, (node) => {
    if (
      (node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement') &&
      node.name &&
      builtinNames.has(node.name)
    )
      names.add(node.name);
  });
  return names;
}

/** Add only the MDX built-ins that a deck actually uses and has not bound. */
export function injectSlideBuiltinImports(
  tree: Node,
  parse?: (value: string) => Node,
) {
  const used = usedBuiltinNames(tree);
  if (used.size === 0) return;
  const bound = boundNames(tree);
  const imports = [...used]
    .filter((name) => !bound.has(name))
    .sort()
    .map(
      (name) =>
        `import ${name} from '@alkemdotdev/alkemist-components/${builtinComponents[name as keyof typeof builtinComponents]}';`,
    );
  if (imports.length === 0) return;
  const children = tree.children ?? (tree.children = []);
  let insertionPoint = 0;
  while (children[insertionPoint]?.type === 'mdxjsEsm') insertionPoint += 1;
  const source = imports.join('\n');
  const parsed = parse?.(source).children?.filter(
    (node) => node.type === 'mdxjsEsm',
  );
  children.splice(
    insertionPoint,
    0,
    ...(parsed?.length ? parsed : [{ type: 'mdxjsEsm', value: source }]),
  );
}

/**
 * Split only parsed top-level thematic breaks. Footnote definitions are copied
 * into each referencing slide with slide-local IDs, so trailing definitions
 * remain usable during presentation without creating a definitions slide.
 */
export function remarkAlkemistSlides(this: any) {
  const parse = this.parse.bind(this) as (value: string) => Node;
  return (tree: any, file: any) => {
    if (!isSlideDeck(file)) return;
    tree.children = speakerNotesFromComments(tree.children ?? [], parse);
    injectSlideBuiltinImports(tree, parse);
    const definitions = new Map<string, Node>();
    const content = ((tree as Node).children ?? []).filter((node: Node) => {
      if (node.type !== 'footnoteDefinition' || !node.identifier) return true;
      definitions.set(node.identifier, node);
      return false;
    });
    const slides: Node[][] = [[]];
    for (const node of content) {
      if (node.type === 'thematicBreak') {
        if (slides.at(-1)?.length) slides.push([]);
        continue;
      }
      slides.at(-1)?.push(node);
    }
    const incremental = file.data?.astro?.frontmatter?.incremental === true;
    const rewritten: Node[] = [];
    slides.forEach((slide, index) => {
      if (slide.length === 0) return;
      const prefix = `alk-slide-${index + 1}-`;
      const pending = [...referencesIn(slide)];
      const copied = new Map<string, Node>();
      while (pending.length > 0) {
        const identifier = pending.shift();
        if (!identifier || copied.has(identifier)) continue;
        const definition = definitions.get(identifier);
        if (!definition) continue;
        const local = structuredClone(definition);
        copied.set(identifier, local);
        for (const nested of referencesIn([local])) {
          if (!copied.has(nested)) pending.push(nested);
        }
      }
      renameReferences([...slide, ...copied.values()], prefix);
      if (incremental) {
        slide.forEach((node) =>
          visit(node, (current) => {
            if (current.type !== 'listItem') return;
            current.data = {
              ...current.data,
              hProperties: {
                ...(current.data?.hProperties as Record<string, unknown>),
                className: ['fragment'],
              },
            };
          }),
        );
      }
      for (const [identifier, local] of copied) {
        local.identifier = `${prefix}${identifier}`;
        slide.push(local);
      }
      rewritten.push(...slide, {
        type: 'thematicBreak',
        data: { hName: 'alk-slide-break' },
      });
    });
    if (rewritten.at(-1)?.type === 'thematicBreak') rewritten.pop();
    tree.children = rewritten;
  };
}

function textContent(node: Node): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

function headingText(node: Node): string {
  if (node.type === 'text') return node.value ?? '';
  if (
    node.type === 'element' &&
    (node.tagName === 'sup' || node.properties?.dataFootnoteRef !== undefined)
  )
    return '';
  return (node.children ?? []).map(headingText).join('');
}

function sectionTitle(nodes: Node[], index: number) {
  const heading = nodes.find(
    (node) => node.type === 'element' && /^h[1-6]$/.test(node.tagName ?? ''),
  );
  return (
    headingText(heading ?? { type: 'text', value: '' }).trim() ||
    `Slide ${index}`
  );
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'slide'
  );
}

function walkHast(node: Node, callback: (current: Node) => void) {
  callback(node);
  node.children?.forEach((child) => walkHast(child, callback));
}

function calloutsAndDiagrams(tree: Node) {
  walkHast(tree, (node) => {
    if (node.type === 'element' && node.tagName === 'blockquote') {
      const paragraph = node.children?.find(
        (child) => child.type === 'element' && child.tagName === 'p',
      );
      const first = paragraph?.children?.[0];
      const match =
        first?.type === 'text' &&
        first.value?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*/i);
      if (match && paragraph && first) {
        first.value = first.value?.slice(match[0].length);
        if (!first.value) paragraph.children?.shift();
        node.tagName = 'aside';
        node.properties = {
          ...node.properties,
          className: ['alk-callout', `alk-callout-${match[1].toLowerCase()}`],
          dataCallout: match[1].toLowerCase(),
        };
      }
    }
    if (
      node.type === 'element' &&
      node.tagName === 'pre' &&
      !node.data?.alkemistDiagramFallback &&
      node.children?.[0]?.type === 'element' &&
      node.children[0].tagName === 'code'
    ) {
      const code = node.children[0];
      const classNames = code.properties?.className;
      const isMermaid = Array.isArray(classNames)
        ? classNames.includes('language-mermaid')
        : classNames === 'language-mermaid';
      if (isMermaid) {
        const source = textContent(code);
        node.tagName = 'alk-diagram';
        node.properties = { source };
        node.children = [
          {
            type: 'element',
            tagName: 'pre',
            data: { alkemistDiagramFallback: true },
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'code',
                properties: { className: ['language-mermaid'] },
                children: [{ type: 'text', value: source }],
              },
            ],
          },
        ];
      }
    }
  });
}

function isFootnoteSection(node: Node) {
  if (node.type !== 'element' || node.tagName !== 'section') return false;
  if (node.properties?.dataFootnotes !== undefined) return true;
  const classNames = node.properties?.className;
  return Array.isArray(classNames) && classNames.includes('footnotes');
}

function footnoteSlideIndex(node: Node) {
  const id = node.properties?.id;
  if (typeof id !== 'string') return undefined;
  const match = id.match(/(?:^|-)alk-slide-(\d+)-/);
  return match ? Number(match[1]) - 1 : undefined;
}

function footnoteItems(node: Node, result: Map<number, Node[]>) {
  walkHast(node, (current) => {
    if (current.type !== 'element' || current.tagName !== 'li') return;
    const index = footnoteSlideIndex(current);
    if (index === undefined) return;
    const items = result.get(index) ?? [];
    items.push(structuredClone(current));
    result.set(index, items);
  });
}

function attachSlideFootnotes(
  slides: Node[][],
  bySlide: Map<number, Node[]>,
  reservedIds: Set<string>,
) {
  slides.forEach((children, index) => {
    const baseLabel = `footnote-label-${index + 1}`;
    let label = baseLabel;
    let suffix = 2;
    while (reservedIds.has(label)) label = `${baseLabel}-${suffix++}`;
    reservedIds.add(label);
    children.forEach((child) =>
      walkHast(child, (node) => {
        const id = node.properties?.id;
        if (
          typeof id === 'string' &&
          id.includes(`-alk-slide-${index + 1}-`) &&
          id.includes('fnref')
        )
          node.properties = { ...node.properties, ariaDescribedBy: label };
      }),
    );
    const items = bySlide.get(index);
    if (!items?.length) return;
    children.push({
      type: 'element',
      tagName: 'aside',
      properties: {
        dataFootnotes: '',
        className: ['footnotes'],
        ariaLabelledBy: label,
      },
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: { id: label, className: ['sr-only'] },
          children: [{ type: 'text', value: 'Footnotes' }],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: items,
        },
      ],
    });
  });
}

/** Render deck groups as SSR semantic sections and enhance shared annotations. */
export function rehypeAlkemistSlides() {
  return (tree: any, file: any) => {
    calloutsAndDiagrams(tree);
    if (!isSlideDeck(file)) return;
    // Astro normally applies this after user rehype plugins.  Run it now so
    // section and footnote IDs reserve the IDs it will retain on its later pass.
    // Astro exposes a generic unified Plugin type for this synchronous pass.
    const assignHeadingIds = rehypeHeadingIds() as (
      tree: Node,
      file: FileLike,
    ) => void;
    assignHeadingIds(tree, file);
    const footnotes = new Map<number, Node[]>();
    const rootChildren = (tree.children as Node[]).filter((node) => {
      if (!isFootnoteSection(node)) return true;
      footnoteItems(node, footnotes);
      return false;
    });
    const reservedIds = new Set<string>();
    walkHast({ type: 'root', children: rootChildren }, (node) => {
      const id = node.properties?.id;
      if (typeof id === 'string') reservedIds.add(id);
    });
    const slides: Node[][] = [[]];
    for (const node of rootChildren) {
      if (node.type === 'element' && node.tagName === 'alk-slide-break')
        slides.push([]);
      else slides.at(-1)?.push(node);
    }
    const slideChildren = slides.filter((children) => children.length > 0);
    attachSlideFootnotes(slideChildren, footnotes, reservedIds);
    const usedIds = new Map<string, number>();
    tree.children = slideChildren.map((children, offset) => {
      const title = sectionTitle(children, offset + 1);
      const base = `slide-${slug(title)}`;
      let occurrence = usedIds.get(base) ?? 0;
      let id = occurrence === 0 ? base : `${base}-${occurrence + 1}`;
      while (reservedIds.has(id)) {
        occurrence += 1;
        id = `${base}-${occurrence + 1}`;
      }
      usedIds.set(base, occurrence + 1);
      reservedIds.add(id);
      return {
        type: 'element',
        tagName: 'section',
        properties: { dataAlkSlide: '', id, ariaLabel: title, title },
        children,
      };
    });
  };
}
