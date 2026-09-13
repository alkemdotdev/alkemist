/** A small, editable music representation expressed in quarter-note beats. */
export type MusicVoice = 'piano' | 'supersaw' | 'bass';

export interface MidiNote {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export interface MidiTrack {
  id: string;
  name: string;
  voice: MusicVoice;
  muted: boolean;
  notes: MidiNote[];
}

export interface MidiSequence {
  name: string;
  bpm: number;
  beatsPerBar: number;
  tracks: MidiTrack[];
}

export type MidiPresetId = 'nocturne' | 'pulse' | 'bassline' | 'ensemble';

const MAX_TRACKS = 16;
const MAX_NOTES = 2048;
const MAX_BEATS = 512;
const MAX_MIDI_BYTES = 4 * 1024 * 1024;
const voices = new Set<MusicVoice>(['piano', 'supersaw', 'bass']);

const pianoNotes = [
  [60, 64, 67, 72],
  [59, 62, 67, 71],
  [57, 60, 64, 69],
  [55, 59, 62, 67],
  [60, 64, 67, 71],
  [57, 60, 64, 69],
  [55, 59, 62, 67],
  [53, 57, 60, 65],
];

function chordNotes(
  id: string,
  chords: number[][],
  voice: MusicVoice,
  name: string,
  step = 4,
): MidiSequence {
  return {
    name,
    bpm: voice === 'piano' ? 78 : 116,
    beatsPerBar: 4,
    tracks: [
      {
        id: `${id}-track`,
        name:
          voice === 'piano'
            ? 'Warm keys'
            : voice === 'bass'
              ? 'Bass'
              : 'Saw pulse',
        voice,
        muted: false,
        notes: chords.flatMap((chord, bar) =>
          chord.map((pitch, index) => ({
            id: `${id}-${bar}-${index}`,
            pitch,
            start: bar * step + (voice === 'bass' ? index * 0.5 : 0),
            duration: voice === 'bass' ? 0.42 : step * 0.86,
            velocity: voice === 'bass' ? 0.68 : 0.58 + index * 0.06,
          })),
        ),
      },
    ],
  };
}

const ensemble: MidiSequence = {
  name: 'Glass ensemble',
  bpm: 104,
  beatsPerBar: 4,
  tracks: [
    {
      id: 'ensemble-keys',
      name: 'Warm keys',
      voice: 'piano',
      muted: false,
      notes: pianoNotes.flatMap((chord, bar) =>
        chord.slice(0, 3).map((pitch, index) => ({
          id: `ensemble-keys-${bar}-${index}`,
          pitch,
          start: bar * 4,
          duration: 3.25,
          velocity: 0.46 + index * 0.07,
        })),
      ),
    },
    {
      id: 'ensemble-saw',
      name: 'High pulse',
      voice: 'supersaw',
      muted: false,
      notes: pianoNotes.flatMap((chord, bar) =>
        [0, 1.5, 2.5].map((offset, index) => ({
          id: `ensemble-saw-${bar}-${index}`,
          pitch: chord[(index + 1) % 3] + 12,
          start: bar * 4 + offset,
          duration: index === 1 ? 0.75 : 1.1,
          velocity: 0.32 + index * 0.05,
        })),
      ),
    },
    {
      id: 'ensemble-bass',
      name: 'Round bass',
      voice: 'bass',
      muted: false,
      notes: pianoNotes.flatMap((chord, bar) =>
        [0, 1, 2.5, 3].map((offset, index) => ({
          id: `ensemble-bass-${bar}-${index}`,
          pitch: chord[0] - 24,
          start: bar * 4 + offset,
          duration: index === 2 ? 0.9 : 0.58,
          velocity: 0.63 + (index === 0 ? 0.08 : 0),
        })),
      ),
    },
  ],
};

/** Original, compact examples for the editor; callers receive independent clones. */
export const midiPresets: Record<MidiPresetId, MidiSequence> = {
  nocturne: chordNotes('nocturne', pianoNotes, 'piano', 'Nocturne studies'),
  pulse: chordNotes(
    'pulse',
    pianoNotes.map((chord) => [chord[0] + 12, chord[2] + 12]),
    'supersaw',
    'Pulse studies',
  ),
  bassline: chordNotes(
    'bassline',
    pianoNotes.map((chord) => [
      chord[0] - 24,
      chord[0] - 12,
      chord[0] - 24,
      chord[2] - 24,
    ]),
    'bass',
    'Bassline studies',
  ),
  ensemble,
};

export function getMidiPreset(id: MidiPresetId): MidiSequence {
  return structuredClone(midiPresets[id]);
}

function fail(message: string): never {
  throw new TypeError(`Invalid MIDI sequence: ${message}`);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 160)
    fail(`${label} must be a non-empty string`);
  return value;
}

