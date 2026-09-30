import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig';
import { computeModifiers, singularityStats, UPGRADES, upgradePrice } from '../src/config/upgrades';
import { SaveData, type KeyValueStore } from '../src/core/SaveData';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const hull = UPGRADES.find((u) => u.id === 'hull')!;
const lucky = UPGRADES.find((u) => u.id === 'lucky')!;

describe('upgrades', () => {
  it('has no effect at level 0', () => {
    const m = computeModifiers(() => 0);
    expect(m).toEqual({
      maxHpBonus: 0,
      damageTaken: 1,
      launchPower: 1,
      ramDamage: 1,
      pickupReach: 0,
      regenPerSec: 0,
      coinMultiplier: 1,
      ramThreshold: 1,
      healPerKill: 0,
      extraInvulnMs: 0,
    });
  });

  it('never lets armor make you invulnerable', () => {
    const armor = UPGRADES.find((u) => u.id === 'armor')!;
    expect(computeModifiers(() => armor.maxLevel).damageTaken).toBeGreaterThan(0.5);
  });

  it('charges more per level and stops at max', () => {
    const s = new SaveData(memoryStore());
    s.addCoins(100_000);
    for (let i = 0; i < hull.maxLevel; i++) expect(s.buyUpgrade(hull)).toBe(true);
    expect(s.upgradeLevel('hull')).toBe(hull.maxLevel);
    expect(s.buyUpgrade(hull)).toBe(false);
    expect(upgradePrice(hull, 2)).toBeGreaterThan(upgradePrice(hull, 1));
  });

  it('refuses when you cannot afford it', () => {
    const s = new SaveData(memoryStore());
    expect(s.buyUpgrade(hull)).toBe(false);
    expect(s.upgradeLevel('hull')).toBe(0);
  });

  it('grows the Singularity with level, and always swallows before contact', () => {
    const l1 = singularityStats(1);
    const l5 = singularityStats(5);
    expect(l5.reach).toBeGreaterThan(l1.reach);
    expect(l5.pull).toBeGreaterThan(l1.pull);
    expect(l5.horizon).toBeGreaterThan(l1.horizon);
    // Horizon is measured to an object's edge, so it must exceed the player's own radius.
    expect(l1.horizon).toBeGreaterThan(gameConfig.player.radius);
    expect(l1.swallowsPlanets).toBe(false);
    expect(singularityStats(3).swallowsPlanets).toBe(true);
  });

  it('boosts coins earned with the Lucky Charm and persists levels', () => {
    const store = memoryStore();
    const s = new SaveData(store);
    s.addCoins(upgradePrice(lucky, 0));
    s.buyUpgrade(lucky);
    expect(s.addCoins(100)).toBe(110);
    expect(new SaveData(store).upgradeLevel('lucky')).toBe(1);
  });
});
