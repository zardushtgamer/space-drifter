import { describe, expect, it } from 'vitest';
import { DIMENSION_IDS, DIMENSIONS, pickOtherDimension } from '../src/config/dimensions';
import { gameConfig } from '../src/config/gameConfig';

describe('dimensions', () => {
  it('has 11 areas with unique layouts', () => {
    expect(DIMENSION_IDS).toHaveLength(11);
    const salts = DIMENSION_IDS.map((id) => DIMENSIONS[id].seedSalt);
    expect(new Set(salts).size).toBe(salts.length);
  });

  it('only references enemies and hazards that exist in the config', () => {
    for (const id of DIMENSION_IDS) {
      const d = DIMENSIONS[id];
      if (d.special) expect(gameConfig.enemyTypes).toHaveProperty(d.special.type);
      if (d.hazard) expect(gameConfig.hazards).toHaveProperty(d.hazard.type);
    }
  });

  it('only picks allowed destinations', () => {
    const allowed = DIMENSION_IDS.filter((id) => !DIMENSIONS[id].price);
    for (const r of [0, 0.3, 0.6, 0.9999]) {
      expect(DIMENSIONS[pickOtherDimension('milkyway', r, allowed)].price).toBeUndefined();
    }
  });

  it('never picks the current dimension as a destination', () => {
    for (const id of DIMENSION_IDS) {
      for (const r of [0, 0.2, 0.5, 0.8, 0.9999]) expect(pickOtherDimension(id, r)).not.toBe(id);
    }
  });
});
