import { describe, expect, it } from 'vitest';
import {
  BALLS,
  BUNDLES,
  bundlePrice,
  DEFAULT_BALL,
  DEFAULT_EFFECT,
  DEFAULT_TRAIL,
  EFFECTS,
  itemPrice,
  TRAILS,
} from '../src/config/cosmetics';
import { TESSERACT } from '../src/rendering/tesseract';
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

  it('builds a real tesseract: 16 vertices, 32 edges', () => {
    expect(TESSERACT).toEqual({ vertices: 16, edges: 32 });
  });

  it('prices bundles at a discount on only the items you lack', () => {
    const b = BUNDLES.find((x) => x.id === 'bundle-4d')!;
    const full = b.items.reduce((s, i) => s + itemPrice(i.slot, i.id), 0);
    expect(bundlePrice(b, () => false)).toBe(Math.round(full * b.priceFactor));
    expect(bundlePrice(b, () => false)).toBeLessThan(full);
    const ball = b.items.find((i) => i.slot === 'ball')!;
    expect(bundlePrice(b, (id) => id === ball.id)).toBe(Math.round((full - itemPrice('ball', ball.id)) * b.priceFactor));
    expect(bundlePrice(b, () => true)).toBe(0);
  });

  it('only bundles items that exist', () => {
    for (const b of BUNDLES) for (const i of b.items) expect(itemPrice(i.slot, i.id)).toBeGreaterThan(0);
  });

  it('makes every default free', () => {
    expect(BALLS.find((b) => b.id === DEFAULT_BALL)?.price).toBe(0);
    expect(TRAILS.find((t) => t.id === DEFAULT_TRAIL)?.price).toBe(0);
    expect(EFFECTS.find((e) => e.id === DEFAULT_EFFECT)?.price).toBe(0);
  });
});
