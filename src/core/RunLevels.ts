import { perkModifiers, PERKS, rollPerkChoices, xpToNext, type PerkDef, type PerkId } from '../config/perks';
import type { Modifiers } from '../config/upgrades';
import type { Health } from '../components/Health';
import type { EventBus } from './EventBus';
import type { EventMap } from './events';
import type { IDisposable } from './types';

export interface XpRewards {
  /** XP per boss level. */
  perBossLevel: number;
  /** XP per round number when a round is cleared. */
  perRound: number;
}

/**
 * Per-run XP and levels. Kills, bosses and round clears give XP; each level
 * queues a perk choice. Resets every run.
 */
export class RunLevels implements IDisposable {
  level = 1;
  xp = 0;
  /** Level-ups not yet spent on a perk. */
  pending = 0;
  private readonly stacks = new Map<PerkId, number>();
  private readonly unsubs: Array<() => void>;

  constructor(
    private readonly bus: EventBus<EventMap>,
    rewards: XpRewards,
    private readonly random: () => number = Math.random,
  ) {
    this.unsubs = [
      bus.on('enemy:killed', ({ score }) => this.gain(score)),
      bus.on('boss:killed', ({ level }) => this.gain(rewards.perBossLevel * level)),
      bus.on('round:cleared', ({ round }) => this.gain(rewards.perRound * round)),
    ];
  }

  get xpNeeded(): number {
    return xpToNext(this.level);
  }

  stack(id: PerkId): number {
    return this.stacks.get(id) ?? 0;
  }

  gain(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    let levelled = false;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      this.pending++;
      levelled = true;
    }
    if (levelled) this.bus.emit('level:up', { level: this.level });
  }

  /** Three perk options for the next pending level-up. */
  rollChoices(): PerkDef[] {
    return rollPerkChoices((id) => this.stack(id), 3, this.random);
  }

  /** Spends a pending level-up on a perk. Vitality applies its max-HP boost and heal to `health`. */
  choose(id: PerkId, health: Health): void {
    const def = PERKS.find((p) => p.id === id);
    if (!def || this.pending <= 0 || this.stack(id) >= def.maxStacks) return;
    this.pending--;
    this.stacks.set(id, this.stack(id) + 1);
    if (id === 'vitality') {
      health.setMaxHp(health.maxHp + 25);
      health.heal(health.maxHp);
    }
  }

  /** Skip a level-up when every perk is maxed. */
  skip(): void {
    if (this.pending > 0) this.pending--;
  }

  modifiers(): Modifiers {
    return perkModifiers((id) => this.stack(id));
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
  }
}
