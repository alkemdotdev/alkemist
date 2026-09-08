import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const CELLS = 44;
const HALF_EXTENT = 2;
const STEP = (HALF_EXTENT * 2) / CELLS;
const CUT = 2.35;
const EPSILON = 1e-9;
const PHASE: Vec3 = [0.17, -0.11, 0.23];

// This level set approximates the gyroid; it is not the exact minimal surface.
function field([x, y, z]: Vec3): number {
  const u = Math.PI * x + PHASE[0];
  const v = Math.PI * y + PHASE[1];
  const w = Math.PI * z + PHASE[2];
  return (
    Math.sin(u) * Math.cos(v) +
    Math.sin(v) * Math.cos(w) +
    Math.sin(w) * Math.cos(u)
  );
}

function gradient([x, y, z]: Vec3): Vec3 {
  const u = Math.PI * x + PHASE[0];
  const v = Math.PI * y + PHASE[1];
  const w = Math.PI * z + PHASE[2];
  return [
    Math.PI * (Math.cos(u) * Math.cos(v) - Math.sin(w) * Math.sin(u)),
    Math.PI * (Math.cos(v) * Math.cos(w) - Math.sin(u) * Math.sin(v)),
    Math.PI * (Math.cos(w) * Math.cos(u) - Math.sin(v) * Math.sin(w)),
  ];
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const key = (point: Vec3) =>
  point.map((value) => Math.round(value * 1e7)).join(',');
const vertex = (positions: number[], index: number): Vec3 => [
  positions[index * 3]!,
  positions[index * 3 + 1]!,
  positions[index * 3 + 2]!,
];

/** Shared tetrahedral edges share a vertex in the indexed nodal mesh. */
function nodalMesh(): FormSurface {
  const width = CELLS + 1;
  const count = width ** 3;
  const points: Vec3[] = new Array(count);
  const samples = new Float64Array(count);
  const gridIndex = (x: number, y: number, z: number) =>
    x + width * (y + width * z);
  for (let z = 0; z < width; z++) {
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        const id = gridIndex(x, y, z);
        points[id] = [
          -HALF_EXTENT + x * STEP,
          -HALF_EXTENT + y * STEP,
          -HALF_EXTENT + z * STEP,
        ];
        samples[id] = field(points[id]!);
      }
    }
  }
  const positions: number[] = [];
  const indices: number[] = [];
  const intersections = new Map<string, number>();
  const crossing = (a: number, b: number): number => {
    const id =
      Math.abs(samples[a]!) < EPSILON
        ? `v${a}`
        : Math.abs(samples[b]!) < EPSILON
          ? `v${b}`
          : a < b
            ? `${a}:${b}`
            : `${b}:${a}`;
    const existing = intersections.get(id);
    if (existing !== undefined) return existing;
    const first = points[a]!,
      second = points[b]!;
    let t = samples[a]! / (samples[a]! - samples[b]!);
    // Refine the linear crossing against the analytic field, staying on its edge.
    // The triangles between roots remain a finite-resolution approximation.
    let low = 0,
      high = 1;
    for (let iteration = 0; iteration < 16; iteration++) {
      const point = lerp(first, second, t);
      const value = field(point);
      if (Math.abs(value) < 1e-12) break;
      if (value < 0 === samples[a]! < 0) low = t;
      else high = t;
      const normal = gradient(point);
      const derivative = normal.reduce(
        (sum, value, axis) => sum + value * (second[axis]! - first[axis]!),
        0,
      );
      const next = Math.abs(derivative) > 1e-10 ? t - value / derivative : NaN;
      t =
        Number.isFinite(next) && next > low && next < high
          ? next
          : (low + high) / 2;
    }
    const result = positions.length / 3;
    positions.push(...lerp(first, second, t));
    intersections.set(id, result);
    return result;
  };
  const triangle = (a: number, b: number, c: number) => {
    if (a === b || b === c || c === a) return;
    const pa = vertex(positions, a),
      pb = vertex(positions, b),
      pc = vertex(positions, c);
    const ab = pb.map((value, axis) => value - pa[axis]!) as Vec3;
    const ac = pc.map((value, axis) => value - pa[axis]!) as Vec3;
    const cross: Vec3 = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    if (Math.hypot(...cross) < 1e-12) return;
    const normal = gradient(
      pa.map((value, axis) => (value + pb[axis]! + pc[axis]!) / 3) as Vec3,
    );
    if (cross.reduce((sum, value, axis) => sum + value * normal[axis]!, 0) < 0)
      indices.push(a, c, b);
    else indices.push(a, b, c);
  };
  // A consistent body diagonal makes every neighbouring cube share its face split.
  const tetrahedra = [
    [0, 1, 2, 6],
    [0, 2, 3, 6],
    [0, 3, 7, 6],
    [0, 7, 4, 6],
    [0, 4, 5, 6],
    [0, 5, 1, 6],
  ];
  for (let z = 0; z < CELLS; z++) {
    for (let y = 0; y < CELLS; y++) {
      for (let x = 0; x < CELLS; x++) {
        const cube = [
          gridIndex(x, y, z),
          gridIndex(x + 1, y, z),
          gridIndex(x + 1, y + 1, z),
          gridIndex(x, y + 1, z),
          gridIndex(x, y, z + 1),
          gridIndex(x + 1, y, z + 1),
          gridIndex(x + 1, y + 1, z + 1),
          gridIndex(x, y + 1, z + 1),
        ];
        for (const tetrahedron of tetrahedra) {
          const inside: number[] = [],
            outside: number[] = [];
          for (const corner of tetrahedron) {
            const id = cube[corner]!;
            (samples[id]! < 0 ? inside : outside).push(id);
          }
          if (!inside.length || !outside.length) continue;
          if (inside.length === 1 || outside.length === 1) {
            const single = inside.length === 1 ? inside[0]! : outside[0]!;
            const other = inside.length === 1 ? outside : inside;
            triangle(
              crossing(single, other[0]!),
              crossing(single, other[1]!),
              crossing(single, other[2]!),
            );
          } else {
            const a = crossing(inside[0]!, outside[0]!),
              b = crossing(inside[0]!, outside[1]!);
            const c = crossing(inside[1]!, outside[1]!),
              d = crossing(inside[1]!, outside[0]!);
            triangle(a, b, c);
            triangle(a, c, d);
          }
        }
      }
    }
  }
  return {
    positions,
    indices,
    ink: 'teal',
    colorRamp: { axis: 1, inks: ['cobalt', 'cyan', 'teal'] },
    roughness: 0.3,
    metalness: 0.3,
  };
}

