import { describe, expect, it } from 'vitest';
import {
  BALLS,
  BUNDLES,
  bundlePrice,
  DEFAULT_BALL,
  DEFAULT_EFFECT,
  DEFAULT_KILL,
  DEFAULT_TRAIL,
  EFFECTS,
  itemPrice,
  KILL_EFFECTS,
  TRAILS,
} from '../src/config/cosmetics';
import { KILL_FX_IDS, KillFxEngine } from '../src/rendering/killfx';
import { TESSERACT } from '../src/rendering/tesseract';
import { DIMENSION_IDS } from '../src/config/dimensions';
import { EFFECT_IDS } from '../src/rendering/effects';

describe('cosmetics catalog', () => {
  it('uses ids that are unique across every slot (they share one owned list)', () => {
    const ids = [...BALLS, ...TRAILS, ...EFFECTS, ...KILL_EFFECTS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a particle spawner for every kill effect', () => {
    for (const k of KILL_EFFECTS) expect(KILL_FX_IDS).toContain(k.id);
  });

  it('makes every bundle-only item obtainable from some bundle', () => {
    const bundled = new Set(BUNDLES.flatMap((b) => b.items.map((i) => i.id)));
    for (const item of [...BALLS, ...TRAILS, ...EFFECTS, ...KILL_EFFECTS]) {
      if (item.bundleOnly) expect(bundled.has(item.id)).toBe(true);
    }
  });

  it('gives every glyph trail some glyphs', () => {
    for (const t of TRAILS) if (t.style === 'glyphs') expect(t.glyphs?.length).toBeGreaterThan(0);
  });

  it('spawns and fully clears kill particles', () => {
    for (const id of KILL_FX_IDS) {
      const fx = new KillFxEngine();
      fx.spawn(id, 0, 0, '#fff', 12, () => 0.5);
      expect(fx.count).toBeGreaterThan(0);
      for (let i = 0; i < 200; i++) fx.update(50);
      expect(fx.count).toBe(0);
    }
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
    expect(KILL_EFFECTS.find((k) => k.id === DEFAULT_KILL)?.price).toBe(0);
  });
});
