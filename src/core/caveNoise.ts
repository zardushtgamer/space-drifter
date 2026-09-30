import { chunkSeed } from './random';

/** Hash of a lattice point to [0, 1). */
function lattice(seed: number, ix: number, iy: number): number {
  return chunkSeed(seed, ix, iy) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth 2D value noise in [0, 1), continuous everywhere (so caves line up across chunks). */
export function valueNoise(seed: number, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = lattice(seed, ix, iy);
  const b = lattice(seed, ix + 1, iy);
  const c = lattice(seed, ix, iy + 1);
  const d = lattice(seed, ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export interface CaveShape {
  /** Size of the big caverns, px. */
  readonly largeScale: number;
  /** Size of the rough detail, px. */
  readonly smallScale: number;
  /** Noise above this is solid rock. Lower = more rock. */
  readonly threshold: number;
}

/** True where the cave dimension has solid rock at world point (x, y). */
export function isCaveWall(seed: number, x: number, y: number, shape: CaveShape): boolean {
  const n =
    0.7 * valueNoise(seed, x / shape.largeScale, y / shape.largeScale) +
    0.3 * valueNoise(seed ^ 0x9e37, x / shape.smallScale, y / shape.smallScale);
  return n > shape.threshold;
}
