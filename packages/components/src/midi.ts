import {
  getMidiPreset,
  sequenceDuration,
  noteName,
  validateSequence,
  type MidiSequence,
  type MusicVoice,
} from './midi-model.ts';

export type { MidiSequence, MusicVoice } from './midi-model.ts';

export interface MidiProps {
  title?: string;
  caption?: string;
  preset?: 'nocturne' | 'pulse' | 'bassline' | 'ensemble';
  sequence?: MidiSequence | null;
  src?: string;
  voice?: MusicVoice | 'track';
  editable?: boolean;
  loop?: boolean;
  volume?: number;
  tempo?: number;
  height?: number;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
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

function escapedJson(value: unknown) {
  return escapeHtml(JSON.stringify(value).replace(/</g, '\\u003c'));
}

function validNumber(
  value: number | undefined,
  name: string,
  minimum: number,
  maximum: number,
  allowZero = false,
) {
  if (value === undefined) return;
  if (
    !Number.isFinite(value) ||
    (allowZero && value === 0 ? false : value < minimum || value > maximum)
  )
    throw new TypeError(
      `${name} must be ${allowZero ? '0 or ' : ''}between ${minimum} and ${maximum}.`,
    );
}

function validateProps(props: MidiProps) {
  if (
    props.preset &&
    !['nocturne', 'pulse', 'bassline', 'ensemble'].includes(props.preset)
  )
    throw new TypeError('Unknown MIDI preset.');
  if (
    props.voice &&
    !['track', 'piano', 'supersaw', 'bass'].includes(props.voice)
  )
    throw new TypeError('Unknown MIDI voice.');
  for (const [name, value] of Object.entries({
    editable: props.editable,
    loop: props.loop,
  }))
    if (value !== undefined && typeof value !== 'boolean')
      throw new TypeError(`${name} must be a boolean.`);
  validNumber(props.volume, 'volume', 0, 1);
  validNumber(props.tempo, 'tempo', 30, 240, true);
  validNumber(props.height, 'height', 160, 600);
}

function resolvedSequence(props: MidiProps): MidiSequence {
  if (props.src)
    return {
      name: 'MIDI file',
      bpm: 120,
      beatsPerBar: 4,
      tracks: [
        {
          id: 'import',
          name: 'MIDI track',
          voice: 'piano',
          muted: false,
          notes: [],
        },
      ],
    };
  if (props.sequence) return validateSequence(props.sequence);
  return getMidiPreset(props.preset ?? 'nocturne');
}

/** Render a usable, accessible score before the lazy editor and audio engine load. */
export function renderMidi(props: MidiProps = {}): string {
  validateProps(props);
  if (props.src && !/^(?:https?:\/\/|\/|\.\/|\.\.\/)/.test(props.src))
    throw new TypeError('Midi src must be an HTTP(S) or relative asset URL.');
  const sequence = resolvedSequence(props);
  const config = {
    preset:
      props.sequence || props.src ? undefined : (props.preset ?? 'nocturne'),
    sequence,
    src: props.src ?? '',
    voice: props.voice ?? 'track',
    editable: props.editable ?? true,
    loop: props.loop ?? true,
    volume: props.volume ?? 0.65,
    tempo: props.tempo ?? 0,
    height: props.height ?? 300,
  };
  const title = props.title ?? sequence.name;
  const notes = sequence.tracks.flatMap((track) =>
    track.notes.map(
      (note) =>
        `<li><strong>${escapeHtml(track.name)}</strong>: ${escapeHtml(noteName(note.pitch))}, beat ${escapeHtml(note.start)}, for ${escapeHtml(note.duration)} beats</li>`,
    ),
  );
  const pitches = sequence.tracks.flatMap((track) =>
    track.notes.map((note) => note.pitch),
  );
  const low = Math.min(...(pitches.length ? pitches : [48])) - 1;
  const high = Math.max(...(pitches.length ? pitches : [72])) + 1;
  const end = Math.max(1, sequenceDuration(sequence));
  const fallback = sequence.tracks.flatMap((track) =>
    track.notes.map((note) => {
      const x = (note.start / end) * 320;
      const y = ((high - note.pitch) / (high - low)) * 136;
      return `<rect x="${x}" y="${y}" width="${Math.max(1, (note.duration / end) * 320 - 0.5)}" height="3" fill="${track.voice === 'bass' ? '#b78a26' : track.voice === 'supersaw' ? '#159b90' : '#1982f2'}"><title>${escapeHtml(`${track.name}: ${noteName(note.pitch)}`)}</title></rect>`;
    }),
  );
  return `<alk-midi class="alk-midi" data-config="${escapedJson(config)}" data-state="idle" style="--alk-midi-height:${config.height}px">
    <section class="alk-midi-frame" aria-label="${escapeHtml(title)} MIDI editor">
      <header class="alk-midi-toolbar" aria-label="${escapeHtml(title)} controls">
        <div class="alk-midi-transport">
          <button type="button" class="alk-midi-play" data-midi-play disabled>Play</button>
          <button type="button" class="alk-midi-icon-button" data-midi-stop aria-label="Stop" title="Stop" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1"/></svg><span class="alk-midi-visually-hidden">Stop</span></button>
          <label class="alk-midi-tempo">BPM <input data-midi-tempo type="number" min="30" max="240" value="${escapeHtml(config.tempo || sequence.bpm)}" disabled></label>
        </div>
        <div class="alk-midi-edit-tools" data-midi-edit-tools aria-label="Editing tools">
          <button type="button" class="alk-midi-icon-button" data-midi-tool="draw" aria-label="Draw notes" title="Draw notes (D)" aria-pressed="true" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 11.8-.6 2.1 2.1-.6L12.8 5a1.5 1.5 0 0 0-2.1-2.1L2.4 11.2Z"/><path d="m9.6 4 2.1 2.1"/></svg><span class="alk-midi-visually-hidden">Draw notes</span></button>
          <button type="button" class="alk-midi-icon-button" data-midi-tool="select" aria-label="Select notes" title="Select notes (S)" aria-pressed="false" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 2.2 8.1 5.2-3.5.9 2.2 3.6-1.8 1.1-2.2-3.6-2.3 2.8V2.2Z"/></svg><span class="alk-midi-visually-hidden">Select notes</span></button>
          <button type="button" class="alk-midi-icon-button" data-midi-tool="erase" aria-label="Erase notes" title="Erase notes (E)" aria-pressed="false" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 12.5 7.1-7.1 2 2-4.8 4.8H5Z"/><path d="m2.4 9.4 5.1-5.1 2 2-5.2 5.1H2.4v-2Z"/><path d="M2 14h12"/></svg><span class="alk-midi-visually-hidden">Erase notes</span></button>
          <label class="alk-midi-snap">Snap <select data-midi-snap disabled><option value="0.25">1/16</option><option value="0.5">1/8</option><option value="1">1/4</option></select></label>
          <button type="button" class="alk-midi-icon-button" data-midi-undo aria-label="Undo" title="Undo" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 4 2.5 8l4.1 4"/><path d="M3 8h6a4 4 0 1 1 0 8"/></svg><span class="alk-midi-visually-hidden">Undo</span></button>
          <button type="button" class="alk-midi-icon-button" data-midi-redo aria-label="Redo" title="Redo" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m9.4 4 4.1 4-4.1 4"/><path d="M13 8H7a4 4 0 1 0 0 8"/></svg><span class="alk-midi-visually-hidden">Redo</span></button>
        </div>
        <div class="alk-midi-track-controls">
          <label class="alk-midi-instrument"><span class="alk-midi-visually-hidden">Instrument</span><select data-midi-active-voice aria-label="Instrument" disabled><option value="piano">Piano</option><option value="supersaw">Supersaw</option><option value="bass">Bass</option></select></label>
          <button type="button" class="alk-midi-icon-button" data-midi-active-mute aria-label="Mute track" title="Mute track" aria-pressed="false" disabled><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6h2.5L9 3v10l-3.5-3H3V6Z"/><path d="m11 6 3 4m0-4-3 4"/></svg><span class="alk-midi-visually-hidden">Mute track</span></button>
        </div>
        <details class="alk-midi-more">
          <summary>More</summary>
          <div class="alk-midi-more-panel">
            <label>Preset <select data-midi-preset disabled><option value="" disabled>Custom sequence</option><option value="nocturne">Nocturne</option><option value="pulse">Pulse</option><option value="bassline">Bassline</option><option value="ensemble">Ensemble</option></select></label>
            <label>Volume <input data-midi-volume type="range" min="0" max="1" step="0.01" value="${config.volume}" disabled></label>
            <label class="alk-midi-loop"><input type="checkbox" data-midi-loop ${config.loop ? 'checked' : ''} disabled> Loop</label>
            <label class="alk-midi-seek">Position <input data-midi-seek type="range" min="0" max="512" step="0.01" value="0" disabled><output data-midi-position>0 beats</output></label>
            <button type="button" data-midi-import disabled>Import MIDI</button><input data-midi-file type="file" accept=".mid,.midi,audio/midi" hidden>
            <button type="button" data-midi-export disabled>Export MIDI</button><button type="button" data-midi-reset disabled>Reset</button>
          </div>
        </details>
      </header>
      <nav class="alk-midi-tracks" aria-label="Tracks"></nav>
      <div class="alk-midi-workspace"><div class="alk-midi-roll-wrap"><div class="alk-midi-ruler" aria-hidden="true"></div><div class="alk-midi-roll" role="group" aria-label="Piano roll"></div></div></div>
      <details class="alk-midi-note-details" data-midi-note-details hidden><summary>Note details</summary><div class="alk-midi-inspector" aria-label="Selected note"></div></details>
      <footer class="alk-midi-footer"><p data-midi-hint>Draw to add · drag to move · drag edge to resize</p><output class="alk-midi-status" role="status" aria-live="polite">Editor loads when visible.</output></footer>
      <div class="alk-midi-fallback">${props.src ? `<p>The score loads in the browser. <a href="${escapeHtml(props.src)}">Download MIDI source</a></p>` : `<svg viewBox="0 0 320 144" role="img" aria-label="Static piano roll for ${escapeHtml(title)}" preserveAspectRatio="none"><path d="M0 0H320M0 24H320M0 48H320M0 72H320M0 96H320M0 120H320M0 144H320" stroke="currentColor" opacity=".25"/>${fallback.join('')}</svg><details><summary>Accessible note list</summary><ul>${notes.join('') || '<li>No notes in this sequence.</li>'}</ul></details>`}</div>
      ${props.caption ? `<p class="alk-midi-caption">${escapeHtml(props.caption)}</p>` : ''}
    </section>
  </alk-midi>`;
}
