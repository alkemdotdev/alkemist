import {
  DisplayAwake,
  presentationMessage,
  presentationSessionId,
  type PresentationMessage,
  type PresentationState,
} from './presentation-session';
import consoleStyle from './slides-console.css?inline';

interface DetailedScreen extends Screen {
  label?: string;
  isPrimary?: boolean;
}
interface ScreenDetails extends EventTarget {
  screens: DetailedScreen[];
  currentScreen: DetailedScreen;
}
interface CastConnection extends EventTarget {
  state: string;
  send(message: string): void;
  close(): void;
  terminate(): void;
}
interface NativeWindow extends Window {
  getScreenDetails?: () => Promise<ScreenDetails>;
  documentPictureInPicture?: {
    requestWindow(options: { width: number; height: number }): Promise<Window>;
  };
  PresentationRequest?: new (url: string) => {
    start(): Promise<CastConnection>;
  };
}
interface ReceiverNavigator extends Navigator {
  presentation?: {
    receiver?: {
      connectionList: Promise<EventTarget & { connections: CastConnection[] }>;
    };
  };
}
export interface SlidesNativeAdapter {
  root: HTMLElement;
  position(): { slide: number; fragment: number; blackout: boolean };
  apply(state: PresentationState): void;
  command(command: 'prev' | 'next' | 'blackout'): void;
  message(text: string): void;
}

/** Optional capabilities own their resources; Reveal and widget instances stay in the deck. */
export class SlidesNative {
  readonly audience: boolean;
  private win = window as NativeWindow;
  private events = new AbortController();
  private session: string;
  private channel?: BroadcastChannel;
  private audienceWindow?: Window;
  private floating?: Window;
  private cast?: CastConnection;
  private revision = 0;
  private seen = -1;
  private applied = -1;
  private generation = 0;
  private latest?: PresentationState;
  private heartbeat?: number;
  private screens?: ScreenDetails;
  private screenEvents?: AbortController;
  private wake: DisplayAwake;
  private awakeEligible = false;
  private ready = false;
  private closed = false;
  private startedAt = 0;
  private clock?: number;
  private focusReturn?: HTMLElement;
  private root: HTMLElement;

  constructor(private adapter: SlidesNativeAdapter) {
    this.root = adapter.root;
    const url = new URL(location.href);
    const receiver =
      url.searchParams.get('alkAudience') || url.searchParams.get('alkCast');
    this.audience = Boolean(receiver && /^[\w-]{16,80}$/.test(receiver));
    this.session = this.audience ? receiver! : presentationSessionId();
    this.wake = new DisplayAwake(
      navigator.wakeLock?.request
        ? () => navigator.wakeLock.request('screen')
        : undefined,
      (state) => {
        const button = this.button('awake');
        button.dataset.state = state;
        button.setAttribute('aria-pressed', String(this.wake.desired));
        button.textContent = {
          off: 'Keep display awake',
          requesting: 'Requesting display lock…',
          active: 'Display kept awake',
          released: 'Display lock paused',
          denied: 'Display lock unavailable',
          unsupported: 'Display wake lock unavailable',
        }[state];
        if (state === 'denied')
          adapter.message(
            'The browser could not keep the display awake. Check your device’s sleep settings before presenting.',
          );
      },
    );
    this.button('awake').hidden = !navigator.wakeLock?.request;
    this.button('screen').hidden =
      !this.win.getScreenDetails || !this.root.requestFullscreen;
    this.button('floating').hidden =
      !this.win.documentPictureInPicture?.requestWindow ||
      window.top !== window;
    this.button('cast').hidden =
      !this.win.PresentationRequest || this.root.dataset.casting !== 'true';
    const signal = this.events.signal;
    this.button('awake').addEventListener(
      'click',
      () => void this.wake.setDesired(!this.wake.desired, this.eligible()),
      { signal },
    );
    this.button('screen').addEventListener(
      'click',
      () => void this.chooseScreen(),
      { signal },
    );
    this.button('floating').addEventListener(
      'click',
      () => void this.openFloating(),
      { signal },
    );
    this.button('audience').addEventListener(
      'click',
      () => this.openAudience(),
      { signal },
    );
    this.button('cast').addEventListener('click', () => void this.startCast(), {
      signal,
    });
    document.addEventListener('visibilitychange', () => this.sync(), {
      signal,
    });
    window.addEventListener(
      'message',
      (event) => {
        const expected = this.audience ? window.opener : this.audienceWindow;
        if (
          !expected ||
          event.source !== expected ||
          event.origin !== location.origin
        )
          return;
        this.receive(event.data);
      },
      { signal },
    );
    this.root
      .querySelector<HTMLDialogElement>('[data-slides-screen-dialog]')!
      .addEventListener(
        'close',
        () => {
          this.focusReturn?.focus({ preventScroll: true });
        },
        { signal },
      );
    if (this.audience) {
      this.root.dataset.audience = 'true';
      this.connect();
      this.adapter.message('Waiting for the presenter…');
      if (url.searchParams.has('alkCast')) void this.connectCastReceiver();
    }
  }

