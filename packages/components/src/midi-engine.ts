import { noteName, sequenceDuration, validateSequence } from './midi-model.ts';
import type { MidiSequence, MusicVoice } from './midi-model.ts';

export interface MusicEngine {
  play(
    sequence: MidiSequence,
    options: {
      beat: number;
      loop: boolean;
      volume: number;
      onBeat: (beat: number) => void;
      onEnded: () => void;
      onError?: (message: string) => void;
    },
  ): Promise<void>;
  stop(): void;
  setVolume(value: number): void;
  audition(pitch: number, voice: MusicVoice, velocity?: number): Promise<void>;
  dispose(): void;
}

type ToneModule = typeof import('tone');
type Voice = {
  triggerAttackRelease(
    note: string,
    duration: number,
    time?: number,
    velocity?: number,
  ): unknown;
  releaseAll(time?: number): unknown;
  dispose(): unknown;
};
type VoiceChain = { instrument: Voice; filter?: { dispose(): unknown } };
const AHEAD = 0.12;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Converts the editor's 0..1 volume contract into Web Audio gain. */
export function midiLinearGain(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new TypeError('Volume must be a finite number from 0 to 1');
  return value;
}

export interface PlannedMidiEvent {
  beat: number;
  pitch: number;
  duration: number;
  velocity: number;
  voice: MusicVoice;
}

/** Returns each audible onset once for a half-open beat interval. */
export function planMidiEvents(
  sequence: MidiSequence,
  from: number,
  until: number,
  loop: boolean,
): PlannedMidiEvent[] {
  const duration = sequenceDuration(sequence);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(until) ||
    until <= from ||
    duration <= 0
  )
    return [];
  const firstCycle = loop ? Math.floor(from / duration) : 0;
  const lastCycle = loop ? Math.floor((until - Number.EPSILON) / duration) : 0;
  const events: PlannedMidiEvent[] = [];
  for (let cycle = firstCycle; cycle <= lastCycle; cycle++)
    for (const track of sequence.tracks)
      for (const note of track.notes) {
        const beat = note.start + cycle * duration;
        if (
          !track.muted &&
          beat >= from &&
          beat < until &&
          (loop || beat < duration)
        )
          events.push({
            beat,
            pitch: note.pitch,
            duration: note.duration,
            velocity: note.velocity,
            voice: track.voice,
          });
      }
  return events.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
}

