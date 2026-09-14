import {
  MAX_ANNOTATIONS,
  MAX_IMPORT_BYTES,
  anchorQuote,
  canonicalSource,
  codePointOffset,
  createAnnotationId,
  editAnnotation,
  makeQuote,
  utf16Offset,
  validateImport,
  type Annotation,
  type TextPositionSelector,
  type TextQuoteSelector,
} from './annotations';

type TextNode = { node: Text; start: number; end: number };
type CapturedSelection = {
  quote: TextQuoteSelector;
  position: TextPositionSelector;
};
const excluded =
  'script, style, noscript, template, input, textarea, select, button, [contenteditable], alk-chart, alk-model, alk-shader, alk-midi, alk-media, alk-diagram, .notes, [data-alk-speaker-notes], [data-slides-controls], .alk-slides-navigation, [data-pagefind-ignore]';
const annotationRanges = new Map<HTMLElement, Range[]>();

function updateHighlights() {
  if (!('highlights' in CSS) || typeof Highlight === 'undefined') return;
  CSS.highlights.set(
    'alk-annotation',
    new Highlight(...[...annotationRanges.values()].flat()),
  );
}

function textMap(root: HTMLElement) {
  const nodes: TextNode[] = [];
  let text = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const hidden = parent?.closest<HTMLElement>(
        '[hidden], [aria-hidden="true"]',
      );
      const belongsToSlide = hidden?.matches('.slides section');
      return parent && !parent.closest(excluded) && (!hidden || belongsToSlide)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push({
      node,
      start: text.length,
      end: text.length + node.data.length,
    });
    text += node.data;
  }
  return { text, nodes };
}

function rangeAt(text: string, nodes: TextNode[], start: number, end: number) {
  const startUnit = utf16Offset(text, start);
  const endUnit = utf16Offset(text, end);
  const first = nodes.find(
    (item) => startUnit >= item.start && startUnit <= item.end,
  );
  const last = [...nodes]
    .reverse()
    .find((item) => endUnit >= item.start && endUnit <= item.end);
  if (!first || !last) return undefined;
  const range = document.createRange();
  range.setStart(first.node, startUnit - first.start);
  range.setEnd(last.node, endUnit - last.start);
  return range;
}

function selectionAt(root: HTMLElement): CapturedSelection | undefined {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return undefined;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return undefined;
  const { text, nodes } = textMap(root);
  const startNode = nodes.find((item) => item.node === range.startContainer);
  const endNode = nodes.find((item) => item.node === range.endContainer);
  if (!startNode || !endNode) return undefined;
  const startUnit = startNode.start + range.startOffset;
  const endUnit = endNode.start + range.endOffset;
  if (startUnit === endUnit || !text.slice(startUnit, endUnit).trim())
    return undefined;
  const start = codePointOffset(text, startUnit);
  const end = codePointOffset(text, endUnit);
  return {
    quote: makeQuote(text, start, end),
    position: { type: 'TextPositionSelector', start, end },
  };
}

class AnnotationsElement extends HTMLElement {
  private root?: HTMLElement;
  private annotations: Annotation[] = [];
  private captured?: CapturedSelection;
  private persistence = true;
  private events = new AbortController();
  private mutations?: MutationObserver;
  private renderFrame?: number;
  private readonly source = canonicalSource(location.href);

  private get dialog() {
    return this.querySelector<HTMLDialogElement>('[data-annotations-dialog]')!;
  }
  private get status() {
    return this.querySelector<HTMLElement>('[data-annotations-status]')!;
  }
  private get comment() {
    return this.querySelector<HTMLTextAreaElement>(
      '[data-annotations-comment]',
    )!;
  }
  private get save() {
    return this.querySelector<HTMLButtonElement>('[data-annotations-save]')!;
  }
  private get storageKey() {
    return `alkemist:annotations:${this.source}:${this.dataset.documentId || 'default'}`;
  }

