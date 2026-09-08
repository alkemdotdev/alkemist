import type { AlkInk } from '@alkemist/ui/palette';
import type {
  FormLine,
  FormObject,
  FormScene,
  FormSurface,
  Vec3,
} from './types';

const TAU = Math.PI * 2;

function rotate([x, y, z]: Vec3, [rx, ry, rz]: Vec3): Vec3 {
  const y1 = y * Math.cos(rx) - z * Math.sin(rx);
  const z1 = y * Math.sin(rx) + z * Math.cos(rx);
  const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
  const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
  return [
    x2 * Math.cos(rz) - y1 * Math.sin(rz),
    x2 * Math.sin(rz) + y1 * Math.cos(rz),
    z2,
  ];
}

function addQuad(surface: FormSurface, a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  const start = surface.positions.length / 3;
  surface.positions.push(...a, ...b, ...c, ...d);
  surface.indices.push(
    start,
    start + 1,
    start + 2,
    start,
    start + 2,
    start + 3,
  );
}

/** A triangular frame on every icosahedral face, leaving an aperture to its core. */
function facetedShell(): FormObject {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices: Vec3[] = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const scale = 0.96 / Math.hypot(1, phi);
  const normalized = vertices.map(
    (point) => point.map((v) => v * scale) as Vec3,
  );
  const surface: FormSurface = { positions: [], indices: [], ink: 'cobalt' };
  const lines: FormLine[] = [];
  for (const face of faces) {
    const corners = face.map((index) => normalized[index]!);
    const center = [0, 1, 2].map(
      (axis) => corners.reduce((sum, point) => sum + point[axis]!, 0) / 3,
    ) as Vec3;
    const normal = center.map((value) => value / Math.hypot(...center)) as Vec3;
    const loop = (fraction: number, depth: number) =>
      corners.map(
        (point) =>
          point.map(
            (value, axis) =>
              center[axis]! +
              (value - center[axis]!) * fraction +
              normal[axis]! * depth,
          ) as Vec3,
      );
    const outer = loop(0.96, 0.026);
    const inner = loop(0.61, 0.026);
    const outerBack = loop(0.96, -0.026);
    const innerBack = loop(0.61, -0.026);
    for (let edge = 0; edge < 3; edge++) {
      const next = (edge + 1) % 3;
      addQuad(surface, outer[edge]!, outer[next]!, inner[next]!, inner[edge]!);
      addQuad(
        surface,
        outerBack[edge]!,
        innerBack[edge]!,
        innerBack[next]!,
        outerBack[next]!,
      );
      addQuad(
        surface,
        outer[edge]!,
        outerBack[edge]!,
        outerBack[next]!,
        outer[next]!,
      );
      addQuad(
        surface,
        inner[edge]!,
        inner[next]!,
        innerBack[next]!,
        innerBack[edge]!,
      );
    }
    for (const points of [loop(0.96, 0.029), loop(0.61, 0.029)]) {
      lines.push({
        points: [...points, points[0]!],
        ink: 'cobalt',
        opacity: 0.85,
      });
    }
  }
  return {
    position: [-1.94, 0.15, 0],
    rotation: [0.17, -0.28, 0.16],
    sway: [0.04, 0.095, 0.025],
    phase: 0.3,
    surfaces: [surface],
    lines,
  };
}

function annulus(
  radius: number,
  width: number,
  depth: number,
  ink: AlkInk,
  rotation: Vec3 = [0, 0, 0],
  position: Vec3 = [0, 0, 0],
): { surface: FormSurface; lines: FormLine[] } {
  const segments = 96;
  const surface: FormSurface = { positions: [], indices: [], ink };
  const corners = [
    [radius - width / 2, -depth / 2],
    [radius + width / 2, -depth / 2],
    [radius + width / 2, depth / 2],
    [radius - width / 2, depth / 2],
  ];
  const point = (angle: number, corner: number): Vec3 => {
    const [r, z] = corners[corner]!;
    const transformed = rotate(
      [r! * Math.cos(angle), r! * Math.sin(angle), z!],
      rotation,
    );
    return transformed.map((value, axis) => value + position[axis]!) as Vec3;
  };
  for (let i = 0; i < segments; i++) {
    for (let corner = 0; corner < 4; corner++) {
      const next = (corner + 1) % 4;
      addQuad(
        surface,
        point((TAU * i) / segments, corner),
        point((TAU * (i + 1)) / segments, corner),
        point((TAU * (i + 1)) / segments, next),
        point((TAU * i) / segments, next),
      );
    }
  }
  return {
    surface,
    lines: corners.map((_, corner) => ({
      ink,
      opacity: 0.85,
      points: Array.from({ length: segments + 1 }, (_, i) =>
        point((TAU * i) / segments, corner),
      ),
    })),
  };
}

