import type { RevealApi } from 'reveal.js';
import type { NotesPlugin } from 'reveal.js/plugin/notes';

type View = 'read' | 'present';
const widgets =
  'alk-chart, alk-model, alk-shader, alk-midi, alk-media, alk-diagram';
let instance = 0;

class SlidesElement extends HTMLElement {
  private deck?: RevealApi;
  private events?: AbortController;
  private resize?: ResizeObserver;
  private current = 0;
  private fragment = -1;
  private restorePosition = false;
  private operation = Promise.resolve();
  private epoch = 0;
  private printing = false;
  private receiver =
    window.parent !== window &&
    new URLSearchParams(location.search).has('receiver');

  private get viewport() {
    return this.querySelector<HTMLElement>('.alk-slides-viewport')!;
  }
  private get sections() {
    return Array.from(
      this.querySelector<HTMLElement>('.slides')!.children,
    ).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.hasAttribute('data-alk-slide'),
    );
  }
  private button(name: string) {
    return this.querySelector<HTMLButtonElement>(`[data-slides-${name}]`)!;
  }

  connectedCallback() {
    if (this.events) return;
    this.events = new AbortController();
    const signal = this.events.signal;
    if (this.receiver) this.dataset.receiver = 'true';
    if (!this.id) {
      let id: string;
      do {
        id = `alk-slides-${++instance}`;
      } while (document.getElementById(id));
      this.id = id;
    }
    if (!this.sections.length) {
      this.message(
        'No slides found. Set format: slides in the document frontmatter and enable slides in alkemist().',
      );
      return;
    }
    this.prepareContent();
    this.querySelectorAll<HTMLElement>('[data-slides-controls]').forEach(
      (control) => (control.hidden = false),
    );
    this.button('read').addEventListener(
      'click',
      () => void this.setView('read'),
      { signal },
    );
    this.button('present').addEventListener(
      'click',
      () => void this.setView('present'),
      { signal },
    );
    this.button('prev').addEventListener('click', () => this.deck?.prev(), {
      signal,
    });
    this.button('next').addEventListener('click', () => this.deck?.next(), {
      signal,
    });
    this.button('notes').addEventListener(
      'click',
      () => (this.deck?.getPlugin('notes') as NotesPlugin | undefined)?.open(),
      { signal },
    );
    this.button('fullscreen').addEventListener(
      'click',
      () => {
        const action =
          document.fullscreenElement === this
            ? document.exitFullscreen()
            : this.requestFullscreen?.();
        void action?.catch(() =>
          this.message(
            'Fullscreen is unavailable in this browser. Presentation controls remain available.',
          ),
        );
      },
      { signal },
    );
    this.button('print').addEventListener('click', () => void this.print(), {
      signal,
    });
    this.querySelector<HTMLSelectElement>(
      '[data-slides-picker]',
    )!.addEventListener(
      'change',
      (event) => {
        const index = Number((event.target as HTMLSelectElement).value);
        if (this.deck) this.deck.slide(index);
        else {
          this.current = index;
          this.fragment = -1;
          this.restorePosition = true;
          this.sections[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      },
      { signal },
    );
    this.addEventListener('click', (event) => this.followAnchor(event), {
      signal,
    });
    document.addEventListener('visibilitychange', () => this.updateActivity(), {
      signal,
    });
    document.addEventListener(
      'fullscreenchange',
      () => {
        this.button('fullscreen').textContent =
          document.fullscreenElement === this
            ? 'Exit fullscreen'
            : 'Fullscreen';
        this.deck?.layout();
      },
      { signal },
    );
    window.addEventListener('pagehide', () => this.teardown(), { signal });
    window.addEventListener(
      'pageshow',
      (event) => {
        if (event.persisted)
          void this.setView(
            this.dataset.view === 'present' ? 'present' : 'read',
          );
      },
      { signal },
    );
    // Speaker previews accept only the small Reveal protocol from their
    // same-origin parent, rather than enabling its general postMessage API.
    if (this.receiver)
      window.addEventListener(
        'message',
        (event) => {
          if (
            event.origin !== location.origin ||
            event.source !== window.parent ||
            typeof event.data !== 'string'
          )
            return;
          try {
            const data = JSON.parse(event.data);
            if (data.method === 'setState' && data.args?.[0])
              this.deck?.setState(data.args[0]);
            else if (data.method === 'next') this.deck?.next();
            else if (
              data.method === 'triggerKey' &&
              Number.isInteger(data.args?.[0])
            )
              this.deck?.triggerKey(data.args[0]);
          } catch {
            /* Other page tools may send messages using a different format. */
          }
        },
        { signal },
      );
    this.resize = new ResizeObserver(() => this.deck?.layout());
    this.resize.observe(this.viewport);
    const view =
      !this.receiver &&
      (this.dataset.initialView === 'read' || window.innerWidth < 640)
        ? 'read'
        : 'present';
    this.dataset.view = view;
    this.sections.forEach(
      (section, i) =>
        (section.dataset.alkActive = String(view === 'read' || i === 0)),
    );
    this.updateActivity();
    void this.setView(view);
  }

  disconnectedCallback() {
    this.epoch++;
    this.events?.abort();
    this.events = undefined;
    this.resize?.disconnect();
    this.resize = undefined;
    this.teardown();
  }

  private prepareContent() {
    if (this.dataset.prepared) return;
    this.dataset.prepared = 'true';
    // Reveal interprets any descendant <section> as a vertical slide. Widget
    // regions are ordinary content; normalize their wrappers once, before
    // presentation starts, and keep the same child nodes thereafter.
    for (const slide of this.sections) {
      slide.querySelectorAll('section').forEach((section) => {
        const region = document.createElement('div');
        for (const attribute of Array.from(section.attributes))
          region.setAttribute(attribute.name, attribute.value);
        if (
          !region.hasAttribute('role') &&
          (region.hasAttribute('aria-label') ||
            region.hasAttribute('aria-labelledby'))
        )
          region.setAttribute('role', 'region');
        region.append(...Array.from(section.childNodes));
        section.replaceWith(region);
      });
    }
    const embedded = this.dataset.embedded === 'true';
    const ids = new Map<string, string>();
    this.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
      if (embedded) {
        ids.set(element.id, `${this.id}-${element.id}`);
        element.id = ids.get(element.id)!;
      }
    });
    if (embedded) {
      this.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(
        (link) => {
          const mapped = ids.get(link.getAttribute('href')!.slice(1));
          if (mapped) link.setAttribute('href', `#${mapped}`);
        },
      );
      this.querySelectorAll<HTMLElement>('[data-note-target]').forEach(
        (note) => {
          note.dataset.noteTarget =
            ids.get(note.dataset.noteTarget!) ?? note.dataset.noteTarget;
        },
      );
      this.querySelectorAll('*').forEach((element) => {
        for (const name of [
          'aria-labelledby',
          'aria-describedby',
          'aria-controls',
          'aria-owns',
          'aria-activedescendant',
          'for',
          'list',
          'headers',
        ]) {
          const value = element.getAttribute(name);
          if (value)
            element.setAttribute(
              name,
              value
                .split(/\s+/)
                .map((id) => ids.get(id) ?? id)
                .join(' '),
            );
        }
        // Inline SVG paint servers and <use> references share the ID namespace.
        for (const attribute of Array.from(element.attributes)) {
          if (attribute.name === 'href' || attribute.name === 'xlink:href') {
            const mapped = ids.get(attribute.value.slice(1));
            if (attribute.value.startsWith('#') && mapped)
              element.setAttribute(attribute.name, `#${mapped}`);
          } else if (attribute.value.includes('url(')) {
            element.setAttribute(
              attribute.name,
              attribute.value.replace(
                /url\((['"]?)#([^)'"\s]+)\1\)/g,
                (match, quote, id) =>
                  ids.has(id) ? `url(${quote}#${ids.get(id)}${quote})` : match,
              ),
            );
          }
        }
      });
    }
    this.querySelectorAll<HTMLElement>('[data-step-each]').forEach((step) => {
      const children =
        step.children.length === 1 &&
        /^(UL|OL)$/.test(step.children[0]!.tagName)
          ? step.children[0]!.children
          : step.children;
      Array.from(children).forEach((child) => child.classList.add('fragment'));
    });
    this.querySelectorAll<HTMLElement>('[data-note-target]').forEach(
      (note, index) => {
        const target = Array.from(
          this.querySelectorAll<HTMLElement>('[id]'),
        ).find((element) => element.id === note.dataset.noteTarget);
        if (!target) {
          note.dataset.state = 'error';
          const error = document.createElement('p');
          error.textContent = `Annotation target “${note.dataset.noteTarget}” was not found.`;
          note.append(error);
          return;
        }
        note.id ||= `${this.id}-note-${index + 1}`;
        target.setAttribute(
          'aria-describedby',
          [target.getAttribute('aria-describedby'), note.id]
            .filter(Boolean)
            .join(' '),
        );
      },
    );
    const picker = this.querySelector<HTMLSelectElement>(
      '[data-slides-picker]',
    )!;
    this.sections.forEach((section, index) => {
      section.id ||= `${this.id}-slide-${index + 1}`;
      const title =
        section.querySelector('h1,h2,h3')?.textContent?.trim() ||
        `Slide ${index + 1}`;
      section.setAttribute('aria-label', title);
      picker.add(new Option(`${index + 1}. ${title}`, String(index)));
    });
  }

  setView(view: View): Promise<void> {
    this.operation = this.operation
      .then(() => this.changeView(view))
      .catch((error) => {
        this.teardown();
        this.dataset.view = 'read';
        this.sync();
        this.message(
          `Presentation could not start: ${error instanceof Error ? error.message : 'unknown error'}. The document remains readable.`,
        );
      });
    return this.operation;
  }

  private async changeView(view: View) {
    if (!this.isConnected) return;
    const epoch = this.epoch;
    if (view === 'read') {
      this.teardown();
      this.dataset.view = 'read';
      this.sync();
      return;
    }
    if (this.deck) return;
    this.dataset.view = 'present';
    this.updateActivity();
    const [{ default: Reveal }, { default: Notes }] = await Promise.all([
      import('reveal.js'),
      import('reveal.js/plugin/notes'),
    ]);
    if (!this.isConnected || epoch !== this.epoch) return;
    this.viewport.classList.add('reveal');
    const deck = new Reveal(this.viewport, {
      embedded: true,
      width: 1100,
      height: 700,
      margin: 0.025,
      minScale: 0.15,
      maxScale: 1.5,
      center: false,
      controls: false,
      progress: false,
      hash: this.dataset.embedded !== 'true',
      respondToHashChanges: this.dataset.embedded !== 'true',
      fragmentInURL: true,
      transition: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'none'
        : 'fade',
      backgroundTransition: 'none',
      view: null,
      scrollActivationWidth: 0,
      autoPlayMedia: false,
      autoSlide: 0,
      autoAnimate: false,
      touch: false,
      hideInactiveCursor: false,
      postMessage: false,
      focusBodyOnPageVisibilityChange: false,
      keyboardCondition: (event) => {
        const target = event
          .composedPath?.()
          .find((node) => node instanceof HTMLElement) as
          HTMLElement | undefined;
        return (
          this.receiver ||
          (this.contains(document.activeElement) &&
            !target?.closest(
              'input,textarea,select,button,a,[contenteditable],canvas,alk-midi,alk-media',
            ))
        );
      },
      plugins: this.dataset.embedded === 'true' ? [] : [Notes],
    });
    this.deck = deck;
    await deck.initialize();
    if (!this.isConnected || epoch !== this.epoch) {
      deck.destroy();
      if (this.deck === deck) this.deck = undefined;
      return;
    }
    if (this.restorePosition || this.current > 0 || this.fragment >= 0)
      deck.slide(this.current, 0, this.fragment);
    for (const event of [
      'slidechanged',
      'fragmentshown',
      'fragmenthidden',
      'slidetransitionend',
      'overviewshown',
      'overviewhidden',
    ])
      deck.on(event, () => this.sync());
    this.sync();
  }

  private teardown() {
    if (this.deck) {
      const indices = this.deck.getIndices();
      this.current = indices.h ?? 0;
      this.fragment = indices.f ?? -1;
      this.restorePosition = true;
      this.deck.destroy();
      this.deck = undefined;
    }
    this.viewport?.classList.remove('reveal');
    this.querySelectorAll<HTMLMediaElement>('audio,video').forEach((media) =>
      media.pause(),
    );
  }

  private sync() {
    if (this.deck) {
      const indices = this.deck.getIndices();
      this.current = indices.h;
      this.fragment = indices.f ?? -1;
    }
    const presenting = this.dataset.view === 'present' && Boolean(this.deck);
    this.button('read').setAttribute('aria-pressed', String(!presenting));
    this.button('present').setAttribute('aria-pressed', String(presenting));
    this.button('notes').disabled =
      !presenting || this.dataset.embedded === 'true';
    this.button('notes').title =
      this.dataset.embedded === 'true'
        ? 'Open the standalone deck for presenter view'
        : 'Open presenter view';
    this.button('prev').disabled =
      !presenting ||
      (this.deck!.isFirstSlide() && !this.deck!.availableFragments().prev);
    this.button('next').disabled =
      !presenting ||
      (this.deck!.isLastSlide() && !this.deck!.availableFragments().next);
    this.querySelector<HTMLSelectElement>('[data-slides-picker]')!.value =
      String(this.current);
    this.querySelector<HTMLOutputElement>('[data-slides-count]')!.textContent =
      presenting
        ? `${this.current + 1} / ${this.sections.length}${this.fragment >= 0 ? ` · step ${this.fragment + 1}` : ''}`
        : `${this.sections.length} slides`;
    this.dataset.ready = 'true';
    this.updateActivity();
  }

  private updateActivity() {
    const presenting = this.dataset.view === 'present';
    this.sections.forEach((section, index) => {
      const active =
        !document.hidden && (!presenting || index === this.current);
      section.dataset.alkActive = String(active);
      section.querySelectorAll<HTMLElement>(widgets).forEach((widget) => {
        const visible =
          active && (!presenting || !widget.closest('.fragment:not(.visible)'));
        widget.dataset.alkActive = String(visible);
        widget.dispatchEvent(
          new CustomEvent('alk:presentation', { detail: { active: visible } }),
        );
      });
      section
        .querySelectorAll<HTMLMediaElement>('audio,video')
        .forEach((media) => {
          if (
            !active ||
            (presenting && media.closest('.fragment:not(.visible)'))
          )
            media.pause();
        });
    });
  }

  private followAnchor(event: MouseEvent) {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (!anchor || !this.deck) return;
    let id: string;
    try {
      id = decodeURIComponent(anchor.hash.slice(1));
    } catch {
      return;
    }
    const target = Array.from(this.querySelectorAll<HTMLElement>('[id]')).find(
      (element) => element.id === id,
    );
    const section = target?.closest<HTMLElement>('[data-alk-slide]');
    if (!section || !target) return;
    event.preventDefault();
    this.deck.slide(this.sections.indexOf(section));
    requestAnimationFrame(() => {
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    });
  }

  private message(text: string) {
    const message = this.querySelector<HTMLElement>('[data-slides-message]')!;
    message.hidden = false;
    message.textContent = text;
  }

  /** Prepare every lazy figure before the browser captures pages. */
  async preparePrint() {
    await this.setView('read');
    await document.fonts.ready;
    for (const section of this.sections) {
      section.scrollIntoView({ block: 'center' });
      this.updateActivity();
      const started = performance.now();
      await new Promise((resolve) => setTimeout(resolve, 180));
      while (
        Array.from(section.querySelectorAll<HTMLElement>(widgets)).some(
          (widget) => {
            if (widget.matches('alk-midi'))
              return widget.dataset.ready !== 'true';
            if (widget.matches('alk-media')) return false;
            return !['ready', 'error'].includes(widget.dataset.state ?? '');
          },
        )
      ) {
        if (performance.now() - started > 15000)
          throw new Error(
            'A slide figure did not finish loading. Check the figure and retry.',
          );
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      await Promise.all(
        Array.from(section.querySelectorAll<HTMLImageElement>('img')).map(
          (image) => image.decode(),
        ),
      );
      await new Promise(requestAnimationFrame);
      section
        .querySelectorAll<HTMLCanvasElement>('canvas')
        .forEach((canvas) => {
          if (
            !canvas.width ||
            !canvas.height ||
            canvas.closest('[data-state="error"]')
          )
            return;
          // WebGL clears its drawing buffer after compositing: capture in the
          // same task as a fresh render, without retaining every animation frame.
          canvas
            .closest(widgets)
            ?.dispatchEvent(new CustomEvent('alk:before-capture'));
          canvas.parentElement?.querySelector('[data-print-capture]')?.remove();
          const image = document.createElement('img');
          image.dataset.printCapture = '';
          image.alt =
            canvas.getAttribute('aria-label') ||
            'Static view of the interactive figure';
          image.src = canvas.toDataURL('image/png');
          canvas.after(image);
        });
    }
    this.dataset.printReady = 'true';
  }

  private async print() {
    if (this.printing) return;
    this.printing = true;
    this.button('print').disabled = true;
    this.message('Preparing slides for printing…');
    const scroll = window.scrollY;
    const view = this.dataset.view === 'present' ? 'present' : 'read';
    try {
      await this.preparePrint();
      this.querySelector<HTMLElement>('[data-slides-message]')!.hidden = true;
      window.print();
    } catch (error) {
      this.message(
        `Print preparation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      this.printing = false;
      this.button('print').disabled = false;
      await this.setView(view);
      window.scrollTo(0, scroll);
    }
  }
}

if (!customElements.get('alk-slides'))
  customElements.define('alk-slides', SlidesElement);