/** Clip the mesh to x + z <= CUT, preserving indexed edges at the section. */
function sectionedMesh(input: FormSurface): FormSurface {
  const positions: number[] = [],
    indices: number[] = [],
    normals: number[] = [];
  const vertices = new Map<string, number>();
  const append = (point: Vec3) => {
    const id = key(point);
    const existing = vertices.get(id);
    if (existing !== undefined) return existing;
    const result = positions.length / 3;
    positions.push(...point);
    // The analytic gradient avoids shading noise from irregular tetrahedral
    // triangles. It stays object-local; the renderer applies rotation and sway.
    const normal = gradient(point);
    const length = Math.hypot(...normal);
    normals.push(...normal.map((component) => component / length));
    vertices.set(id, result);
    return result;
  };
  for (let index = 0; index < input.indices.length; index += 3) {
    const original = input.indices
      .slice(index, index + 3)
      .map((id) => vertex(input.positions, id));
    const clipped: Vec3[] = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = original[edge]!,
        b = original[(edge + 1) % 3]!;
      const da = a[0] + a[2] - CUT,
        db = b[0] + b[2] - CUT;
      if (da <= EPSILON) clipped.push(a);
      if ((da < -EPSILON && db > EPSILON) || (da > EPSILON && db < -EPSILON))
        clipped.push(lerp(a, b, da / (da - db)));
    }
    if (clipped.length < 3) continue;
    const polygon = clipped.map(append);
    for (let corner = 1; corner < polygon.length - 1; corner++) {
      const a = polygon[0]!,
        b = polygon[corner]!,
        c = polygon[corner + 1]!;
      if (a !== b && b !== c && c !== a) indices.push(a, b, c);
    }
  }
  return { ...input, positions, indices, normals };
}

