import { createMidiEngine, type MusicEngine } from './midi-engine';
import {
  exportMidi,
  getMidiPreset,
  importMidi,
  noteName,
  sequenceDuration,
  validateSequence,
  type MidiNote,
  type MidiSequence,
  type MusicVoice,
} from './midi-model';

type Config = {
  preset?: 'nocturne' | 'pulse' | 'bassline' | 'ensemble';
  sequence: MidiSequence;
  src: string;
  voice: MusicVoice | 'track';
  editable: boolean;
  loop: boolean;
  volume: number;
  tempo: number;
};
const beatWidth = 32;
const rowHeight = 16;
const keyboardGutter = 44;
const snapValues = [0.25, 0.5, 1] as const;
const copy = <T>(value: T): T => structuredClone(value);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const blackKey = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);

class MidiElement extends HTMLElement {
  private config!: Config;
  private sequence!: MidiSequence;
  private engine?: MusicEngine;
  private enginePromise?: Promise<MusicEngine>;
  private observer?: IntersectionObserver;
  private events = new AbortController();
  private sourceLoad?: AbortController;
  private history: MidiSequence[] = [];
  private future: MidiSequence[] = [];
  private selected?: { track: string; note: string };
  private activeTrack?: string;
  private playing = false;
  private playBeat = 0;
  private playEpoch = 0;
  private loadEpoch = 0;
  private original!: MidiSequence;
  private connectionEpoch = 0;
  private snap: (typeof snapValues)[number] = 0.25;
  private drag?: {
    track: string;
    note: string;
    start: number;
    pitch: number;
    originalStart: number;
    originalPitch: number;
    clientX: number;
    clientY: number;
  };

  connectedCallback() {
    if (this.config && !this.events.signal.aborted) return;
    if (this.events.signal.aborted) this.events = new AbortController();
    try {
      this.config = JSON.parse(this.dataset.config ?? '{}') as Config;
      this.sequence = validateSequence(this.config.sequence);
      if (this.config.tempo) this.sequence.bpm = this.config.tempo;
      if (this.config.voice !== 'track') {
        const voice = this.config.voice;
        this.sequence.tracks.forEach((track) => {
          track.voice = voice;
        });
      }
      this.config.tempo = 0;
      this.config.voice = 'track';
      this.original = copy(this.sequence);
      this.activeTrack ??= this.sequence.tracks[0]?.id;
    } catch (error) {
      this.fail(
        error instanceof Error ? error.message : 'Invalid MIDI sequence.',
      );
      return;
    }
    this.observe();
  }

  disconnectedCallback() {
    this.sourceLoad?.abort();
    this.observer?.disconnect();
    this.events.abort();
    delete this.dataset.ready;
    this.loadEpoch++;
    this.connectionEpoch++;
    this.stop();
    void this.engine?.dispose();
    this.engine = undefined;
    this.enginePromise = undefined;
  }

