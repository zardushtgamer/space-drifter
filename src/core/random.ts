/** Small, fast seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a chunk coordinate, so each chunk always generates the same layout. */
export function chunkSeed(seed: number, cx: number, cy: number): number {
  const mix = (h: number, k: number) => {
    h = Math.imul(h ^ k, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    return h ^ (h >>> 16);
  };
  return mix(mix(mix(0x9e3779b9, seed), cx), cy) >>> 0;
}