  private button(name: string) {
    return this.root.querySelector<HTMLButtonElement>(`[data-slides-${name}]`)!;
  }
  private eligible() {
    return (
      !this.closed &&
      this.root.dataset.view === 'present' &&
      !document.hidden &&
      this.root.dataset.blackout !== 'true'
    );
  }
  private connect() {
    if (!this.channel && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(
          `alkemist:presentation:${this.session}`,
        );
        this.channel.onmessage = (event) => this.receive(event.data);
      } catch {
        // Direct linked windows still have the validated postMessage transport.
        this.channel = undefined;
      }
    }
    if (!this.heartbeat)
      this.heartbeat = window.setInterval(() => {
        if (this.audience) {
          if (window.opener?.closed)
            this.adapter.message(
              'The presenter window closed. This slide remains available.',
            );
          else this.send({ type: 'hello', version: 1, session: this.session });
        } else this.publish();
      }, 5000);
    if (this.audience)
      this.send({ type: 'hello', version: 1, session: this.session });
  }
  private send(message: PresentationMessage) {
    this.channel?.postMessage(message);
    const target = this.audience ? window.opener : this.audienceWindow;
    if (target && !target.closed) target.postMessage(message, location.origin);
    if (this.cast?.state === 'connected') {
      try {
        this.cast.send(JSON.stringify(message));
      } catch {
        this.adapter.message(
          'The receiver connection was interrupted. The local presentation is still available.',
        );
      }
    }
  }
  private receive(raw: unknown) {
    const message = presentationMessage(raw, this.session);
    if (!message) return;
    if (!this.audience) {
      if (message.type === 'hello') this.publish();
      return;
    }
    if (message.type === 'closed') {
      if (this.latest) {
        this.latest = { ...this.latest, blackout: false };
        if (this.ready) this.adapter.apply(this.latest);
      }
      this.adapter.message(
        'The presenter ended this session. This slide remains available.',
      );
    } else if (message.type === 'state' && message.revision > this.seen) {
      this.seen = message.revision;
      this.latest = message;
      if (this.ready) {
        this.applied = message.revision;
        this.adapter.apply(message);
      }
      this.adapter.message('');
    }
  }
  private publish() {
    if (this.audience || this.closed || !this.ready) return;
    this.send({
      type: 'state',
      version: 1,
      session: this.session,
      revision: ++this.revision,
      ...this.adapter.position(),
    });
  }
  sync() {
    this.ready =
      this.root.dataset.ready === 'true' &&
      this.root.dataset.view === 'present';
    const eligible = this.eligible();
    if (eligible !== this.awakeEligible) {
      this.awakeEligible = eligible;
      void this.wake.update(eligible);
    }
    for (const name of ['screen', 'floating', 'audience', 'cast'])
      this.button(name).disabled =
        !this.ready || this.root.dataset.embedded === 'true';
    if (
      this.audience &&
      this.latest &&
      this.ready &&
      this.applied < this.latest.revision
    ) {
      this.applied = this.latest.revision;
      this.adapter.apply(this.latest);
    }
    this.publish();
    this.renderFloating();
  }
  private openAudience() {
    if (this.audienceWindow && !this.audienceWindow.closed) {
      this.audienceWindow.focus();
      return;
    }
    this.connect();
    const url = new URL(location.href);
    url.searchParams.delete('receiver');
    url.searchParams.set('alkAudience', this.session);
    this.audienceWindow =
      window.open(
        url.href,
        `alkemist-audience-${this.session}`,
        'popup,width=1280,height=800',
      ) ?? undefined;
    if (!this.audienceWindow)
      this.adapter.message(
        'The audience window was blocked. Allow pop-ups for this site and try again.',
      );
    else
      this.adapter.message(
        'Audience window opened. Move it to your display; use its Fullscreen button there.',
      );
  }

  private async chooseScreen() {
    if (!this.win.getScreenDetails) return;
    this.focusReturn = this.button('screen');
    const generation = this.generation;
    this.screenEvents?.abort();
    this.screenEvents = new AbortController();
    try {
      this.screens = await this.win.getScreenDetails();
      if (
        generation !== this.generation ||
        this.closed ||
        !this.root.isConnected
      )
        return;
      const dialog = this.root.querySelector<HTMLDialogElement>(
        '[data-slides-screen-dialog]',
      )!;
      const render = () => {
        const list = dialog.querySelector('[data-slides-screens]')!;
        list.replaceChildren();
        this.screens!.screens.forEach((screen, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${screen.label || `Display ${index + 1}`} · ${screen.width} × ${screen.height}${screen === this.screens!.currentScreen ? ' · current' : ''}`;
          button.addEventListener('click', async () => {
            if (!this.screens!.screens.includes(screen)) {
              render();
              return;
            }
            dialog.close();
            try {
              await this.root.requestFullscreen({
                screen,
              } as FullscreenOptions);
              this.adapter.message(
                'Presentation is fullscreen. Press Escape to return.',
              );
            } catch {
              this.adapter.message(
                'The browser could not use that display. Move this window to it and use Fullscreen.',
              );
            }
          });
          list.append(button);
        });
      };
      render();
      this.screens.addEventListener('screenschange', render, {
        signal: this.screenEvents.signal,
      });
      if (!dialog.open) dialog.showModal();
    } catch {
      this.adapter.message(
        'Display access was not granted. Move the audience window to your display and use Fullscreen.',
      );
    }
  }

  private async openFloating() {
    if (this.floating && !this.floating.closed) {
      this.floating.focus();
      return;
    }
    const generation = this.generation;
    try {
      const view = await this.win.documentPictureInPicture!.requestWindow({
        width: 460,
        height: 560,
      });
      if (
        generation !== this.generation ||
        this.closed ||
        !this.root.isConnected
      ) {
        view.close();
        return;
      }
      this.floating = view;
      this.startedAt = performance.now();
      view.document.title = `${this.root.getAttribute('aria-label')} — speaker notes`;
      const style = view.document.createElement('style');
      style.textContent = consoleStyle;
      view.document.head.append(style);
      const computed = getComputedStyle(this.root);
      for (const token of [
        'paper',
        'ink',
        'muted',
        'rule',
        'field',
        'accent',
        'sans',
        'mono',
      ]) {
        const value = computed.getPropertyValue(`--alk-${token}`);
        if (value)
          view.document.documentElement.style.setProperty(
            `--alk-${token}`,
            value,
          );
      }
      view.document.body.innerHTML =
        '<main class="alk-speaker"><header><span data-floating-count></span><output data-floating-clock aria-label="Elapsed time">0:00</output></header><h1 data-floating-title></h1><div data-floating-notes></div><aside><h2>Up next</h2><p data-floating-next></p></aside><nav aria-label="Presentation controls"><button data-command="prev">Previous</button><button data-command="next">Next</button><button data-command="blackout" aria-pressed="false">Blackout</button><button data-command="return">Return to deck</button></nav><p class="alk-speaker-hint">Speaker notes stay in this window. Interactive figures stay in the deck.</p></main>';
      view.document
        .querySelectorAll<HTMLButtonElement>('[data-command]')
        .forEach((button) => {
          button.addEventListener('click', () => {
            const command = button.dataset.command;
            if (command === 'return') {
              window.focus();
              return;
            }
            if (
              command === 'prev' ||
              command === 'next' ||
              command === 'blackout'
            )
              this.adapter.command(command);
          });
        });
      this.clock = window.setInterval(() => this.renderFloating(), 1000);
      view.addEventListener(
        'pagehide',
        () => {
          if (this.clock) clearInterval(this.clock);
          this.clock = undefined;
          this.floating = undefined;
          this.button('floating').setAttribute('aria-pressed', 'false');
          this.button('floating').focus({ preventScroll: true });
        },
        { once: true },
      );
      this.button('floating').setAttribute('aria-pressed', 'true');
      this.renderFloating();
    } catch {
      this.adapter.message(
        'Floating speaker notes could not open. Use Speaker view for a regular presenter window.',
      );
    }
  }
  private renderFloating() {
    const view = this.floating;
    if (!view || view.closed) return;
    const sections = Array.from(
      this.root.querySelectorAll<HTMLElement>('.slides > [data-alk-slide]'),
    );
    const { slide, blackout } = this.adapter.position();
    const title = (index: number) =>
      sections[index]?.querySelector('h1,h2,h3')?.textContent?.trim() ||
      (index < sections.length ? `Slide ${index + 1}` : 'End of presentation');
    const set = (selector: string, text: string) => {
      view.document.querySelector(selector)!.textContent = text;
    };
    set('[data-floating-title]', title(slide));
    set('[data-floating-count]', `${slide + 1} / ${sections.length}`);
    set('[data-floating-next]', title(slide + 1));
    set(
      '[data-floating-notes]',
      Array.from(sections[slide]?.querySelectorAll('.notes') ?? [])
        .map((note) => note.textContent?.trim())
        .join('\n\n') || 'No speaker notes on this slide.',
    );
    const seconds = Math.floor((performance.now() - this.startedAt) / 1000);
    set(
      '[data-floating-clock]',
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    );
    view.document
      .querySelector('[data-command="blackout"]')!
      .setAttribute('aria-pressed', String(blackout));
  }

  private async startCast() {
    if (this.cast && this.cast.state === 'connected') {
      this.cast.terminate();
      return;
    }
    const generation = this.generation;
    try {
      const url = new URL(location.href);
      url.searchParams.set('alkCast', this.session);
      url.searchParams.delete('receiver');
      const connection = await new this.win.PresentationRequest!(
        url.href,
      ).start();
      if (this.closed || generation !== this.generation) {
        connection.close();
        return;
      }
      this.attachCast(connection);
      this.adapter.message(
        'Receiver connected. Slide navigation follows this deck; interactive figure controls remain local to each display.',
      );
    } catch {
      this.adapter.message(
        'No receiver connected. Casting may be unavailable or was cancelled. You can use Audience window instead.',
      );
    }
  }
  private attachCast(connection: CastConnection) {
    this.cast = connection;
    const connected = () => {
      this.button('cast').textContent = 'Stop casting';
      this.publish();
      if (this.audience)
        this.send({ type: 'hello', version: 1, session: this.session });
    };
    connection.addEventListener('connect', connected, {
      signal: this.events.signal,
    });
    connection.addEventListener(
      'message',
      (event) => this.receive((event as MessageEvent).data),
      { signal: this.events.signal },
    );
    for (const event of ['close', 'terminate'])
      connection.addEventListener(
        event,
        () => {
          if (this.cast !== connection) return;
          this.cast = undefined;
          this.button('cast').textContent = 'Cast to a receiver';
          if (this.audience && this.latest) {
            this.latest = { ...this.latest, blackout: false };
            if (this.ready) this.adapter.apply(this.latest);
          }
          this.adapter.message(
            'Receiver disconnected. The local presentation is still available.',
          );
        },
        { signal: this.events.signal },
      );
    if (connection.state === 'connected') connected();
  }
  private async connectCastReceiver() {
    const receiver = (navigator as ReceiverNavigator).presentation?.receiver;
    if (!receiver) {
      this.adapter.message(
        'This browser is not running as a presentation receiver. Open the original deck to present locally.',
      );
      return;
    }
    const generation = this.generation;
    try {
      const list = await receiver.connectionList;
      if (this.closed || generation !== this.generation) return;
      list.connections.forEach((connection) => this.attachCast(connection));
      list.addEventListener(
        'connectionavailable',
        (event) =>
          this.attachCast(
            (event as Event & { connection: CastConnection }).connection,
          ),
        { signal: this.events.signal },
      );
    } catch {
      this.adapter.message('The receiver connection is unavailable.');
    }
  }
  suspend() {
    this.generation++;
    this.screenEvents?.abort();
    this.screenEvents = undefined;
    this.screens = undefined;
    this.root
      .querySelector<HTMLDialogElement>('[data-slides-screen-dialog]')
      ?.close();
    if (!this.audience)
      this.send({ type: 'closed', version: 1, session: this.session });
    this.closed = true;
    this.ready = false;
    this.awakeEligible = false;
    void this.wake.update(false);
    this.floating?.close();
    this.floating = undefined;
    if (this.clock) clearInterval(this.clock);
    this.clock = undefined;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.channel?.close();
    this.channel = undefined;
    this.cast?.close();
    this.cast = undefined;
    this.button('cast').textContent = 'Cast to a receiver';
  }
  resume() {
    this.closed = false;
    if (this.audience || (this.audienceWindow && !this.audienceWindow.closed))
      this.connect();
    this.sync();
  }
  destroy() {
    this.suspend();
    this.events.abort();
  }
}
