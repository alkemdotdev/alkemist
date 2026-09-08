import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const TAU = Math.PI * 2;
const MODULE = 0.072;
const PRESSURE_ANGLE = (25 * Math.PI) / 180;
const SUN_TEETH = 24;
const PLANET_TEETH = 16;
const RING_TEETH = 56;
const PLANET_CENTERS = (MODULE * (SUN_TEETH + PLANET_TEETH)) / 2;
type PolarPoint = { radius: number; angle: number };
type SectionPoint = [radius: number, z: number];

/** A geometric section illustration, not a toleranced manufacturing model. */
export function createAssembly(): FormScene {
  const surfaces: FormSurface[] = [];
  const lines: FormLine[] = [];
  const material = (ink: FormInk, roughness: number, metalness: number) => {
    const surface: FormSurface = {
      positions: [],
      indices: [],
      ink,
      roughness,
      metalness,
    };
    surfaces.push(surface);
    return surface;
  };
  const steel = material('silver', 0.3, 0.48);
  const dark = material('graphite', 0.43, 0.26);
  const accent = material('ochre', 0.3, 0.35);
  const housing = material('cobalt', 0.28, 0.38);
  const carrier = material('teal', 0.3, 0.3);
  const sun = material('vermilion', 0.3, 0.3);

  const point = (r: number, angle: number, z: number, center: Vec3): Vec3 => [
    center[0] + r * Math.cos(angle),
    center[1] + r * Math.sin(angle),
    center[2] + z,
  ];
  const quad = (surface: FormSurface, a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    const base = surface.positions.length / 3;
    surface.positions.push(...a, ...b, ...c, ...d);
    surface.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const edge = (
    radius: number,
    z: number,
    center: Vec3 = [0, 0, 0],
    start = 0,
    end = TAU,
    ink: FormInk = 'construction',
    opacity = 0.48,
  ) => {
    lines.push({
      ink,
      opacity,
      points: Array.from({ length: 129 }, (_, i) =>
        point(radius, start + ((end - start) * i) / 128, z, center),
      ),
    });
  };

  /** Sweeps a closed radial section; partial revolutions have solid cut faces. */
  const lathe = (
    surface: FormSurface,
    section: SectionPoint[],
    center: Vec3 = [0, 0, 0],
    start = 0,
    end = TAU,
    segments = 64,
  ) => {
    const base = surface.positions.length / 3;
    const width = section.length;
    for (let i = 0; i <= segments; i++) {
      const theta = start + ((end - start) * i) / segments;
      for (const [radius, z] of section)
        surface.positions.push(...point(radius, theta, z, center));
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < width; j++) {
        const a = base + i * width + j;
        const b = base + (i + 1) * width + j;
        const c = base + (i + 1) * width + ((j + 1) % width);
        const d = base + i * width + ((j + 1) % width);
        surface.indices.push(a, b, c, a, c, d);
      }
    }
    if (end - start < TAU - 0.001) {
      // These section polygons are convex or monotone stepped profiles.
      for (const angle of [start, end]) {
        const centerR = section.reduce((sum, p) => sum + p[0], 0) / width;
        const centerZ = section.reduce((sum, p) => sum + p[1], 0) / width;
        for (let i = 0; i < width; i++) {
          const a = point(section[i]![0], angle, section[i]![1], center);
          const b = point(
            section[(i + 1) % width]![0],
            angle,
            section[(i + 1) % width]![1],
            center,
          );
          const middle = point(centerR, angle, centerZ, center);
          const offset = surface.positions.length / 3;
          surface.positions.push(...middle, ...a, ...b);
          if (angle === start)
            surface.indices.push(offset, offset + 1, offset + 2);
          else surface.indices.push(offset, offset + 2, offset + 1);
        }
      }
    }
  };
  const collar = (
    surface: FormSurface,
    inner: number,
    outer: number,
    back: number,
    front: number,
    center: Vec3 = [0, 0, 0],
    start = 0,
    end = TAU,
    segments = 64,
  ) => {
    const bevel = Math.min(0.018, (outer - inner) / 5, (front - back) / 4);
    lathe(
      surface,
      [
        [inner + bevel, back],
        [outer - bevel, back],
        [outer, back + bevel],
        [outer, front - bevel],
        [outer - bevel, front],
        [inner + bevel, front],
        [inner, front - bevel],
        [inner, back + bevel],
      ],
      center,
      start,
      end,
      segments,
    );
  };

  const involute = (radius: number, base: number) => {
    const tangent = Math.sqrt(Math.max(0, (radius / base) ** 2 - 1));
    return tangent - Math.atan(tangent);
  };

  /**
   * Both meshes share m and alpha. The tooth flank is an involute of r_b;
   * the short segment below r_b is a root connector, not a generated trochoid.
   * Planetary count/spacing conditions: KHK, Internal Gears, 2025, p. 2.
   */
  const gearProfile = (teeth: number, internal: boolean, phase = 0) => {
    const pitch = (MODULE * teeth) / 2;
    const base = pitch * Math.cos(PRESSURE_ANGLE);
    const tip = pitch + (internal ? -MODULE : MODULE);
    const root = pitch + (internal ? 1.25 * MODULE : -1.25 * MODULE);
    const rootFlank = internal ? root : Math.max(base, root);
    const pitchInvolute = involute(pitch, base);
    const halfWidth = (radius: number) =>
      Math.PI / (2 * teeth) +
      (internal ? 1 : -1) * (involute(radius, base) - pitchInvolute) -
      0.0015;
    const halfRoot = halfWidth(rootFlank);
    const halfTip = halfWidth(tip);
    const result: PolarPoint[] = [];
    for (let tooth = 0; tooth < teeth; tooth++) {
      const center = phase + (TAU * tooth) / teeth;
      const push = (radius: number, angle: number) =>
        result.push({ radius, angle: center + angle });
      // Circular root lands connect the sampled involute flanks.
      for (let i = 0; i < 2; i++)
        push(root, -Math.PI / teeth + ((Math.PI / teeth - halfRoot) * i) / 2);
      if (rootFlank !== root) push(root, -halfRoot);
      for (let i = 0; i <= 7; i++) {
        const radius = rootFlank + ((tip - rootFlank) * i) / 7;
        push(radius, -halfWidth(radius));
      }
      for (let i = 1; i <= 3; i++) push(tip, -halfTip + (2 * halfTip * i) / 3);
      for (let i = 1; i <= 7; i++) {
        const radius = tip + ((rootFlank - tip) * i) / 7;
        push(radius, halfWidth(radius));
      }
      if (rootFlank !== root) push(root, halfRoot);
      for (let i = 1; i < 3; i++)
        push(root, halfRoot + ((Math.PI / teeth - halfRoot) * i) / 3);
    }
    return result;
  };

  const gear = (
    teeth: number,
    boreOrOuter: number,
    center: Vec3,
    internal = false,
    phase = 0,
    finish: FormSurface = steel,
  ) => {
    const profile = gearProfile(teeth, internal, phase);
    const bevel = 0.009;
    const back = -0.21;
    const front = 0.3;
    const base = finish.positions.length / 3;
    const sections = 8;
    for (const { radius, angle } of profile) {
      const inner = internal ? radius : boreOrOuter;
      const outer = internal ? boreOrOuter : radius;
      for (const [r, z] of [
        [inner + bevel, back],
        [outer - bevel, back],
        [outer, back + bevel],
        [outer, front - bevel],
        [outer - bevel, front],
        [inner + bevel, front],
        [inner, front - bevel],
        [inner, back + bevel],
      ])
        finish.positions.push(...point(r!, angle, z!, center));
    }
    for (let i = 0; i < profile.length; i++) {
      for (let j = 0; j < sections; j++) {
        const next = (i + 1) % profile.length;
        // A root connector changes radius at a fixed angle. Only its outer
        // wall and bevels span area; its face/bore strips collapse to a line.
        if (
          Math.abs(profile[i]!.angle - profile[next]!.angle) < 1e-12 &&
          (j < 1 || j > 3)
        )
          continue;
        const a = base + i * sections + j;
        const b = base + next * sections + j;
        const c = base + next * sections + ((j + 1) % sections);
        const d = base + i * sections + ((j + 1) % sections);
        finish.indices.push(a, b, c, a, c, d);
      }
    }
    for (const z of [back - 0.002, front + 0.002]) {
      const outline = profile.map(({ radius, angle }) =>
        point(radius, angle, z, center),
      );
      lines.push({
        points: [...outline, outline[0]!],
        ink: 'construction',
        opacity: 0.65,
      });
    }
  };

  const sphere = (center: Vec3, radius: number) => {
    const latitudes = 8;
    const longitudes = 16;
    const base = steel.positions.length / 3;
    for (let i = 0; i <= latitudes; i++) {
      const latitude = (Math.PI * i) / latitudes;
      for (let j = 0; j <= longitudes; j++) {
        const longitude = (TAU * j) / longitudes;
        steel.positions.push(
          center[0] + radius * Math.sin(latitude) * Math.cos(longitude),
          center[1] + radius * Math.sin(latitude) * Math.sin(longitude),
          center[2] + radius * Math.cos(latitude),
        );
      }
    }
    for (let i = 0; i < latitudes; i++) {
      for (let j = 0; j < longitudes; j++) {
        const a = base + i * (longitudes + 1) + j;
        const b = a + longitudes + 1;
        if (i > 0) steel.indices.push(a, b, a + 1);
        if (i < latitudes - 1) steel.indices.push(a + 1, b, b + 1);
      }
    }
  };

  const bearing = (
    center: Vec3,
    inner: number,
    outer: number,
    count: number,
  ) => {
    const race = (outer - inner) * 0.22;
    collar(steel, inner, inner + race, -0.1, 0.1, center, 0, TAU, 64);
    collar(steel, outer - race, outer, -0.1, 0.1, center, 0, TAU, 64);
    const ballRadius = (outer - inner - race * 2) * 0.47;
    const ballOrbit = (inner + outer) / 2;
    for (let i = 0; i < count; i++)
      sphere(point(ballOrbit, (TAU * i) / count, 0.025, center), ballRadius);
    edge(inner + race, 0.105, center, 0, TAU, 'construction', 0.7);
    edge(outer - race, 0.105, center, 0, TAU, 'construction', 0.7);
  };

  const fastener = (center: Vec3, size = 1) => {
    collar(dark, 0.045 * size, 0.072 * size, -0.24, 0, center, 0, TAU, 24);
    collar(
      steel,
      0.075 * size,
      0.126 * size,
      -0.018,
      0.015,
      center,
      0,
      TAU,
      32,
    );
    // A six-sided socket passes into the head; its dark bottom sits below the lip.
    const polygon = Array.from({ length: 6 }, (_, i) => (TAU * i) / 6);
    for (let i = 0; i < 6; i++) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % 6]!;
      quad(
        steel,
        point(0.09 * size, a, 0.02, center),
        point(0.09 * size, b, 0.02, center),
        point(0.09 * size, b, 0.13, center),
        point(0.09 * size, a, 0.13, center),
      );
      quad(
        steel,
        point(0.09 * size, a, 0.13, center),
        point(0.09 * size, b, 0.13, center),
        point(0.045 * size, b, 0.13, center),
        point(0.045 * size, a, 0.13, center),
      );
      quad(
        dark,
        point(0.045 * size, a, 0.13, center),
        point(0.045 * size, b, 0.13, center),
        point(0.045 * size, b, 0.055, center),
        point(0.045 * size, a, 0.055, center),
      );
    }
    collar(dark, 0.001, 0.043 * size, 0.048, 0.053, center, 0, TAU, 12);
  };

  // The front quadrant is sectioned through the housing; the whole toothed ring
  // remains in place so the four planet contacts and nominal 56 teeth are visible.
  const cutStart = Math.PI * 0.38;
  const cutEnd = Math.PI * 1.96;
  collar(housing, 2.19, 2.58, -0.91, -0.74);
  collar(housing, 2.32, 2.51, -0.74, 0.45, [0, 0, 0], cutStart, cutEnd);
  collar(housing, 2.31, 2.65, -0.77, -0.65, [0, 0, 0], cutStart, cutEnd);
  collar(housing, 2.31, 2.63, 0.37, 0.51, [0, 0, 0], cutStart, cutEnd);
  // Closely spaced machined circumferential grooves catch light on the side wall.
  for (let i = 0; i < 9; i++) {
    const z = -0.64 + i * 0.102;
    edge(2.518, z, [0, 0, 0], cutStart, cutEnd, 'cyan', 0.7);
  }
  for (const z of [-0.916, -0.738]) {
    edge(2.58, z);
    edge(2.19, z);
  }
  for (const z of [-0.776, 0.516]) edge(2.63, z, [0, 0, 0], cutStart, cutEnd);
  // Fine diagonal section hatching is confined to the two exposed housing faces.
  for (const angle of [cutStart, cutEnd]) {
    for (let i = 0; i < 12; i++) {
      const z = -0.73 + i * 0.095;
      lines.push({
        ink: 'ochre',
        opacity: 0.62,
        points: [
          point(2.325, angle, z, [0, 0, 0]),
          point(2.507, angle, z + 0.062, [0, 0, 0]),
        ],
      });
    }
  }
  gear(RING_TEETH, 2.315, [0, 0, 0], true);
  edge(2.235, 0.307);
  edge(2.285, 0.307);

  // Rear carrier and its four radial webs are behind the mesh plane. Front
  // bearing retainers are slightly separated axially to expose the ball races.
  collar(dark, 0.26, 0.56, -0.58, -0.35);
  const arm = (angle: number) => {
    const rotate = ([x, y, z]: Vec3): Vec3 => [
      x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle),
      z,
    ];
    const outline: [number, number][] = [
      [0.38, -0.14],
      [1.34, -0.19],
      [1.57, -0.1],
      [1.61, 0],
      [1.57, 0.1],
      [1.34, 0.19],
      [0.38, 0.14],
    ];
    const center: Vec3 = [0.96, 0, -0.47];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      const backA = rotate([a[0], a[1], -0.57]);
      const backB = rotate([b[0], b[1], -0.57]);
      const frontA = rotate([a[0], a[1], -0.37]);
      const frontB = rotate([b[0], b[1], -0.37]);
      quad(carrier, backA, backB, frontB, frontA);
      for (const z of [-0.57, -0.37]) {
        const offset = carrier.positions.length / 3;
        carrier.positions.push(
          ...rotate([center[0], center[1], z]),
          ...rotate([a[0], a[1], z]),
          ...rotate([b[0], b[1], z]),
        );
        carrier.indices.push(offset, offset + 1, offset + 2);
      }
    }
  };
  gear(SUN_TEETH, 0.277, [0, 0, 0], false, 0, sun);
  collar(sun, 0.28, 0.64, 0.3, 0.338);
  edge((MODULE * SUN_TEETH) / 2, 0.31, [0, 0, 0], 0, TAU, 'ochre', 0.85);
  for (let i = 0; i < 4; i++) {
    const angle = (TAU * i) / 4;
    const center: Vec3 = [
      PLANET_CENTERS * Math.cos(angle),
      PLANET_CENTERS * Math.sin(angle),
      0,
    ];
    arm(angle);
    // 24+56 is divisible by four, so this phase meshes at all four positions.
    gear(PLANET_TEETH, 0.22, center, false, Math.PI / PLANET_TEETH);
    collar(carrier, 0.22, 0.414, 0.3, 0.336, center, 0, TAU, 64);
    bearing([center[0], center[1], 0.46], 0.135, 0.33, 10);
    collar(dark, 0.074, 0.13, -0.59, 0.72, center, 0, TAU, 48);
    collar(steel, 0.126, 0.24, 0.61, 0.66, center, 0, TAU, 64);
    fastener([center[0], center[1], 0.68], 1.15);
    edge(
      (MODULE * PLANET_TEETH) / 2,
      0.306,
      center,
      0,
      TAU,
      'construction',
      0.36,
    );
    for (let hole = 0; hole < 4; hole++) {
      const theta = (TAU * hole) / 4 + Math.PI / 4;
      // Small counterbore witnesses sit on the raised gear-face illustration.
      const position = point(0.365, theta, 0.338, center);
      collar(dark, 0.029, 0.044, -0.005, 0.006, position, 0, TAU, 16);
      collar(steel, 0.043, 0.052, -0.002, 0.01, position, 0, TAU, 16);
    }
  }

  // Coaxial input spindle: stepped shaft, front bearing, keyed collar, fine lands.
  collar(dark, 0.09, 0.269, -1.09, 1.14);
  bearing([0, 0, 0.54], 0.274, 0.545, 16);
  collar(steel, 0.278, 0.43, 0.7, 0.77);
  collar(accent, 0.274, 0.308, 0.792, 0.818);
  collar(steel, 0.105, 0.235, 0.97, 1.38);
  collar(dark, 0.087, 0.108, 1.1, 1.385);
  for (const z of [1.03, 1.08, 1.24, 1.29])
    edge(0.238, z, [0, 0, 0], 0, TAU, 'construction', 0.6);
  for (let i = 0; i < 12; i++) {
    const theta = (TAU * i) / 12;
    const width = 0.024;
    const p = (r: number, a: number, z: number) =>
      point(r, theta + a, z, [0, 0, 0]);
    quad(
      steel,
      p(0.235, -width, 1.08),
      p(0.253, -width, 1.08),
      p(0.253, -width, 1.23),
      p(0.235, -width, 1.23),
    );
    quad(
      steel,
      p(0.253, -width, 1.08),
      p(0.253, width, 1.08),
      p(0.253, width, 1.23),
      p(0.253, -width, 1.23),
    );
    quad(
      steel,
      p(0.253, width, 1.08),
      p(0.235, width, 1.08),
      p(0.235, width, 1.23),
      p(0.253, width, 1.23),
    );
  }
  for (let i = 0; i < 12; i++) {
    const theta = (TAU * i) / 12;
    // Counterbored flange fasteners stop at the cut, preserving the section.
    if (theta < cutStart || theta > cutEnd) continue;
    fastener(point(2.467, theta, 0.52, [0, 0, 0]));
    const back = point(2.47, theta, -0.91, [0, 0, 0]);
    collar(dark, 0.075, 0.106, -0.012, 0.004, back, 0, TAU, 24);
  }

  // Construction witnesses provide scale and the exact pitch-circle relation.
  for (let i = 0; i < 40; i++) {
    const start = (TAU * i) / 40;
    lines.push({
      ink: 'ochre',
      opacity: 0.4,
      points: [
        point(PLANET_CENTERS, start, 0.82, [0, 0, 0]),
        point(PLANET_CENTERS, start + 0.058, 0.82, [0, 0, 0]),
      ],
    });
  }
  lines.push({
    ink: 'construction',
    opacity: 0.5,
    points: [
      [0, 0, -1.42],
      [0, 0, 1.75],
    ],
  });
  return {
    objects: [
      {
        position: [0, 0, 0],
        rotation: [0.43, -0.51, -0.2],
        sway: [0.009, 0.018, 0.004],
        surfaces,
        lines,
      },
    ],
    radius: 3.15,
    framing: 'bounds',
    annotations: [
      {
        point: [-0.72, 0, 0.3],
        object: 0,
        label: '24T / input',
        detail: 'Sun · 25° involute',
        offset: [-88, 58],
      },
      {
        point: [PLANET_CENTERS, 0, 0.34],
        object: 0,
        label: '4 × 16T',
        detail: 'Equal planet spacing',
        offset: [85, 36],
      },
      {
        point: [-1.42, 1.6, 0.31],
        object: 0,
        label: '56T / fixed',
        detail: 'Internal ring gear',
        offset: [-85, -52],
      },
      {
        point: [0.35, 0.12, 0.56],
        object: 0,
        label: 'Ball race',
        detail: 'Exposed bearing races',
        offset: [80, -82],
      },
    ],
  };
}
