import { describe, expect, it, vi } from 'vitest';
import { Health } from '../src/components/Health';
import { PERKS, perkModifiers, rollPerkChoices, xpToNext } from '../src/config/perks';
import { combineModifiers, computeModifiers } from '../src/config/upgrades';
import { EventBus } from '../src/core/EventBus';
import type { EventMap } from '../src/core/events';
import { RunLevels } from '../src/core/RunLevels';

const rewards = { perBossLevel: 250, perRound: 15 };

describe('RunLevels', () => {
  it('levels up from kills and queues a perk choice', () => {
    const bus = new EventBus<EventMap>();
    const onLevel = vi.fn();
    bus.on('level:up', onLevel);
    const levels = new RunLevels(bus, rewards);
    bus.emit('enemy:killed', { id: 1, score: xpToNext(1) });
    expect(levels.level).toBe(2);
    expect(levels.pending).toBe(1);
    expect(onLevel).toHaveBeenCalledWith({ level: 2 });
  });

  it('can gain several levels at once and carries leftover XP', () => {
    const levels = new RunLevels(new EventBus<EventMap>(), rewards);
    levels.gain(xpToNext(1) + xpToNext(2) + 5);
    expect(levels.level).toBe(3);
    expect(levels.pending).toBe(2);
    expect(levels.xp).toBe(5);
  });

  it('applies perks, including Vitality raising max HP', () => {
    const levels = new RunLevels(new EventBus<EventMap>(), rewards);
    const hp = new Health(100);
    hp.damage(50);
    levels.gain(xpToNext(1));
    levels.choose('vitality', hp);
    expect(hp.maxHp).toBe(125);
    expect(hp.hp).toBe(125);
    expect(levels.pending).toBe(0);
    // No pending level-up: choosing does nothing.
    levels.choose('razor', hp);
    expect(levels.stack('razor')).toBe(0);
  });

  it('offers distinct perks and never offers maxed ones', () => {
    const maxed = new Set(PERKS.slice(0, PERKS.length - 2).map((p) => p.id));
    const choices = rollPerkChoices((id) => (maxed.has(id) ? 99 : 0), 3, Math.random);
    expect(choices).toHaveLength(2);
    expect(new Set(choices.map((c) => c.id)).size).toBe(2);
  });

  it('stacks perks on top of shop upgrades', () => {
    const combined = combineModifiers(computeModifiers(() => 1), perkModifiers(() => 1));
    expect(combined.maxHpBonus).toBe(45);
    expect(combined.damageTaken).toBeCloseTo(0.92 * 0.9);
    expect(combined.healPerKill).toBe(3);
  });
});
