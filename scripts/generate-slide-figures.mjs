import { mkdir, writeFile } from 'node:fs/promises';

// Deterministic teaching figures: x(t) = exp(-0.18t) cos(2.4t).
// Keeping labels, samples, and palettes here makes the Markdown images editable.
const output = new URL(
  '../apps/site/src/content/slides/assets/',
  import.meta.url,
);
await mkdir(output, { recursive: true });
for (const [name, paper, ink, muted, rule, accent] of [
  ['light', '#f4f7fb', '#14283d', '#536779', '#c6d2df', '#285a9e'],
  ['dark', '#192c29', '#ecf0dd', '#b5c6b4', '#466058', '#f2d58b'],
]) {
  const project = (t, x) => [64 + (t / 12) * 690, 54 + ((1 - x) / 2) * 238];
  const lines = [];
  for (let t = 0; t <= 12; t += 2) {
    const [x] = project(t, 0);
    lines.push(
      `<path d="M${x} 54V292"/><text stroke="none" x="${x}" y="316" text-anchor="middle">${t}</text>`,
    );
  }
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    const [, y] = project(0, x);
    lines.push(
      `<path d="M64 ${y}H754"/><text stroke="none" x="50" y="${y + 5}" text-anchor="end">${x}</text>`,
    );
  }
  const curve = Array.from({ length: 301 }, (_, i) => {
    const t = i * 0.04;
    return project(t, Math.exp(-0.18 * t) * Math.cos(2.4 * t))
      .map((n) => n.toFixed(2))
      .join(',');
  }).join(' ');
  await writeFile(
    new URL(`signal-${name}.svg`, output),
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360" viewBox="0 0 800 360" role="img" aria-labelledby="title desc"><title id="title">Damped motion on ${name} paper</title><desc id="desc">A synthetic decaying oscillation, x(t) equals exp(-0.18t) cos(2.4t), shown from zero to twelve seconds.</desc><rect width="800" height="360" rx="12" fill="${paper}"/><text x="64" y="30" fill="${ink}" font-family="system-ui,sans-serif" font-size="18">One signal. The same scale.</text><g stroke="${rule}" stroke-width="1" fill="${muted}" font-family="system-ui,sans-serif" font-size="13">${lines.join('')}</g><polyline points="${curve}" fill="none" stroke="${accent}" stroke-width="3"/><text x="410" y="345" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="${ink}">Time (s)</text><text transform="translate(18 175) rotate(-90)" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="${ink}">Displacement (m)</text></svg>\n`,
  );
}