function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    fail(
      `${label} must be a finite ${integer ? 'integer ' : ''}between ${min} and ${max}`,
    );
  }
  return value;
}

/** Validate and clone untrusted editor or imported data. */
export function validateSequence(value: unknown): MidiSequence {
  const candidate = object(value, 'sequence');
  const bpm = number(candidate.bpm, 'bpm', 30, 240);
  const beatsPerBar = number(candidate.beatsPerBar, 'beatsPerBar', 0.25, 16);
  if (Math.round(beatsPerBar * 4) !== beatsPerBar * 4)
    fail('beatsPerBar must be a multiple of one quarter beat');
  const tracksValue = candidate.tracks;
  if (
    !Array.isArray(tracksValue) ||
    !tracksValue.length ||
    tracksValue.length > MAX_TRACKS
  )
    fail(`tracks must contain 1 to ${MAX_TRACKS} tracks`);
  const ids = new Set<string>();
  let noteCount = 0;
  let duration = 0;
  const tracks = tracksValue.map((trackValue, trackIndex): MidiTrack => {
    const track = object(trackValue, `tracks[${trackIndex}]`);
    const id = text(track.id, `tracks[${trackIndex}].id`);
    if (ids.has(id)) fail(`track ids must be unique (${id})`);
    ids.add(id);
    const voice = track.voice;
    if (typeof voice !== 'string' || !voices.has(voice as MusicVoice))
      fail(`tracks[${trackIndex}].voice is unsupported`);
    if (typeof track.muted !== 'boolean')
      fail(`tracks[${trackIndex}].muted must be boolean`);
    if (!Array.isArray(track.notes))
      fail(`tracks[${trackIndex}].notes must be an array`);
    const noteIds = new Set<string>();
    const notes = track.notes.map((noteValue, noteIndex): MidiNote => {
      noteCount += 1;
      if (noteCount > MAX_NOTES) fail(`notes exceed ${MAX_NOTES}`);
      const note = object(
        noteValue,
        `tracks[${trackIndex}].notes[${noteIndex}]`,
      );
      const noteId = text(
        note.id,
        `tracks[${trackIndex}].notes[${noteIndex}].id`,
      );
      if (noteIds.has(noteId))
        fail(`note ids must be unique within a track (${noteId})`);
      noteIds.add(noteId);
      const start = number(
        note.start,
        `tracks[${trackIndex}].notes[${noteIndex}].start`,
        0,
        MAX_BEATS,
      );
      const noteDuration = number(
        note.duration,
        `tracks[${trackIndex}].notes[${noteIndex}].duration`,
        Number.EPSILON,
        MAX_BEATS,
      );
      duration = Math.max(duration, start + noteDuration);
      if (duration > MAX_BEATS)
        fail(`total duration exceeds ${MAX_BEATS} beats`);
      return {
        id: noteId,
        pitch: number(
          note.pitch,
          `tracks[${trackIndex}].notes[${noteIndex}].pitch`,
          0,
          127,
          true,
        ),
        start,
        duration: noteDuration,
        velocity: number(
          note.velocity,
          `tracks[${trackIndex}].notes[${noteIndex}].velocity`,
          0,
          1,
        ),
      };
    });
    return {
      id,
      name: text(track.name, `tracks[${trackIndex}].name`),
      voice: voice as MusicVoice,
      muted: track.muted,
      notes,
    };
  });
  return { name: text(candidate.name, 'name'), bpm, beatsPerBar, tracks };
}

export function sequenceDuration(sequence: MidiSequence): number {
  const end = Math.max(
    0,
    ...sequence.tracks.flatMap((track) =>
      track.notes.map((note) => note.start + note.duration),
    ),
  );
  // A loop includes the rest at the end of its final measure.
  return end === 0
    ? 0
    : Math.ceil(end / sequence.beatsPerBar) * sequence.beatsPerBar;
}

export function noteName(pitch: number): string {
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127)
    throw new RangeError('MIDI pitch must be an integer from 0 to 127');
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function voiceForProgram(program: number): MusicVoice {
  if (program >= 32 && program <= 39) return 'bass';
  if (program >= 80 && program <= 87) return 'supersaw';
  return 'piano';
}

function programForVoice(voice: MusicVoice): number {
  return voice === 'bass' ? 33 : voice === 'supersaw' ? 81 : 0;
}

