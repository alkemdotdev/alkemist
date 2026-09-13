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
  private tool: 'draw' | 'select' | 'erase' = 'draw';
  private noteLength = 1;
  private ignoreClick = false;
  private drag?: {
    track: string;
    note: string;
    start: number;
    pitch: number;
    originalStart: number;
    originalPitch: number;
    duration: number;
    originalDuration: number;
    mode: 'move' | 'resize' | 'draw';
    pointerId: number;
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
    this.status('Ready');
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
    ruler.innerHTML = Array.from({ length: beats + 1 }, (_, beat) => {
      const bar = beat % this.sequence.beatsPerBar === 0;
      return `<span data-bar="${bar}" style="left:${keyboardGutter + beat * beatWidth}px">${bar ? Math.floor(beat / this.sequence.beatsPerBar) + 1 : ''}</span>`;
    }).join('');
    roll.style.setProperty(
      '--midi-bar-width',
      `${this.sequence.beatsPerBar * beatWidth}px`,
    );
    this.dataset.tool = this.tool;
    const hint = this.querySelector<HTMLElement>('[data-midi-hint]');
    if (hint)
      hint.textContent = !this.config.editable
        ? 'Choose a track · press Play'
        : this.tool === 'erase'
          ? 'Click a note to erase · Undo to restore'
          : this.tool === 'select'
            ? 'Drag to move · pull the right edge to resize'
            : 'Draw to add · drag to move · pull the edge to resize';
    tracks.innerHTML = this.sequence.tracks
      .map(
        (track) =>
          `<button type="button" data-midi-track="${this.escape(track.id)}" data-voice="${track.voice}" aria-pressed="${this.activeTrack === track.id}">${this.escape(track.name)}${track.muted ? ' · muted' : ''}</button>`,
      )
      .join('');
    const active =
      this.sequence.tracks.find((track) => track.id === this.activeTrack) ??
      this.sequence.tracks[0];
    this.activeTrack = active.id;
    const instrument = this.querySelector<HTMLSelectElement>(
      '[data-midi-active-voice]',
    );
    if (instrument) instrument.value = active.voice;
    const mute = this.querySelector<HTMLButtonElement>(
      '[data-midi-active-mute]',
    );
    if (mute) mute.setAttribute('aria-pressed', String(active.muted));
    this.querySelectorAll<HTMLButtonElement>('[data-midi-tool]').forEach(
      (button) =>
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.midiTool === this.tool),
        ),
    );
    for (const [action, entries] of [
      ['undo', this.history],
      ['redo', this.future],
    ] as const) {
      const button = this.querySelector<HTMLButtonElement>(
        `[data-midi-${action}]`,
      );
      if (button) button.disabled = !entries.length;
    }
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
          return `<button type="button" class="alk-midi-note" data-midi-note-track="${this.escape(track.id)}" data-midi-note-id="${this.escape(note.id)}" data-selected="${selected}" data-muted="${track.muted}" data-ghost="${track.id !== this.activeTrack}" data-voice="${track.voice}" style="left:${keyboardGutter + note.start * beatWidth}px;top:${(range.high - note.pitch) * rowHeight}px;width:${Math.max(10, note.duration * beatWidth - 2)}px;height:${rowHeight - 2}px" title="${this.escape(track.name)} ${noteName(note.pitch)}" aria-label="${this.escape(track.name)} ${noteName(note.pitch)}"><span class="alk-midi-note-label">${noteName(note.pitch)}</span>${this.config.editable ? '<span class="alk-midi-resize" data-midi-resize aria-hidden="true"></span>' : ''}</button>`;
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
    const details = this.querySelector<HTMLDetailsElement>(
      '[data-midi-note-details]',
    );
    if (details) details.hidden = !selected || !this.config.editable;
    if (!selected) {
      inspector.hidden = true;
      return;
    }
    const { note } = selected;
    inspector.hidden = false;
    inspector.innerHTML = `<label>Pitch<input data-midi-field="pitch" type="number" min="0" max="127" value="${note.pitch}"></label><label>Start<input data-midi-field="start" type="number" min="0" step="${this.snap}" value="${note.start}"></label><label>Length<input aria-label="Duration" data-midi-field="duration" type="number" min="${this.snap}" step="${this.snap}" value="${note.duration}"></label><label>Velocity<input data-midi-field="velocity" type="number" min="0" max="1" step="0.01" value="${note.velocity}"></label><button type="button" data-midi-duplicate>Duplicate</button><button type="button" data-midi-delete>Delete</button>`;
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
    const editTools = this.querySelector<HTMLElement>('[data-midi-edit-tools]');
    if (editTools) editTools.hidden = !this.config.editable;
    const reset = this.querySelector<HTMLElement>('[data-midi-reset]');
    if (reset) reset.hidden = !this.config.editable;
    preset.value = this.config.preset ?? '';

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
    roll?.addEventListener(
      'pointerup',
      (event) => {
        if (this.drag?.pointerId === event.pointerId) this.commitDrag();
      },
      { signal },
    );
    roll?.addEventListener('pointercancel', () => this.cancelDrag(), {
      signal,
    });
    this.addEventListener('keydown', (event) => this.keydown(event), {
      signal,
    });
    this.querySelector('.alk-midi-ruler')?.addEventListener(
      'pointerdown',
      (event) => {
        const pointer = event as PointerEvent;
        if (pointer.button !== 0) return;
        const rect = (
          event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        const wasPlaying = this.playing;
        this.halt(false);
        this.playBeat = clamp(
          (pointer.clientX - rect.left - keyboardGutter) / beatWidth,
          0,
          sequenceDuration(this.sequence),
        );
        this.updatePosition();
        if (wasPlaying) void this.play();
      },
      { signal },
    );
    roll?.addEventListener(
      'contextmenu',
      (event) => {
        const note = (event.target as HTMLElement).closest<HTMLElement>(
          '[data-midi-note-id]',
        );
        if (!this.config.editable || !note) return;
        event.preventDefault();
        this.selected = {
          track: note.dataset.midiNoteTrack!,
          note: note.dataset.midiNoteId!,
        };
        this.deleteSelected();
      },
      { signal },
    );
    this.addEventListener(
      'dragover',
      (event) => {
        if (
          !this.config.editable ||
          !event.dataTransfer?.types.includes('Files')
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        this.dataset.dropping = 'true';
      },
      { signal },
    );
    this.addEventListener(
      'dragleave',
      (event) => {
        if (!this.contains(event.relatedTarget as Node | null))
          delete this.dataset.dropping;
      },
      { signal },
    );
    this.addEventListener(
      'drop',
      (event) => {
        if (!this.config.editable || !event.dataTransfer?.files.length) return;
        event.preventDefault();
        delete this.dataset.dropping;
        const file = event.dataTransfer.files[0];
        if (!/\.midi?$/i.test(file.name)) {
          this.fail('Drop a .mid or .midi file.');
          return;
        }
        void this.importFile(file);
      },
      { signal },
    );
    this.tabIndex = 0;
    // Binding enables server-rendered controls; restore history availability afterwards.
    this.render();
  }

  private handleClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.alk-midi-more')) {
      const more = this.querySelector<HTMLDetailsElement>('.alk-midi-more');
      if (more) more.open = false;
    }
    if (this.ignoreClick && target.closest('.alk-midi-roll')) {
      this.ignoreClick = false;
      return;
    }
    const tool =
      target.closest<HTMLElement>('[data-midi-tool]')?.dataset.midiTool;
    if (tool && this.config.editable) {
      this.tool = tool as typeof this.tool;
      this.render();
      return;
    }
    if (target.closest('[data-midi-active-mute]')) {
      this.mutate((sequence) => {
        const track = sequence.tracks.find((t) => t.id === this.activeTrack);
        if (track) track.muted = !track.muted;
      });
      return;
    }
    const note = target.closest<HTMLElement>('[data-midi-note-id]');
    if (note) {
      const track = note.dataset.midiNoteTrack!;
      const id = note.dataset.midiNoteId!;
      this.activeTrack = track;
      this.selected = { track, note: id };
      if (this.tool === 'erase' && this.config.editable) this.deleteSelected();
      else this.render();
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
      this.selected = undefined;
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
    if ('midiActiveVoice' in target.dataset) {
      this.mutate((sequence) => {
        const track = sequence.tracks.find((t) => t.id === this.activeTrack);
        if (track) track.voice = target.value as MusicVoice;
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
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      this.drag ||
      !this.config.editable
    )
      return;
    this.ignoreClick = false;
    const roll = event.currentTarget as HTMLElement;
    const target = event.target as HTMLElement;
    const noteElement = target.closest<HTMLElement>('[data-midi-note-id]');
    if (noteElement) {
      const track = noteElement.dataset.midiNoteTrack!;
      const id = noteElement.dataset.midiNoteId!;
      const note = this.sequence.tracks
        .find((item) => item.id === track)
        ?.notes.find((item) => item.id === id);
      if (!note) return;
      this.selected = { track, note: id };
      if (this.tool === 'erase') {
        this.ignoreClick = true;
        this.deleteSelected();
        return;
      }
      event.preventDefault();
      roll.setPointerCapture(event.pointerId);
      this.drag = {
        track,
        note: id,
        start: note.start,
        pitch: note.pitch,
        originalStart: note.start,
        originalPitch: note.pitch,
        duration: note.duration,
        originalDuration: note.duration,
        mode: target.closest('[data-midi-resize]') ? 'resize' : 'move',
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      noteElement.dataset.selected = 'true';
      return;
    }
    if (target !== roll) return;
    if (this.tool !== 'draw') {
      this.selected = undefined;
      this.render();
      return;
    }
    const rect = roll.getBoundingClientRect();
    if (event.clientX < rect.left + keyboardGutter) return;
    const range = this.pitchRange();
    const pitch = clamp(
      range.high - Math.floor((event.clientY - rect.top) / rowHeight),
      range.low,
      range.high,
    );
    const start = clamp(
      Math.floor(
        (event.clientX - rect.left - keyboardGutter) / beatWidth / this.snap,
      ) * this.snap,
      0,
      512 - this.snap,
    );
    const track =
      this.sequence.tracks.find((item) => item.id === this.activeTrack) ??
      this.sequence.tracks[0];
    event.preventDefault();
    roll.setPointerCapture(event.pointerId);
    const duration = Math.min(this.noteLength, 512 - start);
    this.drag = {
      track: track.id,
      note: crypto.randomUUID(),
      start,
      pitch,
      originalStart: start,
      originalPitch: pitch,
      duration,
      originalDuration: duration,
      mode: 'draw',
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    const ghost = document.createElement('span');
    ghost.className = 'alk-midi-note alk-midi-draft';
    ghost.dataset.voice = track.voice;
    ghost.style.cssText = `left:${keyboardGutter + start * beatWidth}px;top:${(range.high - pitch) * rowHeight}px;width:${Math.max(10, duration * beatWidth - 2)}px;height:${rowHeight - 2}px;pointer-events:none`;
    ghost.textContent = noteName(pitch);
    roll.append(ghost);
  }

  private pointerMove(event: PointerEvent) {
    if (
      !this.drag ||
      this.drag.pointerId !== event.pointerId ||
      !this.config.editable
    )
      return;
    const roll = this.querySelector<HTMLElement>('.alk-midi-roll');
    if (!roll) return;
    const active = this.drag;
    const delta =
      Math.round((event.clientX - active.clientX) / beatWidth / this.snap) *
      this.snap;
    const range = this.pitchRange();
    if (active.mode === 'move') {
      active.start = clamp(
        active.originalStart + delta,
        0,
        512 - active.duration,
      );
      active.pitch = clamp(
        active.originalPitch -
          Math.round((event.clientY - active.clientY) / rowHeight),
        range.low,
        range.high,
      );
    } else if (active.mode === 'resize') {
      active.duration = clamp(
        Math.round((active.originalDuration + delta) / this.snap) * this.snap,
        this.snap,
        512 - active.start,
      );
    } else if (Math.abs(event.clientX - active.clientX) > 4) {
      active.duration = clamp(delta, this.snap, 512 - active.start);
    }
    const element =
      active.mode === 'draw'
        ? roll.querySelector<HTMLElement>('.alk-midi-draft')
        : Array.from(
            roll.querySelectorAll<HTMLElement>('[data-midi-note-id]'),
          ).find(
            (el) =>
              el.dataset.midiNoteId === active.note &&
              el.dataset.midiNoteTrack === active.track,
          );
    if (element) {
      element.style.left = `${keyboardGutter + active.start * beatWidth}px`;
      element.style.top = `${(range.high - active.pitch) * rowHeight}px`;
      element.style.width = `${Math.max(10, active.duration * beatWidth - 2)}px`;
    }
  }

  private commitDrag() {
    const drag = this.drag;
    this.drag = undefined;
    if (!drag) return;
    this.ignoreClick = true;
    this.activeTrack = drag.track;
    this.selected = { track: drag.track, note: drag.note };
    this.noteLength = drag.duration;
    if (
      drag.mode === 'draw' ||
      drag.start !== drag.originalStart ||
      drag.pitch !== drag.originalPitch ||
      drag.duration !== drag.originalDuration
    ) {
      this.mutate((sequence) => {
        const track = sequence.tracks.find((track) => track.id === drag.track)!;
        if (drag.mode === 'draw')
          track.notes.push({
            id: drag.note,
            start: drag.start,
            pitch: drag.pitch,
            duration: drag.duration,
            velocity: 0.75,
          });
        else {
          const note = track.notes.find((note) => note.id === drag.note);
          if (note)
            Object.assign(note, {
              start: drag.start,
              pitch: drag.pitch,
              duration: drag.duration,
            });
        }
      });
    } else this.render();
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
    if (
      event.key === ' ' &&
      !(event.target instanceof HTMLButtonElement) &&
      !(event.target instanceof HTMLElement && event.target.closest('summary'))
    ) {
      event.preventDefault();
      void this.play();
      return;
    }
    if (!this.config.editable) return;
    if (event.key === 'Escape') {
      this.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(
        (details) => {
          details.open = false;
        },
      );
      this.cancelDrag();
      this.selected = undefined;
      this.render();
      return;
    }
    if (
      !event.metaKey &&
      !event.ctrlKey &&
      ['d', 's', 'e'].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      this.tool = ({ d: 'draw', s: 'select', e: 'erase' } as const)[
        event.key.toLowerCase() as 'd' | 's' | 'e'
      ];
      this.render();
      return;
    }
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
    this.renderInspector();
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
    this.render();
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
