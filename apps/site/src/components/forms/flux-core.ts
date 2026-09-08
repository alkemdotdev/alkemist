import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const TAU = Math.PI * 2;
const point = (theta: number, phi: number, L: number): Vec3 => {
  const r = L * Math.sin(theta) ** 2;
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
};
function normal(theta: number, phi: number): Vec3 {
  const a = 3 * Math.sin(theta) ** 2 * Math.cos(theta);
  const b = Math.sin(theta) * (2 * Math.cos(theta) ** 2 - Math.sin(theta) ** 2);
  const norm = Math.hypot(a, b);
  return [(b * Math.cos(phi)) / norm, -a / norm, (b * Math.sin(phi)) / norm];
}
/** Finite-thickness strips follow dipole shells; their width is an art choice. */
function ribbon(surface: FormSurface, L: number, phi: number, width: number) {
  const start = Math.asin(Math.sqrt(0.8 / L));
  const rows = 112,
    columns = 5,
    base = surface.positions.length / 3;
  const index = (side: number, u: number, v: number) =>
    base + side * (rows + 1) * (columns + 1) + u * (columns + 1) + v;
  for (let side = 0; side < 2; side++)
    for (let u = 0; u <= rows; u++)
      for (let v = 0; v <= columns; v++) {
        const theta = start + ((Math.PI - 2 * start) * u) / rows;
        const angle =
          phi + width * ((2 * v) / columns - 1) * (0.7 + 0.3 * Math.sin(theta));
        const p = point(theta, angle, L),
          n = normal(theta, angle);
        surface.positions.push(
          ...p.map((value, i) => value + n[i]! * (side ? 0.022 : -0.022)),
        );
      }
  const quad = (a: number, b: number, c: number, d: number) =>
    surface.indices.push(a, b, c, a, c, d);
  for (let u = 0; u < rows; u++)
    for (let v = 0; v < columns; v++) {
      quad(
        index(0, u, v),
        index(0, u + 1, v),
        index(0, u + 1, v + 1),
        index(0, u, v + 1),
      );
      quad(
        index(1, u, v),
        index(1, u, v + 1),
        index(1, u + 1, v + 1),
        index(1, u + 1, v),
      );
    }
  for (let u = 0; u < rows; u++) {
    quad(
      index(0, u, 0),
      index(1, u, 0),
      index(1, u + 1, 0),
      index(0, u + 1, 0),
    );
    quad(
      index(0, u, columns),
      index(0, u + 1, columns),
      index(1, u + 1, columns),
      index(1, u, columns),
    );
  }
  for (let v = 0; v < columns; v++) {
    quad(
      index(0, 0, v),
      index(0, 0, v + 1),
      index(1, 0, v + 1),
      index(1, 0, v),
    );
    quad(
      index(0, rows, v),
      index(1, rows, v),
      index(1, rows, v + 1),
      index(0, rows, v + 1),
    );
  }
}
function corePoint(theta: number, phi: number): Vec3 {
  const r =
    0.72 +
    0.025 * Math.cos(36 * phi) * Math.sin(theta) ** 2 +
    0.013 * Math.cos(28 * theta);
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
}
export function createFluxCore(): FormScene {
  const lines: FormLine[] = [],
    surfaces: FormSurface[] = [];
  const shells: {
    L: number;
    count: number;
    width: number;
    ink: FormInk;
    ramp: NonNullable<FormSurface['colorRamp']>['inks'];
  }[] = [
    {
      L: 1.35,
      count: 8,
      width: 0.18,
      ink: 'rose',
      ramp: ['vermilion', 'rose', 'violet'],
    },
    {
      L: 2.0,
      count: 10,
      width: 0.14,
      ink: 'violet',
      ramp: ['rose', 'violet', 'cobalt'],
    },
    {
      L: 2.65,
      count: 12,
      width: 0.12,
      ink: 'cobalt',
      ramp: ['violet', 'cobalt', 'cyan'],
    },
    {
      L: 3.25,
      count: 12,
      width: 0.1,
      ink: 'cyan',
      ramp: ['cobalt', 'cyan', 'teal'],
    },
  ];
  shells.forEach((shell, layer) => {
    const surface: FormSurface = {
      positions: [],
      indices: [],
      ink: shell.ink,
      colorRamp: { axis: 1, inks: shell.ramp },
      roughness: 0.28,
      metalness: 0.4,
    };
    for (let j = 0; j < shell.count; j++) {
      const phi = (TAU * j) / shell.count + layer * 0.13;
      // A narrow opening reveals the nested warm shells without flattening the volume.
      if (layer > 1 && j === 2) continue;
      ribbon(surface, shell.L, phi, shell.width);
      const start = Math.asin(Math.sqrt(0.8 / shell.L));
      for (const fraction of [-0.98, -0.45, 0.45, 0.98]) {
        const samples = Array.from({ length: 145 }, (_, i) => {
          const t = start + ((Math.PI - 2 * start) * i) / 144;
          const angle =
            phi + shell.width * fraction * (0.7 + 0.3 * Math.sin(t));
          const p = point(t, angle, shell.L),
            n = normal(t, angle);
          return p.map((value, k) => value + n[k]! * 0.024) as Vec3;
        });
        lines.push({
          points: samples,
          ink: Math.abs(fraction) > 0.9 ? 'cyan' : 'silver',
          opacity: Math.abs(fraction) > 0.9 ? 0.68 : 0.22,
        });
      }
    }
    surfaces.push(surface);
  });
  for (let layer = 0; layer < 7; layer++) {
    const L = 1.1 + layer * 0.39,
      start = Math.asin(Math.sqrt(0.79 / L));
    for (let i = 0; i < 28; i++) {
      const phi = (TAU * i) / 28 + 0.06;
      lines.push({
        ink: layer < 2 ? 'rose' : layer < 4 ? 'violet' : 'cyan',
        opacity: layer === 6 ? 0.46 : 0.28,
        points: Array.from({ length: 129 }, (_, j) =>
          point(start + ((Math.PI - 2 * start) * j) / 128, phi, L),
        ),
      });
    }
  }
  const core: FormSurface = {
    positions: [],
    indices: [],
    ink: 'vermilion',
    colorRamp: { axis: 1, inks: ['vermilion', 'rose', 'ochre'] },
    roughness: 0.32,
    metalness: 0.48,
  };
  const rows = 64,
    columns = 144;
  for (let u = 0; u <= rows; u++)
    for (let v = 0; v <= columns; v++) {
      core.positions.push(
        ...corePoint((Math.PI * u) / rows, (TAU * v) / columns),
      );
      if (u < rows && v < columns) {
        const a = u * (columns + 1) + v,
          b = a + columns + 1;
        if (u > 0) core.indices.push(a, b, a + 1);
        if (u < rows - 1) core.indices.push(a + 1, b, b + 1);
      }
    }
  surfaces.push(core);
  for (let j = 0; j < 36; j++)
    lines.push({
      ink: 'ochre',
      opacity: 0.78,
      points: Array.from(
        { length: 129 },
        (_, u) =>
          corePoint((Math.PI * u) / 128, (TAU * j) / 36).map(
            (value) => value * 1.004,
          ) as Vec3,
      ),
    });
  for (let j = 1; j < 16; j++)
    lines.push({
      ink: 'graphite',
      opacity: 0.74,
      points: Array.from(
        { length: 145 },
        (_, v) =>
          corePoint((Math.PI * j) / 16, (TAU * v) / 144).map(
            (value) => value * 1.005,
          ) as Vec3,
      ),
    });
  return {
    radius: 3.5,
    objects: [
      {
        position: [0, 0, 0],
        rotation: [0.48, -0.34, -0.32],
        sway: [0.026, 0.05, 0.008],
        surfaces,
        lines,
      },
    ],
    annotations: [
      {
        object: 0,
        point: [0, 0.72, 0],
        label: 'Ribbed core',
        detail: 'Nested shells open around it',
        offset: [65, -80],
      },
      {
        object: 0,
        point: point(Math.PI / 2, Math.PI, 3.25),
        label: 'Thick field ribbons',
        detail: 'r = L sin² θ · four layers',
        offset: [-90, 40],
      },
    ],
  };
}
