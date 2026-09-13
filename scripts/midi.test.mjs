import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exportMidi,
  getMidiPreset,
  importMidi,
  midiPresets,
  noteName,
  sequenceDuration,
  validateSequence,
} from '../packages/components/src/midi-model.ts';
import {
  midiLinearGain,
  planMidiEvents,
} from '../packages/components/src/midi-engine.ts';

test('presets are independent, bounded original sequences', () => {
  for (const [id, preset] of Object.entries(midiPresets)) {
    assert.equal(validateSequence(preset).name, preset.name, id);
    assert.ok(sequenceDuration(preset) >= 16, `${id} has a musical phrase`);
  }
  const clone = getMidiPreset('nocturne');
  clone.tracks[0].notes[0].pitch = 1;
  assert.notEqual(
    clone.tracks[0].notes[0].pitch,
    midiPresets.nocturne.tracks[0].notes[0].pitch,
  );
  assert.equal(noteName(60), 'C4');
  assert.equal(sequenceDuration(getMidiPreset('nocturne')), 32);
});

test('MIDI export and import retain beat timing, velocity, voices, and meter', async () => {
  const source = getMidiPreset('ensemble');
  const bytes = await exportMidi(source);
  assert.ok(bytes instanceof Uint8Array);
  const { sequence, warnings } = await importMidi(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  assert.deepEqual(warnings, []);
  assert.ok(Math.abs(sequence.bpm - source.bpm) < 0.001);
  assert.equal(sequence.beatsPerBar, source.beatsPerBar);
  assert.deepEqual(
    sequence.tracks.map((track) => track.voice),
    source.tracks.map((track) => track.voice),
  );
  for (const [index, track] of sequence.tracks.entries()) {
    assert.equal(track.notes.length, source.tracks[index].notes.length);
    assert.ok(
      Math.abs(track.notes[0].start - source.tracks[index].notes[0].start) <
        0.001,
    );
    assert.ok(
      Math.abs(
        track.notes[0].duration - source.tracks[index].notes[0].duration,
      ) < 0.001,
    );
    assert.ok(
      Math.abs(
        track.notes[0].velocity - source.tracks[index].notes[0].velocity,
      ) < 0.02,
    );
  }
});

test('compound and fractional MIDI meters normalize to quarter-note beats', async () => {
  const source = { ...getMidiPreset('pulse'), beatsPerBar: 1.5 };
  const bytes = await exportMidi(source);
  const { sequence } = await importMidi(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  assert.equal(sequence.beatsPerBar, 1.5);
});

test('validator rejects non-finite, oversized, and malformed sequences', () => {
  const base = getMidiPreset('pulse');
  assert.throws(() => validateSequence({ ...base, bpm: Infinity }), /finite/);
  assert.throws(() => validateSequence({ ...base, tracks: [] }), /tracks/);
  assert.throws(
    () =>
      validateSequence({
        ...base,
        tracks: [
          {
            ...base.tracks[0],
            notes: [{ ...base.tracks[0].notes[0], pitch: 128 }],
          },
        ],
      }),
    /pitch/,
  );
  assert.throws(
    () =>
      validateSequence({
        ...base,
        tracks: [
          {
            ...base.tracks[0],
            notes: [{ ...base.tracks[0].notes[0], start: 512, duration: 1 }],
          },
        ],
      }),
    /duration/,
  );
  assert.throws(
    () =>
      validateSequence({
        ...base,
        tracks: Array.from({ length: 17 }, () => base.tracks[0]),
      }),
    /tracks/,
  );
});

test('scheduler plans each event once across slices, loops, and seeks', () => {
  const source = getMidiPreset('pulse');
  const first = planMidiEvents(source, 0, 1, false);
  const second = planMidiEvents(source, 1, 2, false);
  assert.equal(
    first.length + second.length,
    planMidiEvents(source, 0, 2, false).length,
  );
  const end = sequenceDuration(source);
  assert.equal(
    planMidiEvents(source, end - 0.01, end + 0.1, true).filter(
      (event) => event.beat === end,
    ).length,
    2,
  );
  const seek = planMidiEvents(source, 2.01, 4, false);
  assert.ok(seek.every((event) => event.beat >= 2.01));
});

test('linear engine gain preserves silence and rejects invalid input', () => {
  assert.equal(midiLinearGain(0), 0);
  assert.equal(midiLinearGain(0.5), 0.5);
  assert.equal(midiLinearGain(1), 1);
  assert.throws(() => midiLinearGain(-0.01), /0 to 1/);
  assert.throws(() => midiLinearGain(1.01), /0 to 1/);
});
