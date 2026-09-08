import type { FormLine, FormScene, Vec3 } from './types';

const DOMAIN_RADIUS = 1.78;
const SCALE = 0.835;
const RADIAL_SEGMENTS = 160;
const ANGULAR_SEGMENTS = 224;

/** The classical Enneper immersion, uniformly scaled without geometric distortion. */
function point(u: number, v: number, normalOffset = 0): Vec3 {
  const radiusSquared = u * u + v * v;
  const denominator = 1 + radiusSquared;
  // Analytic unit normal of r_u × r_v. A signed lift keeps the etched net clear
  // of the triangulated skin on either side without offsetting it along an axis.
  return [
    SCALE * (u - (u * u * u) / 3 + u * v * v) +
      (normalOffset * 2 * u) / denominator,
    SCALE * (-v - u * u * v + (v * v * v) / 3) +
      (normalOffset * 2 * v) / denominator,
    SCALE * (u * u - v * v) +
      (normalOffset * (radiusSquared - 1)) / denominator,
  ];
}

/** A continuous minimal surface, its conformal coordinate net, and traced rim. */
export function createOrbit(): FormScene {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];
  const lines: FormLine[] = [];

  // A disk avoids the inflated corners of a rectangular parameter patch. The
  // shared central vertex and periodic ring indices leave no seam or tiny fan
  // degeneracies at the pole.
  for (let ring = 1; ring <= RADIAL_SEGMENTS; ring++) {
    const radius = (ring / RADIAL_SEGMENTS) * DOMAIN_RADIUS;
    for (let segment = 0; segment < ANGULAR_SEGMENTS; segment++) {
      const angle = (segment / ANGULAR_SEGMENTS) * Math.PI * 2;
      positions.push(
        ...point(radius * Math.cos(angle), radius * Math.sin(angle)),
      );
    }
  }
  for (let segment = 0; segment < ANGULAR_SEGMENTS; segment++) {
    const next = (segment + 1) % ANGULAR_SEGMENTS;
    indices.push(0, 1 + segment, 1 + next);
  }
  for (let ring = 1; ring < RADIAL_SEGMENTS; ring++) {
    const inner = 1 + (ring - 1) * ANGULAR_SEGMENTS;
    const outer = inner + ANGULAR_SEGMENTS;
    for (let segment = 0; segment < ANGULAR_SEGMENTS; segment++) {
      const next = (segment + 1) % ANGULAR_SEGMENTS;
      indices.push(
        inner + segment,
        outer + segment,
        outer + next,
        inner + segment,
        outer + next,
        inner + next,
      );
    }
  }

  // Twenty-five curves in each family show the actual u/v parameterization.
  // The paired strokes expose the net on both faces of this two-sided sheet.
  for (let family = 0; family < 2; family++) {
    for (let coordinate = -12; coordinate <= 12; coordinate++) {
      const fixed = (coordinate / 13) * DOMAIN_RADIUS;
      const extent = Math.sqrt(DOMAIN_RADIUS * DOMAIN_RADIUS - fixed * fixed);
      const major = coordinate % 4 === 0;
      for (const lift of [-0.0035, 0.0035]) {
        const points: Vec3[] = [];
        for (let step = 0; step <= 240; step++) {
          const variable = -extent + (2 * extent * step) / 240;
          points.push(
            family === 0
              ? point(fixed, variable, lift)
              : point(variable, fixed, lift),
          );
        }
        lines.push({
          points,
          ink: family === 0 ? 'cyan' : 'rose',
          opacity: coordinate === 0 ? 0.9 : major ? 0.72 : 0.42,
        });
      }
    }
  }

  for (const lift of [-0.004, 0.004]) {
    const boundary: Vec3[] = [];
    for (let segment = 0; segment <= 640; segment++) {
      const angle = (segment / 640) * Math.PI * 2;
      boundary.push(
        point(
          DOMAIN_RADIUS * Math.cos(angle),
          DOMAIN_RADIUS * Math.sin(angle),
          lift,
        ),
      );
    }
    lines.push({ points: boundary, ink: 'ochre', opacity: 0.82 });
  }

  return {
    radius: 3.2,
    framing: 'bounds',
    objects: [
      {
        position: [0, 0, 0],
        rotation: [-0.72, -0.26, -0.36],
        sway: [0.025, 0.035, 0.008],
        phase: 0,
        lines,
        surfaces: [
          {
            positions,
            indices,
            ink: 'violet',
            colorRamp: { axis: 2, inks: ['cobalt', 'violet', 'rose'] },
            roughness: 0.32,
            metalness: 0.28,
          },
        ],
      },
    ],
    annotations: [
      {
        object: 0,
        point: point(-0.48, 0.65),
        label: 'Conformal coordinates',
        detail: '∂ᵤr · ∂ᵥr = 0',
        offset: [-146, -76],
      },
      {
        object: 0,
        point: point(1.3, 0.2),
        label: 'Minimal immersion',
        detail: 'Mean curvature H ≡ 0',
        offset: [52, -64],
      },
      {
        object: 0,
        point: point(-DOMAIN_RADIUS * 0.8, -DOMAIN_RADIUS * 0.6),
        label: 'Circular parameter boundary',
        detail: 'u² + v² = 1.78²',
        offset: [46, 52],
      },
    ],
  };
}
