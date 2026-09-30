import { describe, expect, it } from 'vitest';
import { chunkSeed, mulberry32 } from '../src/core/random';

describe('seeded chunk generation', () => {
  it('produces the same sequence for the same chunk', () => {
    const a = mulberry32(chunkSeed(1, 3, -7));
    const b = mulberry32(chunkSeed(1, 3, -7));
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('gives different chunks different seeds', () => {
    const seeds = new Set<number>();
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) seeds.add(chunkSeed(1, x, y));
    expect(seeds.size).toBe(121);
  });

  it('stays in [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
