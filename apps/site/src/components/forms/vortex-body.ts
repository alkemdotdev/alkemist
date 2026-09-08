import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const TAU = Math.PI * 2;
const LONGITUDINAL_STEPS = 168;
const SECTION_STEPS = 20;
type Layer = 'outer' | 'inner';
type Ribbon = { phase: number; layer: Layer };
type Sampler = (u: number, v: number) => Vec3;

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function unit(v: Vec3): Vec3 {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
}
function normal(sample: Sampler, t: number, angle: number): Vec3 {
  const epsilon = 0.0001;
  const longitudinal = subtract(
    sample(Math.min(1, t + epsilon), angle),
    sample(Math.max(0, t - epsilon), angle),
  );
  const sectional = subtract(
    sample(t, angle + epsilon),
    sample(t, angle - epsilon),
  );
  return unit(cross(sectional, longitudinal));
}

function ribbonSampler({ phase, layer }: Ribbon): Sampler {
  const inner = layer === 'inner';
  return (t, q) => {
    const envelope = Math.sin(Math.PI * t);
    const shoulders = Math.sin(TAU * t) ** 2;
    const width =
      (inner ? 0.078 : 0.05) +
      (inner ? 0.23 : 0.14) * envelope ** 0.6 +
      0.04 * shoulders;
    const thickness = (inner ? 0.023 : 0.028) + 0.05 * envelope ** 0.7;
    const radius =
      ((inner ? 0.43 : 0.51) +
        (inner ? 0.24 : 0.4) * envelope +
        (inner ? 0.43 : 0.72) * shoulders) *
      (1 +
        0.09 * Math.cos(phase) * (2 * t - 1) +
        0.045 * Math.sin(3 * phase) * envelope);
    const angle =
      phase +
      (inner ? 2.85 : 2.35) * (t - 0.5) +
      0.3 * Math.sin(TAU * t) +
      0.12 * envelope * Math.sin(phase) +
      Math.cos(q) * width;
    // A closed lenticular cross-section gives each lamina physical volume.
    // Both the camber and thickness taper at the ends, without singular tips.
    const r =
      radius + thickness * Math.sin(q) + 0.035 * envelope * Math.sin(q) ** 2;
    return [
      r * Math.cos(angle) + 0.14 * Math.sin(TAU * t),
      (inner ? 3.48 : 4.0) * (t - 0.5) + 0.11 * Math.sin(phase) * envelope,
      r * Math.sin(angle) + 0.12 * envelope ** 2,
    ];
  };
}

function appendRibbon(surface: FormSurface, sample: Sampler) {
  const offset = surface.positions.length / 3;
  const normals = surface.normals!;
  for (let step = 0; step <= LONGITUDINAL_STEPS; step++) {
    const t = step / LONGITUDINAL_STEPS;
    for (let section = 0; section < SECTION_STEPS; section++) {
      const q = (section / SECTION_STEPS) * TAU;
      surface.positions.push(...sample(t, q));
      normals.push(...normal(sample, t, q));
      if (step === LONGITUDINAL_STEPS) continue;
      const a = offset + step * SECTION_STEPS + section;
      const c = offset + step * SECTION_STEPS + ((section + 1) % SECTION_STEPS);
      const b = a + SECTION_STEPS;
      const d = c + SECTION_STEPS;
      surface.indices.push(a, c, b, c, d, b);
    }
  }
  // Separate cap vertices keep the machined-looking ends crisp. The parametric
  // cross-sections all lie in planes of constant y, including the biased shell.
  for (const t of [0, 1]) {
    const cap = surface.positions.length / 3;
    const center: Vec3 = [0, 0, 0];
    for (let section = 0; section < SECTION_STEPS; section++) {
      const p = sample(t, (section / SECTION_STEPS) * TAU);
      surface.positions.push(...p);
      normals.push(0, t === 0 ? -1 : 1, 0);
      p.forEach((value, i) => (center[i] += value / SECTION_STEPS));
    }
    const centerIndex = surface.positions.length / 3;
    surface.positions.push(...center);
    normals.push(0, t === 0 ? -1 : 1, 0);
    for (let section = 0; section < SECTION_STEPS; section++) {
      const a = cap + section;
      const b = cap + ((section + 1) % SECTION_STEPS);
      surface.indices.push(
        ...(t === 0 ? [centerIndex, b, a] : [centerIndex, a, b]),
      );
    }
  }
}

