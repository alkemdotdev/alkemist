import type { AlkInk } from '@alkemist/ui/palette';
import type {
  FormLine,
  FormObject,
  FormScene,
  FormSurface,
  Vec3,
} from './types';

type Layer = { scale: number; offset: number; ink: AlkInk };

function halfContour(
  scale: number,
  offset: number,
  side: number,
): [number, number][] {
  const points: [number, number][] = [];
  const segments = 60;
  for (let step = 0; step <= segments; step++) {
    const angle = -Math.PI / 2 + (step / segments) * Math.PI;
    const fullAngle = side > 0 ? angle : Math.PI - angle;
    const radius =
      scale *
      (1 +
        0.12 * Math.sin(3 * fullAngle + 0.4) +
        0.07 * Math.cos(2 * fullAngle - 0.8) +
        0.035 * Math.sin(5 * fullAngle));
    points.push([
      side * Math.cos(angle) * radius + offset + side * 0.2,
      Math.sin(angle) * radius * 0.66,
    ]);
  }
  // Each half has its own straight section face, exposing the vertical cleft.
  return side > 0 ? points : points.reverse();
}

function slab(contour: [number, number][], elevation: number, ink: AlkInk) {
  const thickness = 0.042;
  const positions: number[] = [];
  const indices: number[] = [];
  const count = contour.length;
  const center = contour.reduce(
    (sum, point) => [sum[0] + point[0] / count, sum[1] + point[1] / count],
    [0, 0],
  );
  for (const height of [elevation + thickness / 2, elevation - thickness / 2]) {
    for (const [x, z] of contour) positions.push(x, height, z);
    positions.push(center[0], height, center[1]);
  }
  const stride = count + 1;
  for (let vertex = 0; vertex < count; vertex++) {
    const next = (vertex + 1) % count;
    indices.push(
      count,
      next,
      vertex,
      count + stride,
      vertex + stride,
      next + stride,
    );
    indices.push(
      vertex,
      next,
      vertex + stride,
      next,
      next + stride,
      vertex + stride,
    );
  }
  const lines: FormLine[] = [0.5, -0.5].map((side) => {
    const points: Vec3[] = contour.map(([x, z]) => [
      x,
      elevation + thickness * side,
      z,
    ]);
    points.push(points[0]);
    return { points, ink };
  });
  const surface: FormSurface = { positions, indices, ink };
  return { lines, surface };
}

/** A sectioned landform. Layer scales and offsets describe its asymmetric ridge. */
export function createStrata(): FormScene {
  const layers: Layer[] = [
    { scale: 1.57, offset: 0.26, ink: 'vermilion' },
    { scale: 1.98, offset: 0.17, ink: 'rose' },
    { scale: 2.25, offset: 0.05, ink: 'rose' },
    { scale: 2.33, offset: -0.08, ink: 'rose' },
    { scale: 2.2, offset: -0.19, ink: 'rose' },
    { scale: 1.91, offset: -0.32, ink: 'rose' },
    { scale: 1.46, offset: -0.47, ink: 'vermilion' },
    { scale: 0.91, offset: -0.62, ink: 'ochre' },
  ];
  const landform: FormObject = {
    position: [0.14, 0, 0],
    rotation: [0.1, -0.46, -0.16],
    sway: [0.035, 0.055, 0.02],
    phase: 0.5,
    lines: [],
    surfaces: [],
  };
  layers.forEach((layer, index) => {
    const elevation = (index - (layers.length - 1) / 2) * 0.34;
    for (const side of [-1, 1]) {
      const shape = slab(
        halfContour(layer.scale, layer.offset, side),
        elevation,
        layer.ink,
      );
      landform.lines.push(...shape.lines);
      landform.surfaces.push(shape.surface);
    }
  });
  return { radius: 3.3, objects: [landform] };
}
