import type { FormInk, FormLine, FormScene, FormSurface, Vec3 } from './types';

const TAU = Math.PI * 2;
const MAJOR_RADIUS = 1.58;
const CORE_RADIUS = 0.54;
const BRAID_RADIUS = 0.64;
const FAMILY_COUNT = 12;
const PATH_SEGMENTS = 384;
const PROFILE_SEGMENTS = 8;
const HALF_WIDTH = 0.061;
const HALF_THICKNESS = 0.018;
const CROSSING_LIFT = 0.03;
const DERIVATIVE_STEP = 1e-5;

type Frame = { center: Vec3; across: Vec3; outward: Vec3 };
type Mesh = FormSurface & { normals: number[] };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, factor: number): Vec3 => [
  a[0] * factor,
  a[1] * factor,
  a[2] * factor,
];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (vector: Vec3): Vec3 => scale(vector, 1 / Math.hypot(...vector));
const derivative = (a: Vec3, b: Vec3): Vec3 =>
  scale(add(a, scale(b, -1)), 1 / (2 * DERIVATIVE_STEP));

function newMesh(ink: FormInk, roughness: number, metalness: number): Mesh {
  return { positions: [], normals: [], indices: [], ink, roughness, metalness };
}

function torusPoint(theta: number, phi: number, radius: number): Vec3 {
  const radial = MAJOR_RADIUS + radius * Math.cos(phi);
  return [
    radial * Math.cos(theta),
    radial * Math.sin(theta),
    radius * Math.sin(phi),
  ];
}

/** The alternating radial lift makes the two counterwound families pass over/under. */
function frame(theta: number, phase: number, handedness: number): Frame {
  const phi = handedness * 3 * theta + phase;
  const frequency = 3 * FAMILY_COUNT;
  const radius =
    BRAID_RADIUS + handedness * CROSSING_LIFT * Math.cos(frequency * theta);
  const radiusDerivative =
    -handedness * CROSSING_LIFT * frequency * Math.sin(frequency * theta);
  const around: Vec3 = [-Math.sin(theta), Math.cos(theta), 0];
  const radial: Vec3 = [Math.cos(theta), Math.sin(theta), 0];
  const normal: Vec3 = [
    Math.cos(phi) * radial[0],
    Math.cos(phi) * radial[1],
    Math.sin(phi),
  ];
  const meridian: Vec3 = [
    -Math.sin(phi) * radial[0],
    -Math.sin(phi) * radial[1],
    Math.cos(phi),
  ];
  const tangent = unit(
    add(
      add(
        scale(around, MAJOR_RADIUS + radius * Math.cos(phi)),
        scale(normal, radiusDerivative),
      ),
      scale(meridian, radius * handedness * 3),
    ),
  );
  const across = unit(cross(tangent, normal));
  return {
    center: torusPoint(theta, phi, radius),
    across,
    outward: unit(cross(across, tangent)),
  };
}

function profilePoint(section: Frame, alpha: number): Vec3 {
  return add(
    section.center,
    add(
      scale(section.across, HALF_WIDTH * Math.cos(alpha)),
      scale(section.outward, HALF_THICKNESS * Math.sin(alpha)),
    ),
  );
}

/** Closed elliptical strands have real thickness and continuous, explicit normals. */
function appendStrand(mesh: Mesh, phase: number, handedness: number): void {
  const base = mesh.positions.length / 3;
  for (let step = 0; step < PATH_SEGMENTS; step++) {
    const theta = (step / PATH_SEGMENTS) * TAU;
    const section = frame(theta, phase, handedness);
    const before = frame(theta - DERIVATIVE_STEP, phase, handedness);
    const after = frame(theta + DERIVATIVE_STEP, phase, handedness);
    const centerDerivative = derivative(after.center, before.center);
    const acrossDerivative = derivative(after.across, before.across);
    const outwardDerivative = derivative(after.outward, before.outward);
    for (let side = 0; side < PROFILE_SEGMENTS; side++) {
      const alpha = (side / PROFILE_SEGMENTS) * TAU;
      mesh.positions.push(...profilePoint(section, alpha));
      const along = add(
        centerDerivative,
        add(
          scale(acrossDerivative, HALF_WIDTH * Math.cos(alpha)),
          scale(outwardDerivative, HALF_THICKNESS * Math.sin(alpha)),
        ),
      );
      const around = add(
        scale(section.across, -HALF_WIDTH * Math.sin(alpha)),
        scale(section.outward, HALF_THICKNESS * Math.cos(alpha)),
      );
      mesh.normals.push(...unit(cross(along, around)));
    }
  }
  for (let step = 0; step < PATH_SEGMENTS; step++) {
    const next = (step + 1) % PATH_SEGMENTS;
    for (let side = 0; side < PROFILE_SEGMENTS; side++) {
      const neighbour = (side + 1) % PROFILE_SEGMENTS;
      const a = base + step * PROFILE_SEGMENTS + side;
      const b = base + next * PROFILE_SEGMENTS + side;
      const c = base + next * PROFILE_SEGMENTS + neighbour;
      const d = base + step * PROFILE_SEGMENTS + neighbour;
      mesh.indices.push(a, b, c, a, c, d);
    }
  }
}

