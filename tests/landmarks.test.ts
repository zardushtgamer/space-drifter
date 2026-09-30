import { describe, expect, it } from 'vitest';
import { DIMENSION_IDS } from '../src/config/dimensions';
import { gameConfig } from '../src/config/gameConfig';
import { gasGiantPosition, LANDMARKS } from '../src/config/landmarks';
import { distToSegment } from '../src/systems/LandmarkSystem';

describe('landmarks', () => {
  it('gives every dimension except The Void (TON 618) exactly one landmark', () => {
    for (const id of DIMENSION_IDS) {
      const n = LANDMARKS.filter((l) => l.dimension === id).length;
      expect(n).toBe(id === 'void' ? 0 : 1);
    }
  });

  it('keeps landmarks well away from the player spawn at the origin', () => {
    for (const l of LANDMARKS) {
      expect(Math.hypot(l.position.x, l.position.y) - l.clearRadius).toBeGreaterThan(1000);
    }
  });

  it('keeps every gas giant clear of spawn, its landmark and TON 618', () => {
    const g = gameConfig.gasGiant;
    const reach = g.radius * g.reachScale;
    for (const id of DIMENSION_IDS) {
      const p = gasGiantPosition(id, g.distance);
      expect(Math.hypot(p.x, p.y) - reach).toBeGreaterThan(gameConfig.ton618.radius * gameConfig.ton618.reachScale);
      for (const l of LANDMARKS.filter((x) => x.dimension === id)) {
        expect(Math.hypot(p.x - l.position.x, p.y - l.position.y)).toBeGreaterThan(reach + l.clearRadius);
      }
    }
  });

  it('is 100 ly across', () => {
    expect((gameConfig.gasGiant.radius * 2) / gameConfig.economy.pxPerLy).toBe(100);
  });

  it('measures distance to a beam segment', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    expect(distToSegment({ x: 50, y: 10 }, a, b)).toBeCloseTo(10);
    expect(distToSegment({ x: -30, y: 40 }, a, b)).toBeCloseTo(50);
    expect(distToSegment({ x: 130, y: 0 }, a, b)).toBeCloseTo(30);
  });
});