/** Creates a private Web Audio clock; invoke play/audition from a user gesture. */
export async function createMidiEngine(): Promise<MusicEngine> {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
    throw new Error('The MIDI sound engine is available only in a browser');
  const Tone: ToneModule = await import('tone');
  const rawContext = new AudioContext({ latencyHint: 'interactive' });
  const context = new Tone.Context({ context: rawContext });
  const limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
  const gain = new Tone.Gain({ context, gain: 0.78 }).connect(limiter);
  const synths = new Map<MusicVoice, VoiceChain>();
  let disposed = false;
  let timer: number | undefined;
  let frame: number | undefined;
  let generation = 0;
  const live = () => {
    if (disposed) throw new Error('The MIDI sound engine has been disposed');
  };
  const disposeVoices = () => {
    for (const chain of synths.values()) {
      chain.instrument.releaseAll(context.now());
      chain.instrument.dispose();
      chain.filter?.dispose();
    }
    synths.clear();
  };
  const stopClock = () => {
    generation += 1;
    if (timer !== undefined) window.clearTimeout(timer);
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    timer = undefined;
    frame = undefined;
    // Tone's scheduled attacks belong to these nodes, so disposal prevents tails
    // and future events surviving stop/seek without touching global Transport.
    disposeVoices();
  };
  const voice = (kind: MusicVoice): Voice => {
    const old = synths.get(kind);
    if (old) return old.instrument;
    const synth =
      kind === 'piano'
        ? new Tone.PolySynth({
            context,
            maxPolyphony: 12,
            voice: Tone.FMSynth,
            options: {
              harmonicity: 2.01,
              modulationIndex: 8,
              oscillator: { type: 'sine' },
              envelope: {
                attack: 0.004,
                decay: 0.55,
                sustain: 0.02,
                release: 1.15,
              },
              modulation: { type: 'triangle' },
              modulationEnvelope: {
                attack: 0.003,
                decay: 0.28,
                sustain: 0.04,
                release: 0.55,
              },
            },
          })
        : kind === 'supersaw'
          ? new Tone.PolySynth({
              context,
              maxPolyphony: 12,
              voice: Tone.Synth,
              options: {
                oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
                envelope: {
                  attack: 0.025,
                  decay: 0.2,
                  sustain: 0.45,
                  release: 0.32,
                },
              },
            })
          : new Tone.PolySynth({
              context,
              maxPolyphony: 12,
              voice: Tone.MonoSynth,
              options: {
                oscillator: { type: 'fmsine' },
                filter: { Q: 1.7, type: 'lowpass', rolloff: -24 },
                envelope: {
                  attack: 0.01,
                  decay: 0.2,
                  sustain: 0.5,
                  release: 0.26,
                },
                filterEnvelope: {
                  attack: 0.008,
                  decay: 0.22,
                  sustain: 0.2,
                  release: 0.18,
                  baseFrequency: 65,
                  octaves: 2.4,
                },
              },
            });
    const filter =
      kind === 'supersaw'
        ? new Tone.Filter({
            context,
            frequency: 4200,
            rolloff: -24,
            type: 'lowpass',
          })
        : undefined;
    synth.connect(filter ? filter.connect(gain) : gain);
    synths.set(kind, { instrument: synth, filter });
    return synth;
  };
  const setVolume = (value: number) => {
    live();
    gain.gain.rampTo(midiLinearGain(value), 0.025);
  };

  return {
    async play(sequence, options) {
      live();
      const valid = validateSequence(sequence);
      if (!Number.isFinite(options.beat) || options.beat < 0)
        throw new TypeError(
          'Playback beat must be a non-negative finite number',
        );
      stopClock();
      setVolume(options.volume);
      const token = generation;
      await context.resume();
      if (disposed || token !== generation) return;
      const duration = sequenceDuration(valid);
      if (duration <= 0 || options.beat >= duration) {
        options.onEnded();
        return;
      }
      const secondsPerBeat = 60 / valid.bpm;
      const origin = context.now() + 0.02;
      let plannedThrough = options.beat;
      const at = (
        pitch: number,
        kind: MusicVoice,
        velocity: number,
        beats: number,
        time: number,
      ) =>
        voice(kind).triggerAttackRelease(
          noteName(pitch),
          beats * secondsPerBeat,
          time,
          velocity,
        );
      for (const track of valid.tracks)
        for (const note of track.notes)
          if (
            !track.muted &&
            note.start < options.beat &&
            note.start + note.duration > options.beat
          )
            at(
              note.pitch,
              track.voice,
              note.velocity,
              note.start + note.duration - options.beat,
              origin,
            );
      const position = () =>
        options.beat + (context.now() - origin) / secondsPerBeat;
      const schedule = () => {
        if (disposed || token !== generation) return;
        const current = Math.max(options.beat, position());
        if (!options.loop && current >= duration) {
          stopClock();
          options.onEnded();
          return;
        }
        const horizon = current + AHEAD / secondsPerBeat;
        plannedThrough = Math.max(plannedThrough, current);
        try {
          for (const event of planMidiEvents(
            valid,
            plannedThrough,
            horizon,
            options.loop,
          ))
            at(
              event.pitch,
              event.voice,
              event.velocity,
              event.duration,
              Math.max(
                context.now() + 0.005,
                origin + (event.beat - options.beat) * secondsPerBeat,
              ),
            );
        } catch (error) {
          stopClock();
          options.onEnded();
          options.onError?.(
            error instanceof Error ? error.message : 'Audio scheduling failed.',
          );
          return;
        }
        plannedThrough = horizon;
        timer = window.setTimeout(schedule, 45);
      };
      const report = () => {
        if (disposed || token !== generation) return;
        const beat = Math.max(options.beat, position());
        options.onBeat(
          options.loop ? beat % duration : Math.min(beat, duration),
        );
        frame = window.requestAnimationFrame(report);
      };
      schedule();
      report();
    },
    stop() {
      if (!disposed) stopClock();
    },
    setVolume,
    async audition(pitch, kind, velocity = 0.7) {
      live();
      if (!['piano', 'supersaw', 'bass'].includes(kind))
        throw new TypeError('Unsupported voice');
      const token = generation;
      await context.resume();
      if (disposed || token !== generation) return;
      voice(kind).triggerAttackRelease(
        noteName(pitch),
        kind === 'piano' ? 1.1 : 0.62,
        context.now() + 0.008,
        clamp(velocity, 0, 1),
      );
    },
    dispose() {
      if (disposed) return;
      stopClock();
      disposed = true;
      gain.dispose();
      limiter.dispose();
      context.dispose();
    },
  };
}