  private observe() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void this.ready();
      },
      { rootMargin: '180px' },
    );
    this.observer.observe(this);
  }

  private async ready() {
    this.observer?.disconnect();
    this.observer = undefined;
    if (!this.isConnected || this.dataset.ready === 'true') return;
    this.render();
    this.bind();
    this.dataset.ready = 'true';
    this.status('Ready. Select a note or press Play.');
    if (this.config.src) await this.loadSource(this.config.src);
  }

  private async audio() {
    if (this.engine) return this.engine;
    const epoch = this.connectionEpoch;
    this.enginePromise ??= createMidiEngine();
    try {
      const engine = await this.enginePromise;
      if (!this.isConnected || epoch !== this.connectionEpoch) {
        engine.dispose();
        throw new Error('The MIDI player was removed.');
      }
      this.engine = engine;
      return engine;
    } catch (error) {
      if (epoch === this.connectionEpoch) this.enginePromise = undefined;
      throw error;
    }
  }

  private status(message: string) {
    const output = this.querySelector<HTMLOutputElement>('.alk-midi-status');
    if (output) output.value = output.textContent = message;
  }

  private fail(message: string) {
    this.dataset.state = 'error';
    this.status(message);
    this.dispatchEvent(
      new CustomEvent('alk:midi:error', { bubbles: true, detail: { message } }),
    );
  }

  private mutate(change: (sequence: MidiSequence) => void) {
    const before = copy(this.sequence);
    try {
      const next = copy(this.sequence);
      change(next);
      this.sequence = validateSequence(next);
      const wasPlaying = this.playing;
      this.halt(false);
      this.history.push(before);
      this.history = this.history.slice(-80);
      this.future = [];
      this.emit();
      this.render();
      this.dataset.state = 'idle';
      this.status('Notes updated.');
      if (wasPlaying) void this.play();
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'MIDI edit failed.');
    }
  }

  private emit() {
    this.dispatchEvent(
      new CustomEvent('alk:midi:change', {
        bubbles: true,
        detail: { sequence: this.effectiveSequence() },
      }),
    );
  }

  private effectiveSequence() {
    return copy(this.sequence);
  }

  private selectedNote() {
    if (!this.selected) return undefined;
    const track = this.sequence.tracks.find(
      (item) => item.id === this.selected!.track,
    );
    const note = track?.notes.find((item) => item.id === this.selected!.note);
    return track && note ? { track, note } : undefined;
  }

  private pitchRange() {
    const track =
      this.sequence.tracks.find((track) => track.id === this.activeTrack) ??
      this.sequence.tracks[0];
    const pitches = track.notes.map((note) => note.pitch);
    let low = Math.max(0, Math.min(...(pitches.length ? pitches : [60])) - 2);
    let high = Math.min(
      127,
      Math.max(...(pitches.length ? pitches : [72])) + 2,
    );
    if (high - low < 11) {
      low = Math.max(0, Math.min(low, high - 11));
      high = Math.min(127, Math.max(high, low + 11));
    }
    return { low, high };
  }

  private render() {
    const tempo = this.querySelector<HTMLInputElement>('[data-midi-tempo]');
    if (tempo) tempo.value = String(Number(this.sequence.bpm.toFixed(2)));
    const preset = this.querySelector<HTMLSelectElement>('[data-midi-preset]');
    if (preset) preset.value = this.config.preset ?? '';
    const seek = this.querySelector<HTMLInputElement>('[data-midi-seek]');
    if (seek) seek.max = String(Math.max(1, sequenceDuration(this.sequence)));
    const tracks = this.querySelector<HTMLElement>('.alk-midi-tracks');
    const roll = this.querySelector<HTMLElement>('.alk-midi-roll');
    const ruler = this.querySelector<HTMLElement>('.alk-midi-ruler');
    if (!tracks || !roll || !ruler) return;
    const beats = Math.max(8, Math.ceil(sequenceDuration(this.sequence)) + 2);
    const range = this.pitchRange();
    roll.style.width = `${keyboardGutter + beats * beatWidth}px`;
    roll.style.height = `${(range.high - range.low + 1) * rowHeight}px`;
    ruler.style.width = `${keyboardGutter + beats * beatWidth}px`;
    ruler.style.paddingLeft = `${keyboardGutter}px`;
    ruler.innerHTML = Array.from(
      { length: beats + 1 },
      (_, beat) =>
        `<span style="left:${beat * beatWidth}px">${beat + 1}</span>`,
    ).join('');
    tracks.innerHTML = this.sequence.tracks
      .map(
        (
          track,
        ) => `<div class="alk-midi-track" data-active="${this.activeTrack === track.id}" data-voice="${track.voice}">
          <button type="button" data-midi-track="${this.escape(track.id)}">${this.escape(track.name)}</button>
          <button type="button" data-midi-mute="${this.escape(track.id)}" aria-label="Mute ${this.escape(track.name)}" aria-pressed="${track.muted}">${track.muted ? 'Muted' : 'Mute'}</button>
          <select aria-label="${this.escape(track.name)} voice" data-midi-track-voice="${this.escape(track.id)}"><option value="piano" ${track.voice === 'piano' ? 'selected' : ''}>Pno</option><option value="supersaw" ${track.voice === 'supersaw' ? 'selected' : ''}>Saw</option><option value="bass" ${track.voice === 'bass' ? 'selected' : ''}>Bass</option></select>
        </div>`,
      )
      .join('');
    const keys = Array.from(
      { length: range.high - range.low + 1 },
      (_, index) => {
        const pitch = range.high - index;
        return `<button class="alk-midi-key" style="top:${index * rowHeight + rowHeight / 2}px" data-midi-key="${pitch}" data-black="${blackKey(pitch)}">${noteName(pitch)}</button>`;
      },
    ).join('');
    const notes = this.sequence.tracks
      .flatMap((track) =>
        track.notes.map((note) => {
          const selected =
            this.selected?.note === note.id && this.selected.track === track.id;
          if (note.pitch < range.low || note.pitch > range.high) return '';
          return `<button type="button" class="alk-midi-note" data-midi-note-track="${this.escape(track.id)}" data-midi-note-id="${this.escape(note.id)}" data-selected="${selected}" data-muted="${track.muted}" data-ghost="${track.id !== this.activeTrack}" data-voice="${track.voice}" style="left:${keyboardGutter + note.start * beatWidth}px;top:${(range.high - note.pitch) * rowHeight}px;width:${Math.max(10, note.duration * beatWidth - 2)}px;height:${rowHeight - 2}px" title="${this.escape(track.name)} ${noteName(note.pitch)}">${noteName(note.pitch)}</button>`;
        }),
      )
      .join('');
    roll.innerHTML = `${keys}${notes}<i class="alk-midi-playhead" style="left:${keyboardGutter + this.playBeat * beatWidth}px"></i>`;
    this.renderInspector();
    this.updatePosition();
  }

  private renderInspector() {
    const inspector = this.querySelector<HTMLElement>('.alk-midi-inspector');
    const selected = this.selectedNote();
    if (!inspector) return;
    if (!this.config.editable) {
      inspector.hidden = true;
      return;
    }
    const history = `<label>Snap<select data-midi-snap>${snapValues.map((value) => `<option value="${value}" ${value === this.snap ? 'selected' : ''}>1/${4 / value}</option>`).join('')}</select></label><button type="button" data-midi-undo ${this.history.length ? '' : 'disabled'}>Undo</button><button type="button" data-midi-redo ${this.future.length ? '' : 'disabled'}>Redo</button><button type="button" data-midi-reset>Reset</button>`;
    if (!selected) {
      inspector.hidden = false;
      inspector.innerHTML = history;
      return;
    }
    const { note } = selected;
    inspector.hidden = false;
    const disabled = this.config.editable ? '' : 'disabled';
    inspector.innerHTML = `<label>Pitch<input data-midi-field="pitch" type="number" min="0" max="127" value="${note.pitch}" ${disabled}></label><label>Start<input data-midi-field="start" type="number" min="0" step="${this.snap}" value="${note.start}" ${disabled}></label><label>Duration<input data-midi-field="duration" type="number" min="${this.snap}" step="${this.snap}" value="${note.duration}" ${disabled}></label><label>Velocity<input data-midi-field="velocity" type="number" min="0" max="1" step="0.01" value="${note.velocity}" ${disabled}></label><button type="button" data-midi-duplicate ${disabled}>Duplicate</button><button type="button" data-midi-delete ${disabled}>Delete</button>${history}`;
  }

  private bind() {
    const signal = this.events.signal;
    this.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement
    >(
      '.alk-midi-toolbar button,.alk-midi-toolbar input,.alk-midi-toolbar select,[data-midi-seek]',
    ).forEach((control) => {
      control.disabled = false;
    });
    const importButton =
      this.querySelector<HTMLButtonElement>('[data-midi-import]');
    if (importButton) importButton.hidden = !this.config.editable;
    this.updatePosition();
    const preset = this.querySelector<HTMLSelectElement>('[data-midi-preset]')!;
    const voice = this.querySelector<HTMLSelectElement>('[data-midi-voice]')!;
    preset.value = this.config.preset ?? '';
    voice.value = this.config.voice;
    this.querySelector('[data-midi-play]')?.addEventListener(
      'click',
      () => void this.play(),
      { signal },
    );
    this.querySelector('[data-midi-stop]')?.addEventListener(
      'click',
      () => this.stop(),
      { signal },
    );
    this.querySelector('[data-midi-volume]')?.addEventListener(
      'input',
      (event) => {
        this.config.volume = Number((event.target as HTMLInputElement).value);
        this.engine?.setVolume(this.config.volume);
        this.dispatchEvent(
          new CustomEvent('alk:midi:settings', {
            bubbles: true,
            detail: { volume: this.config.volume },
          }),
        );
      },
      { signal },
    );
    this.querySelector('[data-midi-seek]')?.addEventListener(
      'input',
      (event) => {
        const wasPlaying = this.playing;
        this.halt(false);
        this.playBeat = Number((event.target as HTMLInputElement).value);
        this.updatePosition();
        if (wasPlaying) void this.play();
      },
      { signal },
    );
    this.querySelector('[data-midi-tempo]')?.addEventListener(
      'change',
      (event) =>
        this.mutate((sequence) => {
          sequence.bpm = clamp(
            Number((event.target as HTMLInputElement).value),
            30,
            240,
          );
        }),
      { signal },
    );
    this.querySelector('[data-midi-loop]')?.addEventListener(
      'change',
      (event) => {
        this.config.loop = (event.target as HTMLInputElement).checked;
        this.dispatchEvent(
          new CustomEvent('alk:midi:settings', {
            bubbles: true,
            detail: { loop: this.config.loop },
          }),
        );
        if (this.playing) {
          this.halt(false);
          void this.play();
        }
      },
      { signal },
    );
    preset.addEventListener(
      'change',
      () => {
        this.sourceLoad?.abort();
        this.loadEpoch++;
        this.stop();
        this.sequence = getMidiPreset(
          preset.value as NonNullable<Config['preset']>,
        );
        this.config.preset = preset.value as Config['preset'];
        this.original = copy(this.sequence);
        this.activeTrack = this.sequence.tracks[0]?.id;
        this.config.tempo = 0;
        this.history = [];
        this.future = [];
        this.selected = undefined;
        if (this.playing) this.stop();
        this.emit();
        this.render();
      },
      { signal },
    );
    voice.addEventListener(
      'change',
      () => {
        if (voice.value !== 'track')
          this.mutate((sequence) => {
            sequence.tracks.forEach((track) => {
              track.voice = voice.value as MusicVoice;
            });
          });
      },
      { signal },
    );
    this.querySelector('[data-midi-import]')?.addEventListener(
      'click',
      () => this.querySelector<HTMLInputElement>('[data-midi-file]')?.click(),
      { signal },
    );
    this.querySelector('[data-midi-file]')?.addEventListener(
      'change',
      (event) =>
        void this.importFile((event.target as HTMLInputElement).files?.[0]),
      { signal },
    );
    this.querySelector('[data-midi-export]')?.addEventListener(
      'click',
      () => void this.download(),
      { signal },
    );
    this.addEventListener('click', (event) => this.handleClick(event), {
      signal,
    });
    this.addEventListener('change', (event) => this.change(event), { signal });
    const roll = this.querySelector<HTMLElement>('.alk-midi-roll');
    roll?.addEventListener(
      'pointerdown',
      (event) => this.pointerDown(event as PointerEvent),
      { signal },
    );
    roll?.addEventListener('pointermove', (event) => this.pointerMove(event), {
      signal,
    });
    roll?.addEventListener('pointerup', () => this.commitDrag(), { signal });
    roll?.addEventListener('pointercancel', () => this.cancelDrag(), {
      signal,
    });
    this.addEventListener('keydown', (event) => this.keydown(event), {
      signal,
    });
    this.tabIndex = 0;
  }

  private handleClick(event: Event) {
    const target = event.target as HTMLElement;
    const note = target.closest<HTMLElement>('[data-midi-note-id]');
    if (note) {
      const track = note.dataset.midiNoteTrack!;
      const id = note.dataset.midiNoteId!;
      this.selected = { track, note: id };
      this.render();
      return;
    }
    const mute =
      target.closest<HTMLElement>('[data-midi-mute]')?.dataset.midiMute;
    if (mute)
      this.mutate((sequence) => {
        const track = sequence.tracks.find((item) => item.id === mute);
        if (track) track.muted = !track.muted;
      });
    const track =
      target.closest<HTMLElement>('[data-midi-track]')?.dataset.midiTrack;
    if (track) {
      this.activeTrack = track;
      this.render();
    }
    if (target.closest('[data-midi-delete]')) this.deleteSelected();
    if (target.closest('[data-midi-duplicate]')) this.duplicateSelected();
    if (target.closest('[data-midi-undo]')) this.undo();
    if (target.closest('[data-midi-redo]')) this.redo();
    if (target.closest('[data-midi-reset]')) {
      this.stop();
      this.sequence = copy(this.original);
      this.history = [];
      this.future = [];
      this.selected = undefined;
      this.emit();
      this.render();
    }
    const pitch =
      target.closest<HTMLElement>('[data-midi-key]')?.dataset.midiKey;
    if (pitch)
      void this.audio()
        .then((engine) =>
          engine.audition(
            Number(pitch),
            this.sequence.tracks.find((track) => track.id === this.activeTrack)
              ?.voice ?? 'piano',
          ),
        )
        .catch((error) => {
          if (this.isConnected) this.fail(String(error));
        });
  }

  private change(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const field = target.dataset.midiField as keyof MidiNote | undefined;
    const selected = this.selectedNote();
    if (field && selected) {
      const value = Number(target.value);
      this.mutate((sequence) => {
        const note = sequence.tracks
          .find((track) => track.id === selected.track.id)
          ?.notes.find((note) => note.id === selected.note.id);
        if (!note) return;
        if (field === 'pitch') note.pitch = clamp(Math.round(value), 0, 127);
        if (field === 'start') note.start = Math.max(0, value);
        if (field === 'duration') note.duration = Math.max(this.snap, value);
        if (field === 'velocity') note.velocity = clamp(value, 0, 1);
      });
      return;
    }
    if ('midiSnap' in target.dataset) {
      this.snap = Number(target.value) as typeof this.snap;
      this.renderInspector();
      return;
    }
    const trackId = target.dataset.midiTrackVoice;
    if (trackId)
      this.mutate((sequence) => {
        const track = sequence.tracks.find((item) => item.id === trackId);
        if (track) track.voice = target.value as MusicVoice;
      });
  }

  private pointerDown(event: PointerEvent) {
    const roll = event.currentTarget as HTMLElement;
    const noteElement = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-midi-note-id]',
    );
    if (noteElement && this.config.editable) {
      const track = noteElement.dataset.midiNoteTrack!;
      const id = noteElement.dataset.midiNoteId!;
      const note = this.sequence.tracks
        .find((item) => item.id === track)
        ?.notes.find((item) => item.id === id);
      if (note) {
        roll.setPointerCapture(event.pointerId);
        this.drag = {
          track,
          note: id,
          start: note.start,
          pitch: note.pitch,
          originalStart: note.start,
          originalPitch: note.pitch,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      }
      return;
    }
    if (!this.config.editable || event.target !== roll) return;
    const rect = roll.getBoundingClientRect();
    const range = this.pitchRange();
    const pitch = clamp(
      range.high - Math.floor((event.clientY - rect.top) / rowHeight),
      range.low,
      range.high,
    );
    const start = Math.max(
      0,
      Math.round(
        (event.clientX - rect.left - keyboardGutter) / beatWidth / this.snap,
      ) * this.snap,
    );
    const track =
      this.sequence.tracks.find((item) => item.id === this.activeTrack) ??
      this.sequence.tracks.find((item) => !item.muted) ??
      this.sequence.tracks[0];
    if (!track) return;
    const id = crypto.randomUUID();
    this.mutate((sequence) =>
      sequence.tracks
        .find((item) => item.id === track.id)!
        .notes.push({ id, pitch, start, duration: this.snap, velocity: 0.75 }),
    );
    this.selected = { track: track.id, note: id };
    this.render();
  }

  private pointerMove(event: PointerEvent) {
    if (!this.drag || !this.config.editable) return;
    const roll = this.querySelector<HTMLElement>('.alk-midi-roll');
    if (!roll) return;
    const rect = roll.getBoundingClientRect();
    const start = Math.max(
      0,
      this.drag.originalStart +
        Math.round(
          (event.clientX - this.drag.clientX) / beatWidth / this.snap,
        ) *
          this.snap,
    );
    const range = this.pitchRange();
    const pitch = clamp(
      this.drag.originalPitch -
        Math.round((event.clientY - this.drag.clientY) / rowHeight),
      0,
      127,
    );
    const active = this.drag;
    const element = roll.querySelector<HTMLElement>(
      `[data-midi-note-id="${CSS.escape(active.note)}"]`,
    );
    if (element) {
      element.style.left = `${keyboardGutter + start * beatWidth}px`;
      element.style.top = `${(range.high - pitch) * rowHeight}px`;
    }
    this.drag = { ...active, start, pitch };
  }

  private commitDrag() {
    const drag = this.drag;
    this.drag = undefined;
    if (!drag) return;
    this.selected = { track: drag.track, note: drag.note };
    if (
      drag.start === drag.originalStart &&
      drag.pitch === drag.originalPitch
    ) {
      this.render();
      this.focus({ preventScroll: true });
      return;
    }
    this.mutate((sequence) => {
      const note = sequence.tracks
        .find((track) => track.id === drag.track)
        ?.notes.find((note) => note.id === drag.note);
      if (note) {
        note.start = drag.start;
        note.pitch = drag.pitch;
      }
    });
    this.selected = { track: drag.track, note: drag.note };
    this.render();
    this.focus({ preventScroll: true });
  }

  private cancelDrag() {
    const drag = this.drag;
    this.drag = undefined;
    if (drag) this.render();
  }

  private keydown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    )
      return;
    if (!this.config.editable) return;
    const selected = this.selectedNote();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (!selected) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteSelected();
      return;
    }
    const changes: Partial<MidiNote> = {};
    if (event.key === 'ArrowUp')
      changes.pitch = clamp(selected.note.pitch + 1, 0, 127);
    if (event.key === 'ArrowDown')
      changes.pitch = clamp(selected.note.pitch - 1, 0, 127);
    if (event.key === 'ArrowLeft')
      changes.start = Math.max(0, selected.note.start - this.snap);
    if (event.key === 'ArrowRight')
      changes.start = selected.note.start + this.snap;
    if (Object.keys(changes).length) {
      event.preventDefault();
      this.mutate((sequence) =>
        Object.assign(
          sequence.tracks
            .find((item) => item.id === selected.track.id)!
            .notes.find((item) => item.id === selected.note.id)!,
          changes,
        ),
      );
    }
  }

  private deleteSelected() {
    const selected = this.selected;
    if (!selected) return;
    this.mutate((sequence) => {
      const track = sequence.tracks.find((item) => item.id === selected.track);
      if (track)
        track.notes = track.notes.filter((note) => note.id !== selected.note);
    });
    this.selected = undefined;
  }

  private duplicateSelected() {
    const selected = this.selectedNote();
    if (!selected) return;
    const id = crypto.randomUUID();
    this.mutate((sequence) =>
      sequence.tracks
        .find((item) => item.id === selected.track.id)!
        .notes.push({
          ...selected.note,
          id,
          start: selected.note.start + selected.note.duration,
        }),
    );
    this.selected = { track: selected.track.id, note: id };
  }

  private undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.stop();
    this.future.push(copy(this.sequence));
    this.sequence = previous;
    this.selected = undefined;
    this.emit();
    this.render();
  }
  private redo() {
    const next = this.future.pop();
    if (!next) return;
    this.stop();
    this.history.push(copy(this.sequence));
    this.sequence = next;
    this.selected = undefined;
    this.emit();
    this.render();
  }

  private async play() {
    if (this.playing) {
      this.halt(false);
      return;
    }
    this.playing = true;
    const request = ++this.playEpoch;
    if (this.playBeat >= sequenceDuration(this.sequence)) this.playBeat = 0;
    const epoch = this.connectionEpoch;
    const play = this.querySelector<HTMLButtonElement>('[data-midi-play]');
    if (play) play.textContent = 'Pause';
    try {
      const engine = await this.audio();
      if (
        !this.playing ||
        request !== this.playEpoch ||
        epoch !== this.connectionEpoch ||
        !this.isConnected
      ) {
        return;
      }
      const options = {
        beat: this.playBeat,
        loop: this.config.loop,
        volume: Number(
          this.querySelector<HTMLInputElement>('[data-midi-volume]')?.value ??
            this.config.volume,
        ),
        onBeat: (beat: number) => {
          this.playBeat = beat;
          this.updatePosition();
        },
        onEnded: () => this.stop(),
        onError: (message: string) => {
          this.stop();
          this.fail(message);
        },
      };
      await engine.play(this.effectiveSequence(), options);
      if (request === this.playEpoch && this.playing) {
        this.dataset.state = 'playing';
        this.status('Playing.');
      }
    } catch (error) {
      if (request !== this.playEpoch || epoch !== this.connectionEpoch) return;
      this.stop();
      this.fail(
        error instanceof Error ? error.message : 'Audio playback failed.',
      );
    }
  }

  private stop() {
    this.halt(true);
  }

  private halt(reset: boolean) {
    this.playEpoch++;
    this.engine?.stop();
    this.playing = false;
    if (reset) this.playBeat = 0;
    const play = this.querySelector<HTMLButtonElement>('[data-midi-play]');
    if (play) play.textContent = 'Play';
    this.updatePosition();
    this.dataset.state = 'idle';
    this.status(reset ? 'Stopped.' : 'Paused.');
  }

  private updatePosition() {
    const line = this.querySelector<HTMLElement>('.alk-midi-playhead');
    if (line)
      line.style.left = `${keyboardGutter + this.playBeat * beatWidth}px`;
    const seek = this.querySelector<HTMLInputElement>('[data-midi-seek]');
    if (seek && document.activeElement !== seek)
      seek.value = String(this.playBeat);
    const position = this.querySelector<HTMLOutputElement>(
      '[data-midi-position]',
    );
    if (position)
      position.textContent = `${this.playBeat.toFixed(1)} / ${sequenceDuration(this.sequence).toFixed(1)} beats`;
  }

  private async importFile(file?: File) {
    if (!file || !this.config.editable) return;
    const request = ++this.loadEpoch;
    this.sourceLoad?.abort();
    const epoch = this.connectionEpoch;
    try {
      if (file.size > 4 * 1024 * 1024)
        throw new Error('MIDI files must be no larger than 4 MiB.');
      const { sequence, warnings } = await importMidi(await file.arrayBuffer());
      if (
        !this.isConnected ||
        epoch !== this.connectionEpoch ||
        request !== this.loadEpoch
      )
        return;
      this.stop();
      this.original = copy(sequence);
      this.config.preset = undefined;
      this.activeTrack = sequence.tracks[0]?.id;
      this.history.push(copy(this.sequence));
      this.sequence = validateSequence(sequence);
      this.future = [];
      this.selected = undefined;
      this.emit();
      this.render();
      this.status(
        warnings.length
          ? `Imported with notes: ${warnings.join(' ')}`
          : `Imported ${file.name}.`,
      );
    } catch (error) {
      if (!this.isConnected || request !== this.loadEpoch) return;
      this.fail(error instanceof Error ? error.message : 'MIDI import failed.');
    }
  }

  private async loadSource(src: string) {
    this.sourceLoad?.abort();
    const controller = new AbortController();
    const epoch = this.connectionEpoch;
    this.sourceLoad = controller;
    try {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok)
        throw new Error(`Could not load MIDI (${response.status}).`);
      const { sequence, warnings } = await importMidi(
        await response.arrayBuffer(),
      );
      if (
        controller.signal.aborted ||
        !this.isConnected ||
        this.sourceLoad !== controller ||
        epoch !== this.connectionEpoch
      )
        return;
      this.sequence = validateSequence(sequence);
      this.stop();
      this.original = copy(sequence);
      this.config.preset = undefined;
      this.activeTrack = sequence.tracks[0]?.id;
      this.selected = undefined;
      this.emit();
      this.render();
      this.status(
        warnings.length
          ? `Loaded with notes: ${warnings.join(' ')}`
          : 'MIDI loaded.',
      );
    } catch (error) {
      if (!controller.signal.aborted)
        this.fail(
          error instanceof Error ? error.message : 'Could not load MIDI.',
        );
    }
  }

  private async download() {
    try {
      const bytes = await exportMidi(this.effectiveSequence());
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer], { type: 'audio/midi' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sequence.name || 'sequence'}.mid`;
      link.hidden = true;
      this.append(link);
      link.click();
      link.remove();
      // Let the browser consume the blob before revoking its download URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      this.status('MIDI export prepared.');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'MIDI export failed.');
    }
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
}

export function initMidiPlayers(root: ParentNode = document) {
  if (root instanceof MidiElement && root.isConnected) root.connectedCallback();
  root.querySelectorAll<MidiElement>('alk-midi').forEach((element) => {
    if (element.isConnected) element.connectedCallback();
  });
}

if (!customElements.get('alk-midi'))
  customElements.define('alk-midi', MidiElement);
document.addEventListener('astro:page-load', () => initMidiPlayers());
