import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(
  new URL('../apps/site/public/test/', import.meta.url),
);
const fixtures = [
  [
    'tone.wav',
    [
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=2:sample_rate=22050',
      '-af',
      'volume=0.15,afade=t=in:d=0.1,afade=t=out:st=1.8:d=0.2',
      '-c:a',
      'pcm_s16le',
    ],
  ],
  [
    'waves.mp4',
    [
      '-f',
      'lavfi',
      '-i',
      'nullsrc=s=640x360:r=24:d=3,geq=r=30+25*sin(X/35+T*2):g=70+40*sin(Y/30-T*2):b=120+70*sin((X+Y)/50+T)',
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
    ],
  ],
  [
    'media-study.wav',
    [
      '-f',
      'lavfi',
      '-i',
      'aevalsrc=0.06*sin(2*PI*if(lt(t\\,10)\\,220\\,if(lt(t\\,20)\\,330\\,440))*t):s=22050:d=30',
      '-af',
      'afade=t=in:d=0.3,afade=t=out:st=29:d=1',
      '-c:a',
      'pcm_s16le',
    ],
  ],
  [
    'media-study.mp4',
    [
      '-f',
      'lavfi',
      '-i',
      'nullsrc=s=640x360:r=24:d=30,geq=r=30+25*sin(X/35+T*2):g=70+40*sin(Y/30-T*2):b=120+70*sin((X+Y)/50+T)',
      '-i',
      root + 'media-study.wav',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-crf',
      '25',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      '-movflags',
      '+faststart',
    ],
  ],
  [
    'media-poster.jpg',
    ['-i', root + 'media-study.mp4', '-frames:v', '1', '-q:v', '3'],
  ],
];
for (const [name, args] of fixtures) {
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', ...args, root + name],
    { stdio: 'inherit' },
  );
  if (result.status !== 0)
    throw new Error(
      `FFmpeg failed generating ${name}: ${result.error ?? result.status}`,
    );
}
console.log('Generated local audio and video teaching fixtures.');

const cues = (lines) =>
  'WEBVTT\n\n' +
  lines
    .map(
      (text, i) =>
        `00:00:${String(i * 10).padStart(2, '0')}.000 --> 00:00:${String((i + 1) * 10).padStart(2, '0')}.000\n${text}\n`,
    )
    .join('\n');
writeFileSync(
  root + 'media-en.vtt',
  cues([
    '[Low tone] Blue waves drift across the frame.',
    '[Middle tone] The wave pattern continues.',
    '[Higher tone fades] The study concludes.',
  ]),
);
writeFileSync(
  root + 'media-es.vtt',
  cues([
    '[Tono grave] Ondas azules cruzan la imagen.',
    '[Tono medio] El patrón de ondas continúa.',
    '[El tono agudo se desvanece] Termina el estudio.',
  ]),
);
writeFileSync(
  root + 'media-chapters.vtt',
  cues(['Low tone', 'Middle tone', 'High tone']),
);
