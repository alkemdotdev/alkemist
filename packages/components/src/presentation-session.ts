/** Random per-opening channel name; available even on an insecure reading host. */
export function presentationSessionId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** Small, versioned protocol shared by local audience windows and cast receivers. */
export interface PresentationState {
  type: 'state';
  version: 1;
  session: string;
  revision: number;
  slide: number;
  fragment: number;
  blackout: boolean;
}
export type PresentationMessage =
  | PresentationState
  | {
      type: 'hello' | 'closed';
      version: 1;
      session: string;
    };

export function presentationMessage(
  value: unknown,
  session: string,
): PresentationMessage | undefined {
  if (typeof value === 'string') {
    if (value.length > 4096) return;
    try {
      value = JSON.parse(value);
    } catch {
      return;
    }
  }
  if (!value || typeof value !== 'object') return;
  const m = value as Record<string, unknown>;
  if (m.version !== 1 || m.session !== session) return;
  if (m.type === 'hello' || m.type === 'closed')
    return { type: m.type, version: 1, session };
  if (
    m.type !== 'state' ||
    !Number.isSafeInteger(m.revision) ||
    (m.revision as number) < 0 ||
    !Number.isSafeInteger(m.slide) ||
    (m.slide as number) < 0 ||
    (m.slide as number) > 10000 ||
    !Number.isSafeInteger(m.fragment) ||
    (m.fragment as number) < -1 ||
    (m.fragment as number) > 10000 ||
    typeof m.blackout !== 'boolean'
  )
    return;
  return {
    type: 'state',
    version: 1,
    session,
    revision: m.revision as number,
    slide: m.slide as number,
    fragment: m.fragment as number,
    blackout: m.blackout,
  };
}

export interface ScreenLock {
  released: boolean;
  release(): Promise<void>;
  addEventListener(
    type: 'release',
    listener: () => void,
    options?: { once: boolean },
  ): void;
}
export type AwakeState =
  'off' | 'requesting' | 'active' | 'released' | 'denied' | 'unsupported';

/** The generation guards permission requests that settle after a view is closed. */
export class DisplayAwake {
  desired = false;
  private lock?: ScreenLock;
  private generation = 0;
  private eligible = false;
  private pending = false;
  private attempted = false;
  private request: (() => Promise<ScreenLock>) | undefined;
  private changed: (state: AwakeState) => void;
  constructor(
    request: (() => Promise<ScreenLock>) | undefined,
    changed: (state: AwakeState) => void,
  ) {
    this.request = request;
    this.changed = changed;
  }
  setDesired(desired: boolean, eligible: boolean) {
    this.desired = desired;
    this.attempted = false;
    return this.update(eligible);
  }
  async update(eligible: boolean) {
    const wasEligible = this.eligible;
    this.eligible = eligible;
    if (eligible && !wasEligible) this.attempted = false;
    if (!this.request) {
      this.changed('unsupported');
      return;
    }
    if (!this.desired || !eligible) {
      this.generation++;
      this.pending = false;
      const lock = this.lock;
      this.lock = undefined;
      const generation = this.generation;
      this.changed(this.desired ? 'released' : 'off');
      if (lock && !lock.released)
        await lock.release().catch(() => {
          if (generation === this.generation) this.changed('denied');
        });
      return;
    }
    if ((this.lock && !this.lock.released) || this.pending || this.attempted)
      return;
    // A system release must not cause a request loop. Retry on visibility or explicit input.
    this.attempted = true;
    const generation = ++this.generation;
    this.pending = true;
    this.changed('requesting');
    try {
      const lock = await this.request();
      if (generation !== this.generation || !this.desired || !this.eligible) {
        await lock.release();
        return;
      }
      this.lock = lock;
      this.changed(lock.released ? 'released' : 'active');
      lock.addEventListener(
        'release',
        () => {
          if (this.lock !== lock) return;
          this.lock = undefined;
          this.changed(this.desired ? 'released' : 'off');
        },
        { once: true },
      );
    } catch {
      if (generation === this.generation) this.changed('denied');
    } finally {
      if (generation === this.generation) this.pending = false;
    }
  }
}