/** Decode a standard MIDI file without loading its parser until an import is requested. */
export async function importMidi(
  buffer: ArrayBuffer,
): Promise<{ sequence: MidiSequence; warnings: string[] }> {
  if (
    !(buffer instanceof ArrayBuffer) ||
    !buffer.byteLength ||
    buffer.byteLength > MAX_MIDI_BYTES
  )
    throw new RangeError(
      'MIDI file must be a non-empty ArrayBuffer no larger than 4 MiB',
    );
  let midi: any;
  try {
    // The package is CommonJS while its published declarations describe named
    // exports; Vite and Node expose its runtime API as the default object.
    const { Midi } = (await import('@tonejs/midi')).default as {
      Midi: new (source?: ArrayBuffer) => any;
    };
    midi = new Midi(buffer);
  } catch (error) {
    throw new TypeError(
      `Could not parse MIDI file: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
  const warnings: string[] = [];
  const tempos = midi.header?.tempos ?? [];
  const bpm = tempos[0]?.bpm ?? 120;
  if (tempos.length > 1)
    warnings.push('Tempo changes after the first tempo were ignored.');
  const signatures = midi.header?.timeSignatures ?? [];
  const signature = signatures[0]?.timeSignature ?? [4, 4];
  const beatsPerBar = (signature[0] * 4) / signature[1];
  if (signatures.length > 1)
    warnings.push(
      'Time-signature changes after the first signature were ignored.',
    );
  if (signature[1] !== 4)
    warnings.push(
      `The ${signature[0]}/${signature[1]} meter was normalized to ${beatsPerBar} quarter-note beats per bar.`,
    );
  const ppq = midi.header?.ppq ?? midi.header?.PPQ;
  if (!Number.isFinite(ppq) || ppq <= 0)
    throw new TypeError('MIDI file has no valid tick resolution');
  const tracks = (midi.tracks ?? []).flatMap((track: any, index: number) => {
    if (track.instrument?.percussion || track.channel === 9) {
      if (track.notes?.length)
        warnings.push(`Percussion track ${index + 1} was skipped.`);
      return [];
    }
    if (Object.keys(track.controlChanges ?? {}).length)
      warnings.push(`Control changes in track ${index + 1} were ignored.`);
    if (track.pitchBends?.length)
      warnings.push(`Pitch bends in track ${index + 1} were ignored.`);
    if (!track.notes?.length) return [];
    return [
      {
        id: `track-${index + 1}`,
        name:
          typeof track.name === 'string' && track.name.trim()
            ? track.name
            : `Track ${index + 1}`,
        voice: voiceForProgram(track.instrument?.number ?? 0),
        muted: false,
        notes: track.notes.map((note: any, noteIndex: number) => ({
          id: `track-${index + 1}-note-${noteIndex + 1}`,
          pitch: note.midi,
          start: note.ticks / ppq,
          duration: note.durationTicks / ppq,
          velocity: note.velocity,
        })),
      },
    ];
  });
  if (!tracks.length)
    throw new TypeError('MIDI file contains no supported pitched notes');
  return {
    sequence: validateSequence({
      name: midi.name?.trim() || 'Imported MIDI',
      bpm,
      beatsPerBar,
      tracks,
    }),
    warnings,
  };
}

/** Encode the portable sequence representation as a standard MIDI file. */
export async function exportMidi(sequence: MidiSequence): Promise<Uint8Array> {
  const valid = validateSequence(sequence);
  const { Midi } = (await import('@tonejs/midi')).default as {
    Midi: new () => any;
  };
  const midi = new Midi();
  midi.name = valid.name;
  midi.header.tempos.push({ bpm: valid.bpm, ticks: 0 });
  const timeSignature = Number.isInteger(valid.beatsPerBar)
    ? [valid.beatsPerBar, 4]
    : [valid.beatsPerBar * 4, 16];
  midi.header.timeSignatures.push({ timeSignature, ticks: 0 });
  // @tonejs/midi's encoder uses a 480 PPQ header. Supplying ticks avoids its
  // optional seconds conversion, which assumes parsed tempo events include a
  // derived `time` field.
  const ppq = midi.header.ppq;
  for (const source of valid.tracks) {
    const track = midi.addTrack();
    track.name = source.name;
    track.instrument.number = programForVoice(source.voice);
    for (const note of source.notes) {
      track.addNote({
        midi: note.pitch,
        ticks: Math.round(note.start * ppq),
        durationTicks: Math.max(1, Math.round(note.duration * ppq)),
        velocity: note.velocity,
      });
    }
  }
  return midi.toArray();
}
