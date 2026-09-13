import { mkdir, writeFile } from 'node:fs/promises';
import {
  getMidiPreset,
  exportMidi,
} from '../packages/components/src/midi-model.ts';

const directory = new URL('../apps/site/public/test/music/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const id of ['nocturne', 'pulse', 'bassline', 'ensemble']) {
  const sequence = getMidiPreset(id);
  const bytes = await exportMidi(sequence);
  await writeFile(new URL(`${id}.mid`, directory), bytes);
  console.log(`${id}: ${bytes.length} bytes`);
}