function spring(): FormObject {
  const segments = 320;
  const crossSections = 10;
  const turns = 4.15;
  const coilRadius = 0.46;
  const tubeRadius = 0.082;
  const height = 1.95;
  const point = (u: number, v: number, offset = 0): Vec3 => {
    const theta = u * TAU * turns;
    // The second cross-section vector is orthogonal to the helix tangent.
    const pitch = height / (TAU * turns);
    const normalLength = Math.hypot(coilRadius, pitch);
    const radial = (tubeRadius + offset) * Math.cos(v);
    const binormal = (tubeRadius + offset) * Math.sin(v);
    return [
      (coilRadius + radial) * Math.cos(theta) -
        (binormal * pitch * Math.sin(theta)) / normalLength,
      height * (u - 0.5) - (binormal * coilRadius) / normalLength,
      (coilRadius + radial) * Math.sin(theta) +
        (binormal * pitch * Math.cos(theta)) / normalLength,
    ];
  };
  const surface: FormSurface = { positions: [], indices: [], ink: 'ochre' };
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < crossSections; j++)
      surface.positions.push(...point(i / segments, (TAU * j) / crossSections));
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < crossSections; j++) {
      const a = i * crossSections + j;
      const b = i * crossSections + ((j + 1) % crossSections);
      surface.indices.push(
        a,
        b,
        b + crossSections,
        a,
        b + crossSections,
        a + crossSections,
      );
    }
  }
  // Close the tube ends: the spring is a small solid, not an open sheet.
  for (const end of [0, segments]) {
    const center = surface.positions.length / 3;
    const theta = (end / segments) * TAU * turns;
    surface.positions.push(
      coilRadius * Math.cos(theta),
      height * (end / segments - 0.5),
      coilRadius * Math.sin(theta),
    );
    for (let j = 0; j < crossSections; j++) {
      surface.indices.push(
        center,
        end * crossSections + j,
        end * crossSections + ((j + 1) % crossSections),
      );
    }
  }
  const lines: FormLine[] = Array.from({ length: 4 }, (_, j) => ({
    ink: 'ochre',
    opacity: 0.86,
    points: Array.from({ length: 321 }, (_, i) =>
      point(i / 320, (TAU * j) / 4, 0.003),
    ),
  }));
  const surfaces = [surface];
  for (const end of [-1, 1]) {
    const washer = annulus(
      0.46,
      0.2,
      0.072,
      'ochre',
      [Math.PI / 2, 0, 0],
      [0, end * 1.07, 0],
    );
    surfaces.push(washer.surface);
    lines.push(...washer.lines);
  }
  return {
    position: [-0.08, 0.02, 0.2],
    rotation: [0.24, -0.18, -0.14],
    sway: [0.05, 0.04, 0.04],
    phase: 2,
    surfaces,
    lines,
  };
}

function gyroscope(): FormObject {
  const rings = [
    annulus(0.89, 0.1, 0.11, 'teal'),
    annulus(0.68, 0.085, 0.085, 'teal', [0.45, 0.92, 0.2]),
    annulus(0.46, 0.075, 0.075, 'teal', [1.14, -0.45, -0.15]),
  ];
  return {
    position: [1.75, 0.17, 0],
    rotation: [0.29, -0.3, -0.22],
    sway: [0.07, 0.06, 0.03],
    phase: 4,
    surfaces: rings.map(({ surface }) => surface),
    lines: rings.flatMap(({ lines }) => lines),
  };
}

export function createAssembly(): FormScene {
  return { objects: [facetedShell(), spring(), gyroscope()], radius: 3.05 };
}
