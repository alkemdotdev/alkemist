import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const TAU = Math.PI * 2;
const MAJOR_RADIUS = 1.24;
const MINOR_RADIUS = 0.64;
const CORE_RADIUS = 0.263;
const STRAND_ORBIT = 0.309;
const STRAND_RADIUS = 0.016;
const BRAID_TURNS = 14;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

/** Analytic periodic frame of C(t)=((R+r cos3t)cos2t,(R+r cos3t)sin2t,r sin3t). */
function frame(t: number) {
  const radial = MAJOR_RADIUS + MINOR_RADIUS * Math.cos(3 * t);
  const velocity = -3 * MINOR_RADIUS * Math.sin(3 * t);
  const acceleration = -9 * MINOR_RADIUS * Math.cos(3 * t);
  const c = Math.cos(2 * t);
  const s = Math.sin(2 * t);
  const center: Vec3 = [radial * c, radial * s, MINOR_RADIUS * Math.sin(3 * t)];
  const tangent = unit([
    velocity * c - 2 * radial * s,
    velocity * s + 2 * radial * c,
    3 * MINOR_RADIUS * Math.cos(3 * t),
  ]);
  const second: Vec3 = [
    (acceleration - 4 * radial) * c - 4 * velocity * s,
    (acceleration - 4 * radial) * s + 4 * velocity * c,
    -9 * MINOR_RADIUS * Math.sin(3 * t),
  ];
  const normal = unit(add(second, scale(tangent, -dot(second, tangent))));
  return { center, tangent, normal, binormal: cross(tangent, normal) };
}

function radial(t: number, angle: number): Vec3 {
  const { normal, binormal } = frame(t);
  return add(scale(normal, Math.cos(angle)), scale(binormal, Math.sin(angle)));
}

function corePoint(t: number, angle: number): Vec3 {
  // Fine longitudinal scallops catch grazing light; the closed tube stays solid.
  const radius = CORE_RADIUS + 0.006 * Math.cos(20 * angle - 8 * t);
  return add(frame(t).center, scale(radial(t, angle), radius));
}

