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
