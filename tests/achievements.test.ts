import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementKey } from '../src/config/achievements';
import { DimensionState } from '../src/config/dimensions';
import { EventBus } from '../src/core/EventBus';
import type { EventMap } from '../src/core/events';
import { RunLevels } from '../src/core/RunLevels';
import { RunStats } from '../src/core/RunStats';
import { SaveData, type KeyValueStore } from '../src/core/SaveData';
import { AchievementSystem } from '../src/systems/AchievementSystem';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function setup() {
  const bus = new EventBus<EventMap>();
  const save = new SaveData(memoryStore());
  const stats = new RunStats();
  const unlocked: string[] = [];
  const system = new AchievementSystem(
    save,
    stats,
    new RunLevels(bus, { perBossLevel: 250, perRound: 15 }),
    new DimensionState(),
    () => 0,
    bus,
    (def) => unlocked.push(def.id),
  );
  return { bus, save, stats, unlocked, system };
}

describe('achievements', () => {
  it('have unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('unlocks once, pays the reward, and tracks lifetime kills', () => {
    const { save, stats, unlocked, system } = setup();
    stats.kills = 1;
    system.check();
    expect(unlocked).toContain('first_blood');
    expect(save.isUnlocked(achievementKey('first_blood'))).toBe(true);
    expect(save.counter('kills')).toBe(1);
    const coins = save.coins;
    system.check();
    expect(unlocked.filter((id) => id === 'first_blood')).toHaveLength(1);
    expect(save.coins).toBe(coins);
  });

  it('awards Untouchable for a clean round from round 3', () => {
    const { bus, unlocked, system } = setup();
    bus.emit('round:cleared', { round: 3 });
    system.check();
    expect(unlocked).toContain('untouchable');
  });

  it('does not award Untouchable after taking damage', () => {
    const { bus, unlocked, system } = setup();
    bus.emit('player:damaged', { hp: 100, maxHp: 100 });
    bus.emit('player:damaged', { hp: 90, maxHp: 100 });
    bus.emit('round:cleared', { round: 3 });
    system.check();
    expect(unlocked).not.toContain('untouchable');
  });

  it('awards the Mach 3 achievement only at Mach 3', () => {
    const { stats, unlocked, system } = setup();
    stats.topMach = 2.95;
    system.check();
    expect(unlocked).not.toContain('mach3');
    stats.topMach = 3.01;
    system.check();
    expect(unlocked).toContain('mach3');
  });

  it('counts a visit to the current dimension', () => {
    const { save, system } = setup();
    system.check();
    expect(save.isUnlocked('visit:milkyway')).toBe(true);
  });
});
