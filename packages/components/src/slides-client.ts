import { SlidesNative } from './slides-native';
import type { RevealApi } from 'reveal.js';
import type { NotesPlugin } from 'reveal.js/plugin/notes';
import { fitSlideContent, prepareSlideLayouts } from './slides-layout';

type View = 'read' | 'present';
const widgets =
  'alk-chart, alk-model, alk-shader, alk-midi, alk-media, alk-diagram';
let instance = 0;

class SlidesElement extends HTMLElement {
  private deck?: RevealApi;
  private native?: SlidesNative;
  private events?: AbortController;
  private resize?: ResizeObserver;
  private current = 0;
  private fragment = -1;
  private restorePosition = false;
  private operation = Promise.resolve();
  private epoch = 0;
  private printing = false;
  private timer?: number;
  private timerRunning = false;
  private lastOverlayFocus?: HTMLElement;
  private touchStart?: { x: number; y: number };
  private inerted: Array<{ element: HTMLElement; inert: boolean }> = [];
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
  private dialog(name: 'overview' | 'help') {
    return this.querySelector<HTMLDialogElement>(
      `[data-slides-${name}-dialog]`,
    )!;
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
    this.native = new SlidesNative({
      root: this,
      position: () => ({
        slide: this.current,
        fragment: this.fragment,
        blackout: this.dataset.blackout === 'true',
      }),
      apply: (state) => {
        const section = this.sections[state.slide];
        if (
          !section ||
          !this.deck ||
          state.fragment >= section.querySelectorAll('.fragment').length
        )
          return;
        this.setBlackout(state.blackout);
        this.deck.slide(state.slide, 0, state.fragment);
      },
      command: (command) => {
        if (command === 'blackout') this.toggleBlackout();
        else this.deck?.[command]();
      },
      message: (text) => this.message(text),
    });
    this.button('audience-fullscreen').hidden = !this.native.audience;
    this.button('audience-fullscreen').addEventListener(
      'click',
      () => void this.toggleFullscreen(),
      { signal },
    );
    this.prepareContent();
    prepareSlideLayouts(this);
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
    this.button('overview').addEventListener(
      'click',
      () => this.openOverview(),
      { signal },
    );
    this.button('help').addEventListener('click', () => this.openHelp(), {
      signal,
    });
    this.button('notes').addEventListener(
      'click',
      () => this.openSpeakerView(),
      { signal },
    );
    this.button('fullscreen').addEventListener(
      'click',
      () => void this.toggleFullscreen(),
      { signal },
    );
    this.button('print').addEventListener('click', () => void this.print(), {
      signal,
    });
    this.button('copy-link').addEventListener(
      'click',
      () => void this.copyCurrentLink(),
      { signal },
    );
    this.button('pointer').addEventListener(
      'click',
      () => this.togglePointer(),
      {
        signal,
      },
    );
    this.button('blackout').addEventListener(
      'click',
      () => this.toggleBlackout(),
      {
        signal,
      },
    );
    this.querySelector<HTMLElement>(
      '[data-slides-blackout-overlay]',
    )!.addEventListener(
      'click',
      () => {
        if (!this.native?.audience) this.setBlackout(false);
      },
      { signal },
    );
    this.button('timer').addEventListener('click', () => this.toggleTimer(), {
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
    this.addEventListener(
      'alk:annotation-target',
      (event) => {
        const element = (event as CustomEvent<{ element: HTMLElement }>).detail
          ?.element;
        const section = element?.closest<HTMLElement>('[data-alk-slide]');
        const index = section ? this.sections.indexOf(section) : -1;
        if (index >= 0 && this.deck) this.deck.slide(index);
      },
      { signal },
    );
    this.addEventListener('click', (event) => this.followAnchor(event), {
      signal,
    });
    this.addEventListener('keydown', (event) => this.keydown(event), {
      signal,
    });
    this.viewport.addEventListener(
      'pointermove',
      (event) => this.movePointer(event),
      {
        signal,
      },
    );
    this.viewport.addEventListener(
      'pointerdown',
      (event) => this.touchStartAt(event),
      {
        signal,
      },
    );
    this.viewport.addEventListener(
      'pointerup',
      (event) => this.touchEndAt(event),
      {
        signal,
      },
    );
    for (const name of ['overview', 'help'] as const) {
      const dialog = this.dialog(name);
      dialog.addEventListener('close', () => this.closeOverlay(), { signal });
      dialog.addEventListener(
        'cancel',
        (event) => {
          event.preventDefault();
          dialog.close();
        },
        { signal },
      );
    }
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.stopTimer();
        this.updateActivity();
      },
      { signal },
    );
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
              this.triggerRemoteKey(data.args[0]);
          } catch {
            /* Other page tools may send messages using a different format. */
          }
        },
        { signal },
      );
    this.resize = new ResizeObserver(() => {
      this.deck?.layout();
      fitSlideContent(this);
    });
    this.resize.observe(this.viewport);
    const view =
      !this.receiver &&
      !this.native.audience &&
      (this.dataset.initialView === 'read' || window.innerWidth < 640)
        ? 'read'
        : 'present';
    this.dataset.view = view;
    this.sections.forEach(
      (section, i) =>
        (section.dataset.alkActive = String(view === 'read' || i === 0)),
    );
    this.updateActivity();
    window.addEventListener('load', () => fitSlideContent(this), { signal });
    void document.fonts.ready.then(() => fitSlideContent(this));
    void this.setView(view);
  }

  disconnectedCallback() {
    this.epoch++;
    this.events?.abort();
    this.events = undefined;
    this.resize?.disconnect();
    this.resize = undefined;
    this.stopTimer();
    this.teardown();
    this.native?.destroy();
    this.native = undefined;
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
    delete this.dataset.printReady;
    const epoch = this.epoch;
    if (view === 'read') {
      this.teardown();
      this.dataset.view = 'read';
      this.sync();
      return;
    }
    if (this.deck) return;
    this.dataset.view = 'present';
    this.setStageInert(this.dataset.embedded !== 'true');
    this.native?.resume();
    this.updateActivity();
    prepareSlideLayouts(this);
    fitSlideContent(this);
    const [{ default: Reveal }, { default: Notes }] = await Promise.all([
      import('reveal.js'),
      import('reveal.js/plugin/notes'),
    ]);
    if (!this.isConnected || epoch !== this.epoch) return;
    this.viewport.classList.add('reveal');
    const deck = new Reveal(this.viewport, {
      embedded: true,
      disableLayout: true,
      center: false,
      controls: false,
      progress: false,
      hash: this.dataset.embedded !== 'true' && !this.native?.audience,
      respondToHashChanges:
        this.dataset.embedded !== 'true' && !this.native?.audience,
      fragmentInURL: true,
      transition: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'none'
        : this.transition(),
      backgroundTransition: 'none',
      view: null,
      scrollActivationWidth: 0,
      autoPlayMedia: false,
      autoSlide: 0,
      autoAnimate: false,
      keyboard: false,
      overview: false,
      help: false,
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
    fitSlideContent(this);
    void document.fonts.ready.then(() => fitSlideContent(this));
    this.sync();
    this.native?.resume();
    if (
      !this.receiver &&
      (this.dataset.embedded !== 'true' ||
        this.contains(document.activeElement))
    )
      this.viewport.focus({ preventScroll: true });
  }

  private teardown() {
    this.native?.suspend();
    this.stopTimer();
    this.setPointer(false);
    // Unload listeners may already have disposed widgets; never wake them here.
    this.setBlackout(false, false);
    this.setStageInert(false);
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
    this.native?.sync();
    this.updateActivity();
    fitSlideContent(this);
  }

  private updateActivity() {
    const presenting = this.dataset.view === 'present';
    const suspended =
      document.hidden ||
      this.dataset.blackout === 'true' ||
      this.dataset.overview === 'true';
    this.sections.forEach((section, index) => {
      const active = !suspended && (!presenting || index === this.current);
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

  private openOverview() {
    if (!this.deck) return;
    const dialog = this.dialog('overview');
    const cards = dialog.querySelector<HTMLElement>(
      '[data-slides-overview-cards]',
    )!;
    cards.replaceChildren(
      ...this.sections.map((section, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.slidesOverviewSlide = String(index);
        const heading =
          section.querySelector('h1,h2,h3')?.textContent?.trim() ||
          `Slide ${index + 1}`;
        const image = section.querySelector<HTMLImageElement>(
          'img, .alk-model-poster',
        );
        card.innerHTML = `<span class="alk-slides-overview-number">${index + 1}</span><strong>${this.escape(heading)}</strong>`;
        const preview = document.createElement('span');
        preview.className = 'alk-slides-overview-preview';
        const audience = document.createTreeWalker(
          section,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) =>
              !node.parentElement?.closest('.alk-slide-copy') ||
              node.parentElement.closest(
                '.notes,[data-alk-speaker-notes],[data-footnotes],.alk-note a,script,style,noscript,h1,h2,h3,button,summary',
              )
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
          },
        );
        const text: string[] = [];
        while (audience.nextNode())
          text.push(audience.currentNode.textContent ?? '');
        preview.textContent = text
          .join(' ')
          .replace(heading, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180);
        if (preview.textContent) card.append(preview);
        const selected = index === this.current;
        card.dataset.current = String(selected);
        if (selected) card.setAttribute('aria-current', 'true');
        if (image?.currentSrc || image?.src) {
          const thumbnail = document.createElement('img');
          thumbnail.src = image.currentSrc || image.src;
          thumbnail.alt = image.alt || '';
          thumbnail.loading = 'lazy';
          card.prepend(thumbnail);
        }
        card.addEventListener(
          'click',
          () => {
            this.deck?.slide(index, 0, -1);
            this.lastOverlayFocus = this.viewport;
            dialog.close();
            this.viewport.focus({ preventScroll: true });
          },
          { signal: this.events?.signal },
        );
        return card;
      }),
    );
    this.openDialog(dialog, 'overview');
  }

  private openHelp() {
    this.openDialog(this.dialog('help'), 'help');
  }

  private openDialog(dialog: HTMLDialogElement, kind: 'overview' | 'help') {
    if (dialog.open) return;
    this.lastOverlayFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    if (kind === 'overview') {
      this.stopTimer();
      this.dataset.overview = 'true';
      this.updateActivity();
    }
    dialog.showModal();
  }

  private closeOverlay() {
    const overview = this.dialog('overview');
    if (!overview.open) {
      delete this.dataset.overview;
      this.updateActivity();
    }
    this.lastOverlayFocus?.focus({ preventScroll: true });
    this.lastOverlayFocus = undefined;
  }

  private openSpeakerView() {
    if (!this.deck || this.dataset.embedded === 'true') {
      this.message('Speaker view is available from the standalone deck.');
      return;
    }
    const notes = this.deck.getPlugin('notes') as NotesPlugin | undefined;
    if (!notes) {
      this.message(
        'Speaker view could not be opened because the notes plugin is unavailable.',
      );
      return;
    }
    notes.open();
  }

  private async toggleFullscreen() {
    try {
      if (document.fullscreenElement === this) {
        await document.exitFullscreen();
        return;
      }
      if (!this.requestFullscreen) {
        this.message(
          'Fullscreen is unavailable in this browser. Presentation controls remain available.',
        );
        return;
      }
      await this.requestFullscreen();
    } catch {
      this.message(
        'Fullscreen was blocked or is unavailable in this browser. Presentation controls remain available.',
      );
    }
  }

  private async copyCurrentLink() {
    if (this.dataset.embedded === 'true') {
      this.message(
        'Copy the standalone deck URL to share this embedded presentation.',
      );
      return;
    }
    const url = new URL(location.href);
    for (const key of ['alkAudience', 'alkCast', 'receiver'])
      url.searchParams.delete(key);
    url.hash = this.deck?.getSlidePath() ?? url.hash;
    try {
      await navigator.clipboard.writeText(url.href);
      this.message('Current slide link copied.');
    } catch {
      const field = document.createElement('textarea');
      field.value = url.href;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      this.message(
        copied
          ? 'Current slide link copied.'
          : 'Copy was blocked; use the address bar link.',
      );
    }
  }

  private togglePointer() {
    this.setPointer(this.dataset.pointer !== 'true');
  }

  private setPointer(enabled: boolean) {
    this.dataset.pointer = String(enabled);
    const pointer = this.querySelector<HTMLElement>('[data-slides-laser]')!;
    pointer.hidden = !enabled;
    this.button('pointer').setAttribute('aria-pressed', String(enabled));
  }

  private movePointer(event: PointerEvent) {
    if (this.dataset.pointer !== 'true' || !this.deck) return;
    const rect = this.getBoundingClientRect();
    const pointer = this.querySelector<HTMLElement>('[data-slides-laser]')!;
    pointer.style.left = `${event.clientX - rect.left}px`;
    pointer.style.top = `${event.clientY - rect.top}px`;
  }

  private touchStartAt(event: PointerEvent) {
    if (this.native?.audience) return;
    if (event.pointerType !== 'touch' || this.isInteractive(event.target))
      return;
    this.touchStart = { x: event.clientX, y: event.clientY };
  }

  private touchEndAt(event: PointerEvent) {
    if (this.native?.audience) return;
    const start = this.touchStart;
    this.touchStart = undefined;
    if (
      !start ||
      event.pointerType !== 'touch' ||
      this.isInteractive(event.target)
    )
      return;
    const horizontal = event.clientX - start.x;
    const vertical = event.clientY - start.y;
    if (Math.abs(horizontal) < 48 || Math.abs(horizontal) < Math.abs(vertical))
      return;
    if (horizontal < 0) this.deck?.next();
    else this.deck?.prev();
  }

  private toggleBlackout() {
    this.setBlackout(this.dataset.blackout !== 'true');
  }

  private setBlackout(enabled: boolean, publishActivity = true) {
    const restoring = this.dataset.blackout === 'true' && !enabled;
    this.dataset.blackout = String(enabled);
    this.querySelector<HTMLElement>('[data-slides-blackout-overlay]')!.hidden =
      !enabled;
    this.button('blackout').setAttribute('aria-pressed', String(enabled));
    if (enabled) this.stopTimer();
    if (publishActivity) {
      this.updateActivity();
      this.native?.sync();
    }
    if (restoring && publishActivity)
      this.viewport.focus({ preventScroll: true });
  }

  private toggleTimer() {
    if (this.timerRunning) this.stopTimer();
    else this.startTimer();
  }

  private startTimer() {
    if (
      !this.deck ||
      this.dataset.blackout === 'true' ||
      this.dataset.overview === 'true'
    )
      return;
    const seconds = Number(
      this.querySelector<HTMLSelectElement>('[data-slides-timer-seconds]')!
        .value,
    );
    if (![5, 10, 20].includes(seconds)) return;
    this.stopTimer();
    this.timerRunning = true;
    this.timer = window.setInterval(() => {
      if (
        document.hidden ||
        this.dataset.blackout === 'true' ||
        this.dataset.overview === 'true'
      ) {
        this.stopTimer();
        return;
      }
      if (this.deck?.isLastSlide() && !this.deck.availableFragments().next) {
        this.stopTimer();
        return;
      }
      this.deck?.next();
    }, seconds * 1000);
    this.button('timer').textContent = 'Pause timer';
    this.button('timer').setAttribute('aria-pressed', 'true');
    const status = this.querySelector<HTMLOutputElement>(
      '[data-slides-timer-status]',
    )!;
    status.hidden = false;
    status.textContent = `Auto · ${seconds}s`;
    status.setAttribute('aria-label', `Timed advance every ${seconds} seconds`);
  }

  private stopTimer() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    this.timerRunning = false;
    const button = this.querySelector<HTMLButtonElement>('[data-slides-timer]');
    if (button) {
      button.textContent = 'Start timer';
      button.setAttribute('aria-pressed', 'false');
    }
    const status = this.querySelector<HTMLOutputElement>(
      '[data-slides-timer-status]',
    );
    if (status) status.hidden = true;
  }

  private setStageInert(enabled: boolean) {
    if (enabled) {
      if (this.inerted.length) return;
      const siblings = new Set<HTMLElement>();
      let branch: HTMLElement | null = this;
      while (branch?.parentElement) {
        for (const sibling of Array.from(branch.parentElement.children))
          if (sibling instanceof HTMLElement && sibling !== branch)
            siblings.add(sibling);
        if (branch.parentElement === document.body) break;
        branch = branch.parentElement;
      }
      this.inerted = Array.from(siblings).map((element) => ({
        element,
        inert: element.inert,
      }));
      this.inerted.forEach(({ element }) => (element.inert = true));
      return;
    }
    this.inerted.forEach(({ element, inert }) => (element.inert = inert));
    this.inerted = [];
  }

  private transition(): 'none' | 'fade' | 'slide' {
    const transition = this.dataset.transition;
    return transition === 'none' || transition === 'slide'
      ? transition
      : 'fade';
  }

  private triggerRemoteKey(key: number) {
    if (!this.deck) return;
    if ([32, 39, 40, 78].includes(key)) this.deck.next();
    else if ([37, 38, 80].includes(key)) this.deck.prev();
    else if (key === 36) this.deck.slide(0);
    else if (key === 35) this.deck.slide(this.sections.length - 1);
    else this.deck.triggerKey(key);
  }

  private keydown(event: KeyboardEvent) {
    if (this.native?.audience && event.key.toLowerCase() !== 'f') return;
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    if (event.key === 'Escape') {
      const open = this.querySelector<HTMLDialogElement>('dialog[open]');
      if (open) {
        event.preventDefault();
        open.close();
      } else if (this.dataset.blackout === 'true') this.setBlackout(false);
      else if (this.deck) void this.setView('read');
      return;
    }
    if (!this.deck || this.isInteractive(event.target)) return;
    const action = () => {
      switch (event.key) {
        case 'n':
        case 'N':
        case 'ArrowRight':
        case ' ':
          this.deck?.next();
          break;
        case 'p':
        case 'P':
        case 'ArrowLeft':
          this.deck?.prev();
          break;
        case 'Home':
          this.deck?.slide(0);
          break;
        case 'End':
          this.deck?.slide(this.sections.length - 1);
          break;
        case 'o':
        case 'O':
          this.openOverview();
          break;
        case 'b':
        case 'B':
          this.toggleBlackout();
          break;
        case 'l':
        case 'L':
          this.togglePointer();
          break;
        case 'f':
        case 'F':
          void this.toggleFullscreen();
          break;
        case 's':
        case 'S':
          this.openSpeakerView();
          break;
        case '?':
          this.openHelp();
          break;
        default:
          return false;
      }
      return true;
    };
    if (action()) event.preventDefault();
  }

  private escape(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character]!,
    );
  }

  private isInteractive(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          'input,textarea,select,button,summary,a,[contenteditable],canvas,alk-midi,alk-media',
        ),
      )
    );
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
    this.dataset.printReady = 'true';
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
