import type { AlkInk } from '@alkemist/ui/palette';
import type {
  FormLine,
  FormObject,
  FormScene,
  FormSurface,
  Vec3,
} from './types';

type Band = {
  radius: number;
  width: number;
  start: number;
  sweep: number;
  ellipse: number;
  ink: AlkInk;
  rotation: Vec3;
  phase: number;
};

function orbitalBand(band: Band): FormObject {
  const segments = 144;
  const depth = 0.055;
  const positions: number[] = [];
  const indices: number[] = [];
  const edges: Vec3[][] = [[], [], [], []];

  for (let step = 0; step <= segments; step++) {
    const angle = band.start + (step / segments) * band.sweep;
    // A rectangular section gives the arcs the weight of bent sheet metal.
    for (let corner = 0; corner < 4; corner++) {
      const outer = corner === 0 || corner === 3;
      const front = corner < 2;
      const radius = band.radius + (outer ? 0.5 : -0.5) * band.width;
      const point: Vec3 = [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * band.ellipse,
        (front ? 0.5 : -0.5) * depth,
      ];
      positions.push(...point);
      edges[corner].push(point);
    }
    if (step === segments) continue;
    for (let side = 0; side < 4; side++) {
      const a = step * 4 + side;
      const b = step * 4 + ((side + 1) % 4);
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const end = segments * 4;
  indices.push(
    0,
    3,
    1,
    1,
    3,
    2,
    end,
    end + 1,
    end + 3,
    end + 1,
    end + 2,
    end + 3,
  );

  const lines: FormLine[] = edges.map((points) => ({ points, ink: band.ink }));
  for (const edge of [0, segments]) {
    lines.push({
      points: [
        edges[0][edge],
        edges[1][edge],
        edges[2][edge],
        edges[3][edge],
        edges[0][edge],
      ],
      ink: band.ink,
    });
  }
  return {
    position: [0, 0, 0],
    rotation: band.rotation,
    sway: [0.05, 0.07, 0.025],
    phase: band.phase,
    lines,
    surfaces: [{ positions, indices, ink: band.ink }],
  };
}

function seed(): FormObject {
  const rows = 28;
  const columns = 40;
  const positions: number[] = [];
  const indices: number[] = [];
  const lines: FormLine[] = [];
  const point = (latitude: number, longitude: number): Vec3 => [
    0.29 * Math.sin(latitude) * Math.cos(longitude),
    0.46 * Math.cos(latitude),
    0.29 * Math.sin(latitude) * Math.sin(longitude),
  ];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      positions.push(
        ...point((row / rows) * Math.PI, (column / columns) * Math.PI * 2),
      );
      if (row === rows || column === columns) continue;
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      if (row > 0) indices.push(a, a + 1, b);
      if (row < rows - 1) indices.push(a + 1, b + 1, b);
    }
  }
  // Four meridians preserve the seed in the line-only fallback.
  for (let meridian = 0; meridian < 4; meridian++) {
    const points: Vec3[] = [];
    for (let step = 0; step <= 64; step++) {
      points.push(point((step / 64) * Math.PI * 2, (meridian / 4) * Math.PI));
    }
    lines.push({ points, ink: 'vermilion', opacity: 0.65 });
  }
  const surface: FormSurface = { positions, indices, ink: 'vermilion' };
  return {
    position: [0.16, -0.08, 0.13],
    rotation: [0.2, -0.15, -0.4],
    sway: [0.025, 0.035, 0.035],
    phase: 1.4,
    lines,
    surfaces: [surface],
  };
}

/** Open orbital arcs: width, cut positions and plane inclination are the design controls. */
export function createOrbit(): FormScene {
  return {
    radius: 3.2,
    objects: [
      orbitalBand({
        radius: 2.7,
        width: 0.23,
        start: -0.21,
        sweep: Math.PI * 1.57,
        ellipse: 0.9,
        ink: 'cobalt',
        rotation: [0.45, -0.34, -0.35],
        phase: 0,
      }),
      orbitalBand({
        radius: 2.15,
        width: 0.19,
        start: 0.8,
        sweep: Math.PI * 1.56,
        ellipse: 0.95,
        ink: 'cyan',
        rotation: [1.08, 0.5, 0.24],
        phase: 1.8,
      }),
      orbitalBand({
        radius: 1.32,
        width: 0.14,
        start: -1.28,
        sweep: Math.PI * 1.64,
        ellipse: 0.92,
        ink: 'cobalt',
        rotation: [-0.55, 0.65, -0.72],
        phase: 3.5,
      }),
      seed(),
    ],
  };
}
