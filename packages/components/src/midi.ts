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
      <header class="alk-midi-heading"><div><h3>${escapeHtml(title)}</h3></div><output class="alk-midi-status" role="status" aria-live="polite">Editor loads when visible.</output></header>
      <div class="alk-midi-toolbar" aria-label="Playback controls">
        <button type="button" data-midi-play disabled>Play</button><button type="button" data-midi-stop disabled>Stop</button>
        <label><input type="checkbox" data-midi-loop ${config.loop ? 'checked' : ''} disabled> Loop</label>
        <label>BPM <input data-midi-tempo type="number" min="30" max="240" value="${escapeHtml(config.tempo || sequence.bpm)}" disabled></label>
        <label>Volume <input data-midi-volume type="range" min="0" max="1" step="0.01" value="${config.volume}" disabled></label>
        <label>Preset <select data-midi-preset disabled><option value="" disabled>Custom sequence</option><option value="nocturne">Nocturne</option><option value="pulse">Pulse</option><option value="bassline">Bassline</option><option value="ensemble">Ensemble</option></select></label>
        <label>Voice <select data-midi-voice disabled><option value="track">Track voices</option><option value="piano">Piano</option><option value="supersaw">Supersaw</option><option value="bass">Bass</option></select></label>
        <button type="button" data-midi-import disabled>Import MIDI</button><input data-midi-file type="file" accept=".mid,.midi,audio/midi" hidden>
        <button type="button" data-midi-export disabled>Export MIDI</button>
      </div>
      <div class="alk-midi-timeline"><label>Position <input data-midi-seek type="range" min="0" max="512" step="0.01" value="0" disabled></label><output data-midi-position>0 beats</output></div>
      <div class="alk-midi-workspace"><aside class="alk-midi-tracks" aria-label="Tracks"></aside><div class="alk-midi-roll-wrap"><div class="alk-midi-ruler" aria-hidden="true"></div><div class="alk-midi-roll" role="group" aria-label="Piano roll"></div></div></div>
      <div class="alk-midi-inspector" hidden aria-label="Selected note"></div>
      <div class="alk-midi-fallback">${props.src ? `<p>The score loads in the browser. <a href="${escapeHtml(props.src)}">Download MIDI source</a></p>` : `<svg viewBox="0 0 320 144" role="img" aria-label="Static piano roll for ${escapeHtml(title)}" preserveAspectRatio="none"><path d="M0 0H320M0 24H320M0 48H320M0 72H320M0 96H320M0 120H320M0 144H320" stroke="currentColor" opacity=".25"/>${fallback.join('')}</svg><details><summary>Accessible note list</summary><ul>${notes.join('') || '<li>No notes in this sequence.</li>'}</ul></details>`}</div>
      ${props.caption ? `<p class="alk-midi-caption">${escapeHtml(props.caption)}</p>` : ''}
    </section>
  </alk-midi>`;
}
