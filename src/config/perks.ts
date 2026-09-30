/** Run-only perks picked when levelling up. They stack on top of permanent shop upgrades. */

import type { Modifiers } from './upgrades';

export type PerkId =
  | 'vitality'
  | 'hardened'
  | 'overcharge'
  | 'razor'
  | 'hairtrigger'
  | 'leech'
  | 'secondwind'
  | 'greed'
  | 'magnet'
  | 'ironwill';

export interface PerkDef {
  readonly id: PerkId;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly maxStacks: number;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'vitality', name: 'Vitality', icon: '❤️', description: '+25 max HP and a full heal', maxStacks: 5 },
  { id: 'hardened', name: 'Hardened', icon: '🛡️', description: 'Take 10% less damage', maxStacks: 4 },
  { id: 'overcharge', name: 'Overcharge', icon: '⚡', description: '+10% launch power & top speed', maxStacks: 4 },
  { id: 'razor', name: 'Razor Hull', icon: '🔪', description: '+25% ramming damage', maxStacks: 5 },
  { id: 'hairtrigger', name: 'Hair Trigger', icon: '🎯', description: 'Ramming works at 15% lower speed', maxStacks: 3 },
  { id: 'leech', name: 'Leech', icon: '🩸', description: 'Heal 3 HP per kill', maxStacks: 4 },
  { id: 'secondwind', name: 'Second Wind', icon: '🌬️', description: 'Regenerate 1 HP per second', maxStacks: 3 },
  { id: 'greed', name: 'Greed', icon: '💰', description: '+15% coins earned this run', maxStacks: 4 },
  { id: 'magnet', name: 'Tractor Beam', icon: '🧲', description: '+60px pickup reach for gems & health', maxStacks: 3 },
  { id: 'ironwill', name: 'Iron Will', icon: '⏳', description: 'Stay invulnerable 150ms longer after a hit', maxStacks: 3 },
];

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 60 + (level - 1) * 45;
}

/** Up to `count` distinct perks that aren't maxed yet, chosen with `random`. */
export function rollPerkChoices(
  stacks: (id: PerkId) => number,
  count: number,
  random: () => number,
): PerkDef[] {
  const pool = PERKS.filter((p) => stacks(p.id) < p.maxStacks);
  const out: PerkDef[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  return out;
}

/** Modifiers granted by the current perk stacks (neutral values when none). */
export function perkModifiers(stacks: (id: PerkId) => number): Modifiers {
  return {
    maxHpBonus: 25 * stacks('vitality'),
    damageTaken: Math.pow(0.9, stacks('hardened')),
    launchPower: 1 + 0.1 * stacks('overcharge'),
    ramDamage: 1 + 0.25 * stacks('razor'),
    pickupReach: 60 * stacks('magnet'),
    regenPerSec: stacks('secondwind'),
    coinMultiplier: 1 + 0.15 * stacks('greed'),
    ramThreshold: Math.pow(0.85, stacks('hairtrigger')),
    healPerKill: 3 * stacks('leech'),
    extraInvulnMs: 150 * stacks('ironwill'),
  };
}
