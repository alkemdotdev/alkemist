import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMidi } from '../packages/components/src/midi.ts';
import { getMidiPreset } from '../packages/components/src/midi-model.ts';

test('MIDI retains a visible score before JavaScript is available', () => {
  const html = renderMidi({ preset: 'ensemble', editable: false });
  assert.match(html, /<alk-midi/);
  assert.match(html, /<svg/);
  assert.match(html, /disabled/);
  assert.doesNotMatch(html, /<audio[^>]*autoplay/);
  const remote = renderMidi({ src: '/score.mid' });
  assert.match(remote, /Download MIDI source/);
  assert.doesNotMatch(remote, /<rect /);
});

test('MIDI author data remains text in markup and serialized configuration', () => {
  const sequence = getMidiPreset('nocturne');
  sequence.name = '</script><img src=x onerror=alert(1)>';
  sequence.tracks[0].name = '<b>Untrusted track</b>';
  sequence.tracks[0].id = 'track" onclick="bad()';
  const html = renderMidi({
    sequence,
    title: '<img src=x>',
    caption: '<script>bad()</script>',
  });
  assert.doesNotMatch(html, /<img|<script>bad\(\)|<b>Untrusted/);
  assert.match(html, /&lt;img/);
});

test('invalid MIDI authoring parameters fail instead of silently changing playback', () => {
  for (const props of [
    { volume: NaN },
    { volume: Infinity },
    { volume: 2 },
    { volume: -1 },
    { tempo: 1 },
    { tempo: 241 },
    { height: Infinity },
    { height: 0 },
    { editable: 'false' },
    { loop: 'true' },
    { voice: 'unknown' },
    { preset: 'missing' },
    { src: 'javascript:alert(1)' },
    { src: 'data:audio/midi;base64,AA==' },
  ])
    assert.throws(() => renderMidi(props), undefined, JSON.stringify(props));
  assert.doesNotThrow(() =>
    renderMidi({ sequence: null, src: '', tempo: 0, voice: 'track' }),
  );
});
