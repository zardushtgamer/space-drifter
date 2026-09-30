import { describe, expect, it } from 'vitest';
import { BALLS, DEFAULT_BALL, DEFAULT_EFFECT, DEFAULT_TRAIL, EFFECTS, TRAILS } from '../src/config/cosmetics';
import { DIMENSION_IDS } from '../src/config/dimensions';
import { EFFECT_IDS } from '../src/rendering/effects';

describe('cosmetics catalog', () => {
  it('uses ids that are unique across balls, trails and effects (they share one owned list)', () => {
    const ids = [...BALLS, ...TRAILS, ...EFFECTS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has an animation for every effect except None', () => {
    for (const e of EFFECTS) if (e.id !== DEFAULT_EFFECT) expect(EFFECT_IDS).toContain(e.id);
  });

  it('has a themed ball, trail and effect for every dimension except home', () => {
    for (const id of DIMENSION_IDS.filter((d) => d !== 'milkyway')) {
      expect(BALLS.some((b) => b.theme === id)).toBe(true);
      expect(TRAILS.some((t) => t.theme === id)).toBe(true);
      expect(EFFECTS.some((e) => e.theme === id)).toBe(true);
    }
  });

  it('makes every default free', () => {
    expect(BALLS.find((b) => b.id === DEFAULT_BALL)?.price).toBe(0);
    expect(TRAILS.find((t) => t.id === DEFAULT_TRAIL)?.price).toBe(0);
    expect(EFFECTS.find((e) => e.id === DEFAULT_EFFECT)?.price).toBe(0);
  });
});
