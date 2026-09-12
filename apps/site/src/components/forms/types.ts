import type { Ink } from '@alkemdotdev/alkemist-theme/palette';

export type Vec3 = [number, number, number];
export type FormInk = Ink | 'silver' | 'graphite' | 'construction';
export type FormLine = { points: Vec3[]; ink: FormInk; opacity?: number };
export type FormSurface = {
  positions: number[];
  indices: number[];
  /** Optional unit normals in the same object-local coordinates as positions. */
  normals?: number[];
  ink: FormInk;
  opacity?: number;
  /** An illustrative color ramp along one local coordinate, not measured data. */
  colorRamp?: { axis: 0 | 1 | 2; inks: [FormInk, FormInk, ...FormInk[]] };
  roughness?: number;
  metalness?: number;
};
export type FormObject = {
  position: Vec3;
  rotation: Vec3;
  lines: FormLine[];
  surfaces: FormSurface[];
  /** Small angular excursions around the composed resting pose, in radians. */
  sway: Vec3;
  phase?: number;
};
export type FormScene = {
  objects: FormObject[];
  /** Bounding sphere around the origin, including motion. */
  radius: number;
  framing?: 'bounds';
  annotations?: {
    /** Local coordinates of the indicated object, or world coordinates if omitted. */
    point: Vec3;
    object?: number;
    label: string;
    detail: string;
    offset: [number, number];
  }[];
};
export type FormId =
  | 'orbit'
  | 'strata'
  | 'interference'
  | 'assembly'
  | 'flux'
  | 'weave'
  | 'vortex'
  | 'knot';