function engravings(sample: Sampler, ink: FormInk, inner: boolean): FormLine[] {
  return [0, 1].map((face) => {
    const points: Vec3[] = [];
    // Seven long traces per face share a line strip. Their short return strokes
    // run across the end section, like one continuous engraved toolpath.
    for (let trace = 0; trace < 7; trace++) {
      const q = face * Math.PI + Math.PI * (0.1 + (0.8 * trace) / 6);
      for (let step = 0; step <= LONGITUDINAL_STEPS; step++) {
        const t =
          (trace % 2 ? LONGITUDINAL_STEPS - step : step) / LONGITUDINAL_STEPS;
        const p = sample(t, q);
        const n = normal(sample, t, q);
        points.push([
          p[0] + n[0] * 0.003,
          p[1] + n[1] * 0.003,
          p[2] + n[2] * 0.003,
        ]);
      }
    }
    return { points, ink, opacity: inner ? 0.3 : 0.38 };
  });
}

function core(): FormSurface {
  const rows = 80;
  const columns = 112;
  const sample = (alpha: number, phi: number): Vec3 => {
    const r =
      0.535 *
      Math.sin(alpha) *
      (1 +
        0.047 * Math.cos(18 * phi + 5.4 * alpha) +
        0.022 * Math.sin(8 * alpha));
    return [
      r * Math.cos(phi),
      1.65 * Math.cos(alpha),
      r * Math.sin(phi) + 0.12 * Math.sin(alpha) ** 2,
    ];
  };
  const surface: FormSurface = {
    positions: [0, 1.65, 0],
    indices: [],
    normals: [0, 1, 0],
    ink: 'vermilion',
    colorRamp: { axis: 1, inks: ['ochre', 'vermilion', 'rose'] },
    roughness: 0.32,
    metalness: 0.62,
  };
  for (let row = 1; row < rows; row++) {
    const alpha = (row / rows) * Math.PI;
    for (let column = 0; column < columns; column++) {
      const phi = (column / columns) * TAU;
      surface.positions.push(...sample(alpha, phi));
      const da = subtract(
        sample(alpha + 0.0001, phi),
        sample(alpha - 0.0001, phi),
      );
      const dp = subtract(
        sample(alpha, phi + 0.0001),
        sample(alpha, phi - 0.0001),
      );
      surface.normals!.push(...unit(cross(dp, da)));
    }
  }
  const south = surface.positions.length / 3;
  surface.positions.push(0, -1.65, 0);
  surface.normals!.push(0, -1, 0);
  for (let column = 0; column < columns; column++) {
    const next = (column + 1) % columns;
    surface.indices.push(0, 1 + next, 1 + column);
    for (let row = 0; row < rows - 2; row++) {
      const a = 1 + row * columns + column;
      const c = 1 + row * columns + next;
      surface.indices.push(a, c, a + columns, c, c + columns, a + columns);
    }
    const last = 1 + (rows - 2) * columns;
    surface.indices.push(south, last + column, last + next);
  }
  return surface;
}

/** Authored helical laminae around a fluted core; an illustration, not a field solver. */
export function createVortexBody(): FormScene {
  const outer: FormSurface = {
    positions: [],
    indices: [],
    normals: [],
    ink: 'cobalt',
    colorRamp: { axis: 1, inks: ['cobalt', 'cyan', 'cobalt', 'violet'] },
    roughness: 0.3,
    metalness: 0.62,
  };
  const inner: FormSurface = {
    positions: [],
    indices: [],
    normals: [],
    ink: 'rose',
    colorRamp: { axis: 1, inks: ['ochre', 'vermilion', 'rose'] },
    roughness: 0.31,
    metalness: 0.62,
  };
  const lines: FormLine[] = [];
  for (const layer of ['outer', 'inner'] as const) {
    const count = layer === 'outer' ? 12 : 6;
    for (let blade = 0; blade < count; blade++) {
      const sample = ribbonSampler({
        phase: (blade / count) * TAU + (layer === 'inner' ? 0.27 : 0),
        layer,
      });
      appendRibbon(layer === 'outer' ? outer : inner, sample);
      lines.push(
        ...engravings(
          sample,
          layer === 'outer' ? 'cyan' : 'ochre',
          layer === 'inner',
        ),
      );
    }
  }
  return {
    radius: 2.5,
    framing: 'bounds',
    objects: [
      {
        position: [0, 0, 0],
        rotation: [0.24, -0.37, -0.6],
        sway: [0.018, 0.024, 0.008],
        phase: 0,
        surfaces: [outer, inner, core()],
        lines,
      },
    ],
    annotations: [
      {
        object: 0,
        point: ribbonSampler({ phase: 0, layer: 'outer' })(0.72, Math.PI / 2),
        label: 'Helical shell',
        detail: 'Twelve swept laminae · closed sections',
        offset: [52, -54],
      },
      {
        object: 0,
        point: ribbonSampler({ phase: Math.PI, layer: 'inner' })(
          0.5,
          Math.PI / 2,
        ),
        label: 'Layered interior',
        detail: 'Six inner laminae / fluted copper core',
        offset: [-64, 54],
      },
    ],
  };
}