/** A solid trefoil with a geometrically braided jacket; no physical simulation. */
export function createKnotCore(): FormScene {
  const surfaces: FormSurface[] = [];
  const lines: FormLine[] = [];
  const makeSurface = (ink: FormInk, roughness: number, metalness: number) => {
    const surface: FormSurface = {
      positions: [],
      indices: [],
      normals: [],
      ink,
      roughness,
      metalness,
    };
    surfaces.push(surface);
    return surface;
  };
  const coreCobalt = makeSurface('cobalt', 0.36, 0.23);
  const coreViolet = makeSurface('violet', 0.39, 0.18);
  const inlay = makeSurface('ochre', 0.31, 0.31);
  const strandCobalt = makeSurface('cobalt', 0.3, 0.27);
  const strandViolet = makeSurface('violet', 0.32, 0.23);
  const strandRose = makeSurface('rose', 0.35, 0.21);

  const coreSteps = 512;
  const coreSides = 40;
  const coreNormal = (t: number, angle: number) => {
    const epsilon = 0.0001;
    const along = add(
      corePoint(t + epsilon, angle),
      scale(corePoint(t - epsilon, angle), -1),
    );
    const around = add(
      corePoint(t, angle + epsilon),
      scale(corePoint(t, angle - epsilon), -1),
    );
    return unit(cross(around, along));
  };
  for (let side = 0; side < coreSides; side++) {
    // A narrow, continuous exposed inlay cuts through the dark sculptural core.
    const surface =
      side === 8 ? inlay : side >= 22 && side < 29 ? coreViolet : coreCobalt;
    const base = surface.positions.length / 3;
    for (let i = 0; i <= coreSteps; i++) {
      const t = (TAU * i) / coreSteps;
      for (const edge of [side, side + 1]) {
        const angle = (TAU * edge) / coreSides;
        surface.positions.push(...corePoint(t, angle));
        surface.normals!.push(...coreNormal(t, angle));
      }
    }
    for (let i = 0; i < coreSteps; i++) {
      const a = base + i * 2;
      surface.indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }

  const braidPoint = (t: number, family: number, strand: number): Vec3 => {
    const direction = family === 0 ? 1 : -1;
    const angle =
      direction * BRAID_TURNS * t + (TAU * strand) / 5 + (family * Math.PI) / 5;
    // At opposite-family crossings, sin(5*BRAID_TURNS*t)=±1. These paired
    // offsets alternate which strand passes over, with 0.012 clearance.
    const orbit =
      STRAND_ORBIT + direction * 0.022 * Math.sin(5 * BRAID_TURNS * t);
    return add(frame(t).center, scale(radial(t, angle), orbit));
  };
  const braidFrame = (t: number, family: number, strand: number) => {
    const center = braidPoint(t, family, strand);
    const tangent = unit(
      add(
        braidPoint(t + 0.0001, family, strand),
        scale(braidPoint(t - 0.0001, family, strand), -1),
      ),
    );
    const reference = unit(add(center, scale(frame(t).center, -1)));
    const normal = unit(
      add(reference, scale(tangent, -dot(reference, tangent))),
    );
    return { center, normal, binormal: cross(tangent, normal) };
  };

  const braidSteps = 768;
  const braidSides = 8;
  for (let family = 0; family < 2; family++) {
    for (let strand = 0; strand < 5; strand++) {
      const surface =
        family === 0 ? strandCobalt : strand === 2 ? strandRose : strandViolet;
      const base = surface.positions.length / 3;
      for (let i = 0; i <= braidSteps; i++) {
        const { center, normal, binormal } = braidFrame(
          (TAU * i) / braidSteps,
          family,
          strand,
        );
        for (let side = 0; side < braidSides; side++) {
          const angle = (TAU * side) / braidSides;
          const direction = add(
            scale(normal, Math.cos(angle)),
            scale(binormal, Math.sin(angle)),
          );
          surface.positions.push(
            ...add(center, scale(direction, STRAND_RADIUS)),
          );
          surface.normals!.push(...direction);
        }
      }
      for (let i = 0; i < braidSteps; i++) {
        for (let side = 0; side < braidSides; side++) {
          const a = base + i * braidSides + side;
          const b = base + i * braidSides + ((side + 1) % braidSides);
          surface.indices.push(
            a,
            b,
            b + braidSides,
            a,
            b + braidSides,
            a + braidSides,
          );
        }
      }
    }
  }

  // Hairline filaments trace two neighboring fibers, rather than floating off
  // the sculpture. They add a finer scale of detail over the woven surface.
  for (const [family, strand, ink] of [
    [0, 0, 'cyan'],
    [0, 3, 'cyan'],
    [1, 1, 'rose'],
    [1, 4, 'ochre'],
  ] as const) {
    for (const offset of [-0.44, 0.44]) {
      lines.push({
        ink,
        opacity: ink === 'cyan' ? 0.72 : 0.58,
        points: Array.from({ length: 1025 }, (_, i) => {
          const { center, normal, binormal } = braidFrame(
            (TAU * i) / 1024,
            family,
            strand,
          );
          const direction = add(
            scale(normal, Math.cos(offset)),
            scale(binormal, Math.sin(offset)),
          );
          return add(center, scale(direction, STRAND_RADIUS + 0.0015));
        }),
      });
    }
  }
  return {
    objects: [
      {
        position: [0, 0, 0],
        rotation: [-0.42, 0.38, -0.24],
        sway: [0.006, 0.014, 0.005],
        surfaces,
        lines,
      },
    ],
    radius: 2.5,
    framing: 'bounds',
    annotations: [
      {
        point: frame(0.55).center,
        object: 0,
        label: 'T(2, 3)',
        detail: 'One closed trefoil',
        offset: [75, -46],
      },
      {
        point: braidPoint(2.1, 0, 0),
        object: 0,
        label: '10 braided strands',
        detail: 'Alternating crossings',
        offset: [-84, 52],
      },
    ],
  };
}
