import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

// Ideal dipole field lines satisfy r = L sin²(theta), with the dipole along y.
// The central reference sphere excludes the singular point-dipole region.
function fieldPoint(theta: number, phi: number, L: number): Vec3 {
  const r = L * Math.sin(theta) ** 2;
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
}
function tube(
  points: Vec3[],
  phi: number,
  radius: number,
  ink: FormInk,
): FormSurface {
  const positions: number[] = [],
    indices: number[] = [];
  const normal: Vec3 = [-Math.sin(phi), 0, Math.cos(phi)];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)]!,
      b = points[Math.min(points.length - 1, i + 1)]!;
    const tangent = b.map((v, j) => v - a[j]!) as Vec3;
    const length = Math.hypot(...tangent);
    tangent.forEach((v, j) => (tangent[j] = v / length));
    const side: Vec3 = [
      tangent[1] * normal[2] - tangent[2] * normal[1],
      tangent[2] * normal[0] - tangent[0] * normal[2],
      tangent[0] * normal[1] - tangent[1] * normal[0],
    ];
    for (let j = 0; j < 6; j++) {
      const angle = (j * Math.PI) / 3;
      positions.push(
        ...points[i]!.map(
          (v, k) =>
            v +
            radius *
              (Math.cos(angle) * normal[k]! + Math.sin(angle) * side[k]!),
        ),
      );
      if (i < points.length - 1) {
        const n = i * 6 + j,
          m = i * 6 + ((j + 1) % 6);
        indices.push(n, m, n + 6, m, m + 6, n + 6);
      }
    }
  }
  return { positions, indices, ink, roughness: 0.38, metalness: 0.55 };
}
export function createInterference(): FormScene {
  const lines: FormLine[] = [],
    surfaces: FormSurface[] = [];
  const core = 0.34;
  for (let family = 0; family < 13; family++) {
    const L = 0.62 + family * 0.18;
    const start = Math.asin(Math.sqrt(core / L));
    for (let azimuth = 0; azimuth < 32; azimuth++) {
      const phi = (azimuth * Math.PI * 2) / 32;
      // A missing azimuth wedge is a visual section, exposing the inner shells.
      if (phi > 0.22 && phi < 0.96) continue;
      const points = Array.from({ length: 145 }, (_, j) =>
        fieldPoint(start + ((Math.PI - 2 * start) * j) / 144, phi, L),
      );
      const major = azimuth % 8 === 0 && family % 3 === 0;
      lines.push({
        points,
        ink: major ? 'cyan' : family % 3 === 0 ? 'silver' : 'construction',
        opacity: major ? 0.9 : family % 3 === 0 ? 0.55 : 0.3,
      });
      if (major) surfaces.push(tube(points, phi, 0.009, 'cyan'));
    }
  }
  const positions: number[] = [],
    indices: number[] = [];
  for (let u = 0; u <= 40; u++)
    for (let v = 0; v <= 64; v++) {
      const a = (u * Math.PI) / 40,
        b = (v * Math.PI * 2) / 64;
      positions.push(
        core * Math.sin(a) * Math.cos(b),
        core * Math.cos(a),
        core * Math.sin(a) * Math.sin(b),
      );
      if (u < 40 && v < 64) {
        const i = u * 65 + v;
        if (u > 0) indices.push(i, i + 65, i + 1);
        if (u < 39) indices.push(i + 1, i + 65, i + 66);
      }
    }
  surfaces.push({
    positions,
    indices,
    ink: 'graphite',
    roughness: 0.4,
    metalness: 0.65,
  });
  for (let latitude = 1; latitude < 12; latitude++) {
    const a = (latitude * Math.PI) / 12;
    lines.push({
      ink: 'silver',
      opacity: 0.4,
      points: Array.from(
        { length: 97 },
        (_, i) =>
          [
            core * 1.004 * Math.sin(a) * Math.cos((i * Math.PI) / 48),
            core * 1.004 * Math.cos(a),
            core * 1.004 * Math.sin(a) * Math.sin((i * Math.PI) / 48),
          ] as Vec3,
      ),
    });
  }
  for (let meridian = 0; meridian < 16; meridian++) {
    const a = (meridian * Math.PI) / 8;
    lines.push({
      ink: 'silver',
      opacity: 0.4,
      points: Array.from(
        { length: 65 },
        (_, i) =>
          [
            core * 1.004 * Math.sin((i * Math.PI) / 64) * Math.cos(a),
            core * 1.004 * Math.cos((i * Math.PI) / 64),
            core * 1.004 * Math.sin((i * Math.PI) / 64) * Math.sin(a),
          ] as Vec3,
      ),
    });
  }
  lines.push({
    ink: 'construction',
    opacity: 0.65,
    points: [
      [0, -1.65, 0],
      [0, 1.65, 0],
    ],
  });
  lines.push({
    ink: 'construction',
    opacity: 0.48,
    points: [
      [-2.95, 0, 0],
      [2.95, 0, 0],
    ],
  });
  for (let r = -2.5; r <= 2.5; r += 0.5)
    lines.push({
      ink: 'construction',
      opacity: 0.65,
      points: [
        [r, -0.04, 0],
        [r, 0.04, 0],
      ],
    });
  lines.push({
    ink: 'ochre',
    opacity: 0.85,
    points: [
      [0, 1.65, 0],
      [-0.045, 1.53, 0],
      [0, 1.65, 0],
      [0.045, 1.53, 0],
    ],
  });
  return {
    radius: 3.3,
    framing: 'bounds',
    objects: [
      {
        position: [0, 0, 0],
        rotation: [0.42, -0.35, -0.22],
        sway: [0.018, 0.028, 0.006],
        lines,
        surfaces,
      },
    ],
    annotations: [
      {
        object: 0,
        point: [0, 1.55, 0],
        label: 'DIPOLE AXIS',
        detail: 'm ∥ +y',
        offset: [45, -45],
      },
      {
        object: 0,
        point: fieldPoint(Math.PI / 2, Math.PI, 2.78),
        label: 'OUTER SHELL',
        detail: 'L = 2.78',
        offset: [-85, -45],
      },
      {
        object: 0,
        point: [core, 0, 0],
        label: 'REFERENCE SPHERE',
        detail: 'r₀ = 0.34',
        offset: [70, 65],
      },
      {
        object: 0,
        point: fieldPoint(1.1, Math.PI / 2, 1.7),
        label: 'FIELD-LINE FAMILY',
        detail: 'r = L sin² θ',
        offset: [50, -80],
      },
    ],
  };
}