function createCore(): Mesh {
  const mesh = newMesh('rose', 0.28, 0.48);
  mesh.colorRamp = { axis: 2, inks: ['ochre', 'vermilion', 'rose'] };
  const around = 160,
    profile = 48;
  for (let step = 0; step < around; step++) {
    const theta = (step / around) * TAU;
    for (let side = 0; side < profile; side++) {
      const phi = (side / profile) * TAU;
      mesh.positions.push(...torusPoint(theta, phi, CORE_RADIUS));
      mesh.normals.push(
        Math.cos(phi) * Math.cos(theta),
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi),
      );
    }
  }
  for (let step = 0; step < around; step++) {
    for (let side = 0; side < profile; side++) {
      const a = step * profile + side;
      const b = ((step + 1) % around) * profile + side;
      const c = ((step + 1) % around) * profile + ((side + 1) % profile);
      const d = step * profile + ((side + 1) % profile);
      mesh.indices.push(a, b, c, a, c, d);
    }
  }
  return mesh;
}

/** Authored geometry of a woven toroidal body, not a physical field simulation. */
export function createToroidalWeave(): FormScene {
  const meshes = new Map<FormInk, Mesh>();
  const lines: FormLine[] = [];
  const strandInks: FormInk[] = ['cobalt', 'cobalt', 'violet', 'teal'];
  for (const handedness of [1, -1]) {
    for (let strand = 0; strand < FAMILY_COUNT; strand++) {
      const phase = (strand / FAMILY_COUNT) * TAU;
      const ink =
        strandInks[(strand + (handedness < 0 ? 2 : 0)) % strandInks.length]!;
      if (!meshes.has(ink)) meshes.set(ink, newMesh(ink, 0.3, 0.42));
      appendStrand(meshes.get(ink)!, phase, handedness);
      // Three continuous surface fibers per broad strand carry fine detail without
      // turning the body's silhouette into a collection of thin wire loops.
      for (const alpha of [Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3]) {
        const points: Vec3[] = [];
        for (let step = 0; step <= PATH_SEGMENTS; step++) {
          const section = frame(
            (step / PATH_SEGMENTS) * TAU,
            phase,
            handedness,
          );
          const lift = unit(
            add(
              scale(section.across, Math.cos(alpha) / HALF_WIDTH),
              scale(section.outward, Math.sin(alpha) / HALF_THICKNESS),
            ),
          );
          points.push(add(profilePoint(section, alpha), scale(lift, 0.0015)));
        }
        lines.push({
          points,
          ink: alpha === Math.PI / 2 ? 'silver' : ink,
          opacity: alpha === Math.PI / 2 ? 0.35 : 0.62,
        });
      }
    }
  }
  return {
    radius: 2.42,
    framing: 'bounds',
    objects: [
      {
        position: [0, 0, 0],
        rotation: [0.66, -0.23, -0.25],
        sway: [0.008, 0.014, 0.004],
        phase: 0.3,
        surfaces: [createCore(), ...meshes.values()],
        lines,
      },
    ],
    annotations: [
      {
        object: 0,
        point: frame(0.55, 0, 1).center,
        label: 'Counterwound braid',
        detail: 'φ = ±3θ + 2πj/12 · j = 0…11',
        offset: [58, -54],
      },
      {
        object: 0,
        point: torusPoint(3.45, 2.85, CORE_RADIUS),
        label: 'Toroidal core',
        detail: 'R = 1.58 · r = 0.54 · θ, φ ∈ [0, 2π)',
        offset: [-154, 52],
      },
    ],
  };
}
