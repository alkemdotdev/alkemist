import { mkdir, writeFile } from 'node:fs/promises';

const destination = new URL('../apps/site/public/test/', import.meta.url);
await mkdir(destination, { recursive: true });
const fixed = (value) => Number(value.toFixed(6));

// Analytic underdamped oscillator: m=1, omega0=2, zeta=0.12,
// x(0)=1 metre, v(0)=0. A teaching fixture, never a measured experiment.
const zeta = 0.12;
const omega0 = 2;
const gamma = zeta * omega0;
const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
const oscillation = ['time,position,velocity'];
for (let step = 0; step <= 300; step++) {
  const time = step * 0.04;
  const decay = Math.exp(-gamma * time);
  const position =
    decay *
    (Math.cos(omegaD * time) + (gamma / omegaD) * Math.sin(omegaD * time));
  const velocity =
    ((-decay * omega0 * omega0) / omegaD) * Math.sin(omegaD * time);
  oscillation.push([fixed(time), fixed(position), fixed(velocity)].join(','));
}
await writeFile(
  new URL('oscillation.csv', destination),
  oscillation.join('\n') + '\n',
);

// Invented counts of prototype components; arbitrary categories, no material property claims.
const materials = [
  ['material', 'value'],
  ['Aluminium', 32],
  ['Steel', 21],
  ['Polymer', 18],
  ['Copper', 12],
  ['Glass', 8],
  ['Silicon', 5],
  ['Ceramic', 3],
  ['Composite', 1],
];
await writeFile(
  new URL('materials.csv', destination),
  materials.map((row) => row.join(',')).join('\n') + '\n',
);

// Dimensionless analytic field, sampled on a regular 25 x 25 grid.
const field = ['x,y,value'];
for (let y = -12; y <= 12; y++)
  for (let x = -12; x <= 12; x++) {
    const px = x / 4;
    const py = y / 4;
    const value =
      Math.cos(px * 1.4) *
      Math.sin(py * 1.4) *
      Math.exp(-(px * px + py * py) / 8);
    field.push([fixed(px), fixed(py), fixed(value)].join(','));
  }
await writeFile(new URL('field.csv', destination), field.join('\n') + '\n');
console.log(
  'Generated deterministic synthetic fixtures: 301 oscillator rows, 8 component counts, 625 field samples.',
);