  connectedCallback() {
    if (this.root) return;
    if (this.events.signal.aborted) this.events = new AbortController();
    const target = this.dataset.target;
    this.root = target
      ? (document.getElementById(target) ?? undefined)
      : (this.querySelector<HTMLElement>('[data-annotations-content]') ??
        undefined);
    if (!this.root) {
      this.status.textContent = 'Annotation target was not found.';
      return;
    }
    // Receiver windows share origin storage with the reader. Never project
    // personal notes or highlights into audience/cast/speaker-preview content.
    const params = new URLSearchParams(location.search);
    if (
      (this.closest('alk-slides') || this.root.closest('alk-slides')) &&
      ['receiver', 'alkAudience', 'alkCast'].some((key) => params.has(key))
    ) {
      this.dataset.disabled = 'receiver';
      return;
    }
    this.load();
    this.render();
    this.mutations = new MutationObserver(() => this.scheduleRender());
    this.mutations.observe(this.root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-hidden', 'class', 'style'],
    });
    this.root.addEventListener(
      'alk:presentation',
      () => this.scheduleRender(),
      {
        signal: this.events.signal,
      },
    );
    const signal = this.events.signal;
    const openButton = this.querySelector<HTMLButtonElement>(
      '[data-annotations-open]',
    )!;
    openButton.hidden = false;
    openButton.addEventListener(
      'pointerdown',
      () => {
        this.captured = selectionAt(this.root!);
      },
      { signal },
    );
    openButton.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter' || event.key === ' ')
          this.captured = selectionAt(this.root!);
      },
      { signal },
    );
    openButton.addEventListener('click', () => this.open(), { signal });
    this.querySelector<HTMLButtonElement>(
      '[data-annotations-close]',
    )!.addEventListener('click', () => this.dialog.close(), { signal });
    this.dialog.addEventListener(
      'close',
      () =>
        this.querySelector<HTMLButtonElement>(
          '[data-annotations-open]',
        )!.setAttribute('aria-expanded', 'false'),
      { signal },
    );
    this.querySelector<HTMLFormElement>(
      '[data-annotations-form]',
    )!.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        this.saveAnnotation();
      },
      { signal },
    );
    this.querySelector<HTMLButtonElement>(
      '[data-annotations-export]',
    )!.addEventListener('click', () => this.export(), { signal });
    this.querySelector<HTMLInputElement>(
      '[data-annotations-import]',
    )!.addEventListener(
      'change',
      (event) =>
        void this.import((event.target as HTMLInputElement).files?.[0]),
      { signal },
    );
  }
  disconnectedCallback() {
    this.events.abort();
    this.mutations?.disconnect();
    this.mutations = undefined;
    if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
    this.renderFrame = undefined;
    this.root = undefined;
    this.captured = undefined;
    annotationRanges.delete(this);
    updateHighlights();
  }
  private scheduleRender() {
    if (this.renderFrame) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = undefined;
      this.render();
    });
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved)
        this.annotations = validateImport(JSON.parse(saved), this.source);
    } catch {
      this.persistence = false;
      this.status.textContent =
        'Saved annotations are unavailable in this browser.';
    }
  }
  private persist() {
    if (!this.persistence) return false;
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          '@context': 'http://www.w3.org/ns/anno.jsonld',
          '@graph': this.annotations,
        }),
      );
      return true;
    } catch {
      this.persistence = false;
      this.status.textContent =
        'Annotations remain only while this page is open; browser storage is unavailable.';
      return false;
    }
  }
  private open() {
    this.captured ??= selectionAt(this.root!);
    this.querySelector<HTMLElement>(
      '[data-annotations-selection]',
    )!.textContent = this.captured
      ? `Selected: “${this.captured.quote.exact}”`
      : 'Select text in the document, then open this dialog.';
    this.save.disabled = !this.captured;
    this.querySelector<HTMLButtonElement>(
      '[data-annotations-open]',
    )!.setAttribute('aria-expanded', 'true');
    if (!this.dialog.open) this.dialog.showModal();
    if (this.captured) this.comment.focus();
  }
  private saveAnnotation() {
    if (!this.captured || this.annotations.length >= MAX_ANNOTATIONS) {
      this.status.textContent =
        'Select text before saving, or remove a saved annotation.';
      return;
    }
    if (
      this.captured.quote.exact.length > 10_000 ||
      this.comment.value.trim().length > 10_000
    ) {
      this.status.textContent =
        'Selections and comments must be 10,000 characters or fewer.';
      return;
    }
    const now = new Date().toISOString();
    const value = this.comment.value.trim();
    this.annotations.push({
      id: createAnnotationId(),
      type: 'Annotation',
      target: {
        source: this.source,
        selector: [this.captured.quote, this.captured.position],
      },
      ...(value
        ? { body: { type: 'TextualBody', value, format: 'text/plain' } }
        : {}),
      created: now,
      modified: now,
    });
    this.comment.value = '';
    this.captured = undefined;
    this.save.disabled = true;
    this.querySelector<HTMLElement>(
      '[data-annotations-selection]',
    )!.textContent = 'Select text in the document, then open this dialog.';
    const persisted = this.persist();
    this.render();
    this.status.textContent = persisted
      ? 'Highlight saved locally in this browser.'
      : 'Highlight saved for this page session only.';
  }
  private render() {
    if (!this.root) return;
    const { text, nodes } = textMap(this.root);
    const ranges: Range[] = [];
    const list = this.querySelector<HTMLOListElement>(
      '[data-annotations-list]',
    )!;
    list.replaceChildren();
    for (const annotation of this.annotations) {
      const [quote, position] = annotation.target.selector;
      const anchored = anchorQuote(text, quote, position);
      if (anchored.kind === 'found') {
        const range = rangeAt(text, nodes, anchored.start, anchored.end);
        if (range) ranges.push(range);
      }
      const item = document.createElement('li');
      const copy = document.createElement('div');
      const selected = document.createElement('strong');
      selected.textContent = `“${quote.exact}”`;
      copy.append(selected);
      if (annotation.body?.value) {
        const note = document.createElement('p');
        note.textContent = annotation.body.value;
        copy.append(note);
      }
      if (anchored.kind !== 'found') {
        const note = document.createElement('p');
        note.textContent =
          anchored.kind === 'ambiguous'
            ? 'Anchor is ambiguous; choose a more specific passage.'
            : 'Anchor text is missing.';
        copy.append(note);
      }
      const go = document.createElement('button');
      go.type = 'button';
      go.textContent = 'Go to';
      go.disabled = anchored.kind !== 'found';
      go.addEventListener('click', () => {
        const range =
          anchored.kind === 'found'
            ? (() => {
                const map = textMap(this.root!);
                return rangeAt(
                  map.text,
                  map.nodes,
                  anchored.start,
                  anchored.end,
                );
              })()
            : undefined;
        const element = range?.startContainer.parentElement;
        if (this.dialog.open) this.dialog.close();
        if (element)
          this.dispatchEvent(
            new CustomEvent('alk:annotation-target', {
              bubbles: true,
              composed: true,
              detail: { element },
            }),
          );
        requestAnimationFrame(() => {
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const selected = window.getSelection();
          if (range && selected) {
            selected.removeAllRanges();
            selected.addRange(range);
          }
        });
      });
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => {
        if (copy.querySelector('[data-annotations-edit]')) return;
        const editorBox = document.createElement('div');
        editorBox.dataset.annotationsEdit = '';
        const editor = document.createElement('textarea');
        editor.value = annotation.body?.value ?? '';
        editor.maxLength = 10_000;
        editor.setAttribute('aria-label', 'Edit annotation comment');
        const saveEdit = document.createElement('button');
        saveEdit.type = 'button';
        saveEdit.textContent = 'Save edit';
        saveEdit.addEventListener('click', () => {
          try {
            Object.assign(
              annotation,
              editAnnotation(
                annotation,
                editor.value,
                new Date().toISOString(),
              ),
            );
            const persisted = this.persist();
            this.render();
            this.status.textContent = persisted
              ? 'Annotation updated locally.'
              : 'Annotation updated for this page session only.';
          } catch (error) {
            this.status.textContent =
              error instanceof Error
                ? error.message
                : 'Could not update annotation.';
          }
        });
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel edit';
        cancel.addEventListener('click', () => editorBox.remove());
        const editorControls = document.createElement('div');
        editorControls.className = 'alk-annotations-edit-actions';
        editorControls.append(saveEdit, cancel);
        editorBox.append(editor, editorControls);
        copy.append(editorBox);
        editor.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        this.annotations = this.annotations.filter(
          (entry) => entry.id !== annotation.id,
        );
        const persisted = this.persist();
        this.render();
        this.status.textContent = persisted
          ? 'Annotation deleted locally.'
          : 'Annotation deleted for this page session only.';
      });
      item.append(copy, go, edit, remove);
      list.append(item);
    }
    annotationRanges.set(this, ranges);
    updateHighlights();
  }
  private export() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            '@context': 'http://www.w3.org/ns/anno.jsonld',
            '@graph': this.annotations,
          },
          null,
          2,
        ),
      ],
      { type: 'application/ld+json' },
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'annotations.json';
    link.click();
    URL.revokeObjectURL(link.href);
    this.status.textContent = 'Annotation JSON exported.';
  }
  private async import(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error('Import is larger than 250 KB.');
      const imported = validateImport(
        JSON.parse(await file.text()),
        this.source,
      );
      this.annotations = imported;
      const persisted = this.persist();
      this.render();
      this.status.textContent = persisted
        ? `${imported.length} annotations imported locally.`
        : `${imported.length} annotations imported for this page session only.`;
    } catch (error) {
      this.status.textContent =
        error instanceof Error
          ? error.message
          : 'Could not import annotations.';
    }
  }
}
if (!customElements.get('alk-annotations'))
  customElements.define('alk-annotations', AnnotationsElement);
