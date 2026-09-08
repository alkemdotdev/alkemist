import type { AlkInk } from '@alkemist/ui/palette';

export type Vec3 = [number, number, number];
export type FormLine = { points: Vec3[]; ink: AlkInk; opacity?: number };
export type FormSurface = {
  positions: number[];
  indices: number[];
  ink: AlkInk;
  opacity?: number;
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
};
export type FormId = 'orbit' | 'strata' | 'interference' | 'assembly';