/** Join section segments into polylines instead of creating a draw call per edge. */
function contours(
  surface: FormSurface,
  normal: Vec3,
  distance: number,
  ink: FormInk,
  opacity: number,
): FormLine[] {
  const points = new Map<string, Vec3>();
  const adjacency = new Map<string, Set<string>>();
  const addSegment = (a: Vec3, b: Vec3) => {
    const ka = key(a),
      kb = key(b);
    if (ka === kb) return;
    points.set(ka, a);
    points.set(kb, b);
    if (!adjacency.has(ka)) adjacency.set(ka, new Set());
    if (!adjacency.has(kb)) adjacency.set(kb, new Set());
    adjacency.get(ka)!.add(kb);
    adjacency.get(kb)!.add(ka);
  };
  for (let index = 0; index < surface.indices.length; index += 3) {
    const triangle = surface.indices
      .slice(index, index + 3)
      .map((id) => vertex(surface.positions, id));
    const crossings = new Map<string, Vec3>();
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge]!,
        b = triangle[(edge + 1) % 3]!;
      const da = a.reduce(
        (sum, value, axis) => sum + value * normal[axis]!,
        -distance,
      );
      const db = b.reduce(
        (sum, value, axis) => sum + value * normal[axis]!,
        -distance,
      );
      if (Math.abs(da) < EPSILON) crossings.set(key(a), a);
      if (da * db < -(EPSILON ** 2)) {
        const point = lerp(a, b, da / (da - db));
        crossings.set(key(point), point);
      }
    }
    const segment = [...crossings.values()];
    if (segment.length === 2) addSegment(segment[0]!, segment[1]!);
  }
  const lines: FormLine[] = [];
  const walk = (start: string) => {
    const path: Vec3[] = [points.get(start)!];
    let current = start;
    while (adjacency.get(current)!.size) {
      const next = adjacency.get(current)!.values().next().value!;
      adjacency.get(current)!.delete(next);
      adjacency.get(next)!.delete(current);
      path.push(points.get(next)!);
      current = next;
    }
    if (path.length > 2) lines.push({ points: path, ink, opacity });
  };
  for (const [point, neighbours] of adjacency)
    if (neighbours.size === 1) walk(point);
  for (const [point, neighbours] of adjacency) if (neighbours.size) walk(point);
  return lines;
}

export function createStrata(): FormScene {
  const surface = sectionedMesh(nodalMesh());
  const lines: FormLine[] = [
    ...contours(surface, [1, 0, 1], CUT, 'vermilion', 0.95),
    ...contours(surface, [0, 1, 0], 0, 'ochre', 0.9),
    ...contours(surface, [0, 0, 1], -2, 'construction', 0.6),
    ...contours(surface, [1, 0, 0], -2, 'construction', 0.6),
  ];
  const footprint: Vec3[] = [
    [-2, -2, -2],
    [2, -2, -2],
    [2, -2, CUT - 2],
    [CUT - 2, -2, 2],
    [-2, -2, 2],
    [-2, -2, -2],
  ];
  for (const y of [-2, 2])
    lines.push({
      points: footprint.map(([x, , z]) => [x, y, z]),
      ink: 'construction',
      opacity: 0.35,
    });
  for (const [x, , z] of footprint.slice(0, -1))
    lines.push({
      points: [
        [x, -2, z],
        [x, 2, z],
      ],
      ink: 'construction',
      opacity: 0.28,
    });
  // The dimension marks span one actual period: 2 world units = 2π field units.
  lines.push({
    points: [
      [-2, -2.2, 2],
      [0, -2.2, 2],
    ],
    ink: 'ochre',
    opacity: 0.9,
  });
  for (const x of [-2, 0])
    lines.push({
      points: [
        [x, -2.29, 2],
        [x, -2.1, 2],
      ],
      ink: 'ochre',
      opacity: 0.9,
    });
  const anchor = (target: Vec3): Vec3 => {
    let nearest: Vec3 = [0, 0, 0],
      best = Infinity;
    for (let index = 0; index < surface.positions.length / 3; index++) {
      const point = vertex(surface.positions, index);
      const distance = point.reduce(
        (sum, value, axis) => sum + (value - target[axis]!) ** 2,
        0,
      );
      if (distance < best) {
        best = distance;
        nearest = point;
      }
    }
    return nearest;
  };
  return {
    radius: 3.75,
    framing: 'bounds',
    objects: [
      {
        position: [0, 0.04, 0],
        rotation: [0.16, -0.45, -0.025],
        sway: [0.006, 0.013, 0.003],
        phase: 0.4,
        surfaces: [surface],
        lines,
      },
    ],
    annotations: [
      {
        object: 0,
        point: anchor([-1.1, 1.4, 1.2]),
        label: 'NODAL SURFACE',
        detail: 'sin u cos v + sin v cos w + sin w cos u = 0',
        offset: [-44, -58],
      },
      {
        object: 0,
        point: anchor([1.2, 0.6, 1.15]),
        label: 'SECTION A–A',
        detail: 'Oblique cut · internal channels',
        offset: [46, -16],
      },
      {
        object: 0,
        point: [-1, -2.2, 2],
        label: 'UNIT CELL',
        detail: '2π periodicity along each field axis',
        offset: [-48, 36],
      },
      {
        object: 0,
        point: anchor([1.8, -0.9, -1.2]),
        label: '44³ CELLS',
        detail: 'Indexed marching tetrahedra',
        offset: [44, 46],
      },
    ],
  };
}
