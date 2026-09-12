import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Owned, reproducible fixture: a tube around the (2, 3) torus knot.
// Its source is a curve, not an imported or remotely hosted asset.
const rings = 192;
const sides = 24;
const tubeRadius = 0.23;
const positions = [];
const normals = [];
const indices = [];
const add = (a, b) => a.map((value, i) => value + b[i]);
const scale = (a, amount) => a.map((value) => value * amount);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const normalize = (a) => scale(a, 1 / Math.hypot(...a));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

for (let ring = 0; ring <= rings; ring++) {
  const t = (ring / rings) * Math.PI * 2;
  const major = 1.65 + 0.65 * Math.cos(3 * t);
  const radial = [Math.cos(2 * t), Math.sin(2 * t), 0];
  const center = [major * radial[0], major * radial[1], 0.65 * Math.sin(3 * t)];
  const tangent = normalize([
    -1.95 * Math.sin(3 * t) * Math.cos(2 * t) - 2 * major * Math.sin(2 * t),
    -1.95 * Math.sin(3 * t) * Math.sin(2 * t) + 2 * major * Math.cos(2 * t),
    1.95 * Math.cos(3 * t),
  ]);
  const normal = normalize(add(radial, scale(tangent, -dot(radial, tangent))));
  const binormal = normalize(cross(tangent, normal));
  for (let side = 0; side <= sides; side++) {
    const angle = (side / sides) * Math.PI * 2;
    const outward = add(
      scale(normal, Math.cos(angle)),
      scale(binormal, Math.sin(angle)),
    );
    normals.push(...outward);
    positions.push(...add(center, scale(outward, tubeRadius)));
  }
}
for (let ring = 0; ring < rings; ring++) {
  for (let side = 0; side < sides; side++) {
    const a = ring * (sides + 1) + side;
    const b = a + sides + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
}

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i++) {
  min[i % 3] = Math.min(min[i % 3], positions[i]);
  max[i % 3] = Math.max(max[i % 3], positions[i]);
}
const positionBytes = Buffer.from(new Float32Array(positions).buffer);
const normalBytes = Buffer.from(new Float32Array(normals).buffer);
const indexBytes = Buffer.from(new Uint16Array(indices).buffer);
const binary = Buffer.concat([positionBytes, normalBytes, indexBytes]);
const linear = (byte) => {
  const value = byte / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const gltf = {
  asset: {
    version: '2.0',
    generator: 'Alkemist / scripts/generate-test-model.mjs',
    copyright: 'Alkemist project; original mathematical fixture.',
  },
  scene: 0,
  scenes: [{ name: 'Trefoil specimen', nodes: [0] }],
  nodes: [{ name: 'Torus knot (2, 3)', mesh: 0 }],
  meshes: [
    {
      name: 'Parametric tube',
      primitives: [
        { attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 },
      ],
    },
  ],
  materials: [
    {
      name: 'Cobalt ink',
      pbrMetallicRoughness: {
        baseColorFactor: [linear(25), linear(130), linear(242), 1],
        metallicFactor: 0.18,
        roughnessFactor: 0.36,
      },
      extras: { ink: 'cobalt' },
    },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      min,
      max,
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: normals.length / 3,
      type: 'VEC3',
    },
    {
      bufferView: 2,
      componentType: 5123,
      count: indices.length,
      type: 'SCALAR',
    },
  ],
  bufferViews: [
    {
      buffer: 0,
      byteOffset: 0,
      byteLength: positionBytes.length,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: positionBytes.length,
      byteLength: normalBytes.length,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: positionBytes.length + normalBytes.length,
      byteLength: indexBytes.length,
      target: 34963,
    },
  ],
  buffers: [{ byteLength: binary.length }],
  extras: {
    curve:
      '((1.65 + 0.65 cos(3t)) cos(2t), (1.65 + 0.65 cos(3t)) sin(2t), 0.65 sin(3t))',
    parameter: 't in [0, 2pi]',
    rings,
    sides,
    tubeRadius,
  },
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(jsonChunk);
const binChunk = Buffer.alloc(Math.ceil(binary.length / 4) * 4);
binary.copy(binChunk);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHeader = (length, type) => {
  const bytes = Buffer.alloc(8);
  bytes.writeUInt32LE(length, 0);
  bytes.writeUInt32LE(type, 4);
  return bytes;
};
const model = Buffer.concat([
  header,
  chunkHeader(jsonChunk.length, 0x4e4f534a),
  jsonChunk,
  chunkHeader(binChunk.length, 0x004e4942),
  binChunk,
]);

// The poster projects these same generated triangles; no renderer or browser is needed.
const view = normalize([3, 2.1, 3]);
const right = normalize(cross([0, 1, 0], view));
const up = normalize(cross(view, right));
const light = normalize([2, 4, 5]);
const project = (point) => [
  480 + dot(point, right) * 115,
  320 - dot(point, up) * 115,
];
const polygons = [];
for (let i = 0; i < indices.length; i += 3) {
  const ids = indices.slice(i, i + 3);
  const points = ids.map((index) => positions.slice(index * 3, index * 3 + 3));
  const normal = normalize(
    ids.reduce(
      (sum, index) => add(sum, normals.slice(index * 3, index * 3 + 3)),
      [0, 0, 0],
    ),
  );
  if (dot(normal, view) < 0) continue;
  const illumination = 0.45 + Math.max(0, dot(normal, light)) * 0.55;
  const color = [25, 130, 242].map((value) => Math.round(value * illumination));
  polygons.push({
    depth: points.reduce((sum, point) => sum + dot(point, view), 0) / 3,
    svg: `<polygon points="${points
      .map(project)
      .map((point) => point.map((value) => value.toFixed(2)).join(','))
      .join(
        ' ',
      )}" fill="rgb(${color.join(',')})" stroke="rgb(${color.join(',')})" stroke-width="0.5"/>`,
  });
}
polygons.sort((a, b) => a.depth - b.depth);
const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640"><title>Static projection of the Alkemist torus-knot mesh</title><desc>A blue tube winds around a (2,3) torus knot. This poster is generated from the same geometry as the GLB.</desc>${polygons.map((polygon) => polygon.svg).join('')}</svg>\n`;
const output = fileURLToPath(
  new URL('../apps/site/public/test/', import.meta.url),
);
await mkdir(output, { recursive: true });
await writeFile(`${output}/torus-knot.glb`, model);
await writeFile(`${output}/torus-knot.svg`, poster);
console.log(
  `Generated ${positions.length / 3} vertices, ${indices.length / 3} triangles; ${model.length} byte GLB and matching SVG poster.`,
);
