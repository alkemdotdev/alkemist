import type {
  FormLine,
  FormObject,
  FormScene,
  FormSurface,
  Vec3,
} from './types';

const LENGTH_SEGMENTS = 128;
const WIDTH_SEGMENTS = 12;
const HALF_THICKNESS = 0.018;

/** Two oppositely phased sheets: long horizontal gestures with a real depth gap. */
function sheetPoint(u: number, v: number, side: number): Vec3 {
  const width = 0.43 + 0.18 * Math.cos((Math.PI * u) / 2) ** 2;
  const twist = side * (0.48 + 0.64 * Math.sin(Math.PI * 0.87 * u));
  return [
    2.66 * u,
    side * (0.42 + 0.43 * Math.sin(Math.PI * 0.84 * u)) +
      width * v * Math.cos(twist),
    side * (0.37 + 0.22 * Math.cos(Math.PI * 0.9 * u)) +
      width * v * Math.sin(twist),
  ];
}

function sheetNormal(u: number, v: number, side: number): Vec3 {
  const step = 0.0001;
  const before = sheetPoint(u - step, v, side);
  const after = sheetPoint(u + step, v, side);
  const across = sheetPoint(u, v + step, side);
  const point = sheetPoint(u, v, side);
  const a = after.map((value, axis) => value - before[axis]!) as Vec3;
  const b = across.map((value, axis) => value - point[axis]!) as Vec3;
  const normal: Vec3 = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const length = Math.hypot(...normal);
  return normal.map((value) => value / length) as Vec3;
}

function offsetPoint(u: number, v: number, side: number, amount: number): Vec3 {
  const point = sheetPoint(u, v, side);
  const normal = sheetNormal(u, v, side);
  return point.map((value, axis) => value + normal[axis]! * amount) as Vec3;
}

function createSheet(side: number): FormObject {
  const ink = side > 0 ? 'cyan' : 'violet';
  const surface: FormSurface = { positions: [], indices: [], ink };
  const row = WIDTH_SEGMENTS + 1;
  const layerSize = (LENGTH_SEGMENTS + 1) * row;
  for (const face of [1, -1]) {
    for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
      for (let j = 0; j <= WIDTH_SEGMENTS; j++) {
        surface.positions.push(
          ...offsetPoint(
            (2 * i) / LENGTH_SEGMENTS - 1,
            (2 * j) / WIDTH_SEGMENTS - 1,
            side,
            face * HALF_THICKNESS,
          ),
        );
      }
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    surface.indices.push(a, b, c, a, c, d);
  };
  for (let i = 0; i < LENGTH_SEGMENTS; i++) {
    for (let j = 0; j < WIDTH_SEGMENTS; j++) {
      const a = i * row + j;
      quad(a, a + row, a + row + 1, a + 1);
      quad(
        a + layerSize,
        a + 1 + layerSize,
        a + row + 1 + layerSize,
        a + row + layerSize,
      );
    }
    for (const edge of [0, WIDTH_SEGMENTS]) {
      const a = i * row + edge;
      quad(a, a + layerSize, a + row + layerSize, a + row);
    }
  }
  for (const end of [0, LENGTH_SEGMENTS * row]) {
    for (let j = 0; j < WIDTH_SEGMENTS; j++) {
      const a = end + j;
      quad(a, a + 1, a + 1 + layerSize, a + layerSize);
    }
  }

  const lines: FormLine[] = [];
  // Long contours carry the gesture; sparse transverse seams explain the sheet.
  for (let j = 0; j <= 24; j++) {
    const v = (2 * j) / 24 - 1;
    lines.push({
      ink,
      opacity: j === 0 || j === 24 ? 1 : 0.67,
      points: Array.from({ length: 161 }, (_, i) =>
        offsetPoint((2 * i) / 160 - 1, v, side, HALF_THICKNESS + 0.005),
      ),
    });
  }
  for (let i = 0; i <= 10; i++) {
    lines.push({
      ink,
      opacity: i === 0 || i === 10 ? 1 : 0.23,
      points: Array.from({ length: 25 }, (_, j) =>
        offsetPoint((2 * i) / 10 - 1, (2 * j) / 24 - 1, side, 0.024),
      ),
    });
  }
  if (side > 0) {
    lines.push({
      ink: 'rose',
      opacity: 0.95,
      points: Array.from({ length: 49 }, (_, i) =>
        offsetPoint(-0.38 + (i / 48) * 0.68, -1, side, 0.026),
      ),
    });
  }
  return {
    position: [0, 0, 0],
    rotation: [0.17, -0.11, -0.075],
    sway: [0.035, 0.065, 0.018],
    phase: side > 0 ? 0 : 2.2,
    lines,
    surfaces: [surface],
  };
}

export function createInterference(): FormScene {
  return { objects: [createSheet(1), createSheet(-1)], radius: 3.08 };
}
