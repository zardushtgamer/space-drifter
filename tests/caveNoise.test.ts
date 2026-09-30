import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig';
import { isCaveWall, valueNoise } from '../src/core/caveNoise';

const shape = gameConfig.caves;

describe('cave noise', () => {
  it('is deterministic', () => {
    expect(valueNoise(7, 3.3, -8.1)).toBe(valueNoise(7, 3.3, -8.1));
    expect(isCaveWall(7, 1234, -987, shape)).toBe(isCaveWall(7, 1234, -987, shape));
  });

  it('is continuous (no seams between lattice cells)', () => {
    const eps = 1e-6;
    expect(Math.abs(valueNoise(7, 2 - eps, 5.5) - valueNoise(7, 2 + eps, 5.5))).toBeLessThan(1e-4);
  });

  it('leaves a healthy mix of rock and open space', () => {
    let walls = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      if (isCaveWall(99, (i % 80) * 97, Math.floor(i / 80) * 97, shape)) walls++;
    }
    expect(walls / n).toBeGreaterThan(0.25);
    expect(walls / n).toBeLessThan(0.65);
  });
});
