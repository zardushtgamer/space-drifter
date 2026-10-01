import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig';
import {
  computeModifiers,
  INFINITY_STOP_GAP,
  infinityApproachCap,
  infinityStats,
  singularityStats,
  supernovaStats,
  UPGRADES,
  upgradePrice,
} from '../src/config/upgrades';
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

  it('Infinity slows approach and stops things just barely touching', () => {
    const { range, maxApproach } = infinityStats(1);
    expect(infinityApproachCap(range + 10, range, maxApproach)).toBe(Infinity);
    expect(infinityApproachCap(range / 2, range, maxApproach)).toBeCloseTo(maxApproach / 2);
    // Never allowed to overshoot the remaining gap...
    const near = INFINITY_STOP_GAP + 2;
    expect(infinityApproachCap(near, range, maxApproach)).toBeLessThanOrEqual(near - INFINITY_STOP_GAP);
    // ...and dead stop once barely touching.
    expect(infinityApproachCap(INFINITY_STOP_GAP, range, maxApproach)).toBe(0);
    expect(infinityApproachCap(-5, range, maxApproach)).toBe(0);
    expect(infinityStats(3).range).toBeGreaterThan(range);
  });

  it('Infinity actually lets things arrive at the stop gap (no endless crawl)', () => {
    const { range, maxApproach } = infinityStats(1);
    // Start just inside the field (at the edge itself there's no cap).
    let gap = range - 1;
    let steps = 0;
    while (gap > INFINITY_STOP_GAP && steps < 1000) {
      gap -= infinityApproachCap(gap, range, maxApproach);
      steps++;
    }
    expect(gap).toBeCloseTo(INFINITY_STOP_GAP);
    expect(steps).toBeLessThan(1000);
  });

  it('Supernova needs Infinity and Singularity first, and scales with level', () => {
    const s = new SaveData(memoryStore());
    s.addCoins(1_000_000);
    const supernova = UPGRADES.find((u) => u.id === 'supernova')!;
    expect(s.buyUpgrade(supernova)).toBe(false);
    s.buyUpgrade(UPGRADES.find((u) => u.id === 'infinity')!);
    expect(s.buyUpgrade(supernova)).toBe(false);
    s.buyUpgrade(UPGRADES.find((u) => u.id === 'singularity')!);
    expect(s.buyUpgrade(supernova)).toBe(true);

    const l1 = supernovaStats(1);
    const l5 = supernovaStats(5);
    expect(l5.damage).toBeGreaterThan(l1.damage);
    expect(l5.knockback).toBeGreaterThan(l1.knockback);
    expect(l5.radius).toBeGreaterThan(l1.radius);
    expect(l5.vfx).toBeGreaterThan(l1.vfx);
    expect(l5.cooldownMs).toBeLessThan(l1.cooldownMs);
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
