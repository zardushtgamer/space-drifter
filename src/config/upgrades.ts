/** Permanent, levelled gameplay upgrades bought in the shop. */

export type UpgradeId =
  | 'hull'
  | 'armor'
  | 'thrusters'
  | 'spikes'
  | 'magnet'
  | 'regen'
  | 'lucky'
  | 'singularity'
  | 'radar';

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly name: string;
  readonly icon: string;
  /** What one level does, for the shop card. */
  readonly perLevel: string;
  readonly maxLevel: number;
  /** Cost of level n (1-based) is basePrice * n. */
  readonly basePrice: number;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'hull', name: 'Reinforced Hull', icon: '❤️', perLevel: '+20 max HP', maxLevel: 5, basePrice: 150 },
  { id: 'armor', name: 'Armor Plating', icon: '🛡️', perLevel: '−8% damage taken', maxLevel: 5, basePrice: 200 },
  { id: 'thrusters', name: 'Thrusters', icon: '🚀', perLevel: '+8% launch power & top speed', maxLevel: 5, basePrice: 180 },
  { id: 'spikes', name: 'Ram Spikes', icon: '🔱', perLevel: '+20% ramming damage', maxLevel: 5, basePrice: 180 },
  { id: 'magnet', name: 'Magnet', icon: '🧲', perLevel: '+60px pickup reach for gems & health', maxLevel: 3, basePrice: 250 },
  { id: 'regen', name: 'Nano Repair', icon: '🔧', perLevel: '+1 HP every 2s', maxLevel: 3, basePrice: 350 },
  { id: 'lucky', name: 'Lucky Charm', icon: '🍀', perLevel: '+10% coins earned', maxLevel: 5, basePrice: 300 },
  {
    id: 'singularity',
    name: 'Singularity',
    icon: '🕳️',
    perLevel: 'become a black hole that pulls in and swallows EVERYTHING (B to toggle). Wider, stronger, hungrier',
    maxLevel: 5,
    basePrice: 600,
  },
  {
    id: 'radar',
    name: 'Radar',
    icon: '📡',
    perLevel: 'Lv1: edge arrows to every off-screen enemy · Lv2: adds a radar minimap',
    maxLevel: 2,
    basePrice: 400,
  },
];

/** Singularity strength at a given upgrade level (0 = not owned). */
export function singularityStats(level: number): {
  reach: number;
  pull: number;
  horizon: number;
  bossDps: number;
  staticSpeed: number;
  swallowsPlanets: boolean;
} {
  return {
    /** Pull radius, px. */
    reach: 200 + 100 * level,
    /** Pull at the horizon, px/step per step; fades to 0 at reach. */
    pull: 0.12 + 0.06 * level,
    /** Anything whose edge crosses this radius is swallowed. */
    horizon: 45 + 10 * level,
    /** Damage per second to a boss caught in the horizon. */
    bossDps: 15 * level,
    /** Max speed static objects (mines, hazards, planets) are dragged in, px/step. */
    staticSpeed: 0.5 + 0.5 * level,
    swallowsPlanets: level >= 3,
  };
}

export function upgradePrice(def: UpgradeDef, currentLevel: number): number {
  return def.basePrice * (currentLevel + 1);
}

/** Gameplay numbers derived from upgrade levels. */
export interface Modifiers {
  maxHpBonus: number;
  /** Multiply incoming damage by this. */
  damageTaken: number;
  /** Multiply launch power and top speed by this. */
  launchPower: number;
  /** Multiply ramming damage by this. */
  ramDamage: number;
  /** Extra pickup reach, px. */
  pickupReach: number;
  /** HP restored per second. */
  regenPerSec: number;
  /** Multiply coins earned by this. */
  coinMultiplier: number;
  /** Multiply the speed needed to ram by this (lower = easier). */
  ramThreshold: number;
  /** HP restored per kill, on top of the base heal. */
  healPerKill: number;
  /** Extra invulnerability after a hit, ms. */
  extraInvulnMs: number;
}

export function computeModifiers(level: (id: UpgradeId) => number): Modifiers {
  return {
    maxHpBonus: 20 * level('hull'),
    damageTaken: 1 - 0.08 * level('armor'),
    launchPower: 1 + 0.08 * level('thrusters'),
    ramDamage: 1 + 0.2 * level('spikes'),
    pickupReach: 60 * level('magnet'),
    regenPerSec: 0.5 * level('regen'),
    coinMultiplier: 1 + 0.1 * level('lucky'),
    ramThreshold: 1,
    healPerKill: 0,
    extraInvulnMs: 0,
  };
}

/** Stack two sets of modifiers: multipliers multiply, bonuses add. */
export function combineModifiers(a: Modifiers, b: Modifiers): Modifiers {
  return {
    maxHpBonus: a.maxHpBonus + b.maxHpBonus,
    damageTaken: a.damageTaken * b.damageTaken,
    launchPower: a.launchPower * b.launchPower,
    ramDamage: a.ramDamage * b.ramDamage,
    pickupReach: a.pickupReach + b.pickupReach,
    regenPerSec: a.regenPerSec + b.regenPerSec,
    coinMultiplier: a.coinMultiplier * b.coinMultiplier,
    ramThreshold: a.ramThreshold * b.ramThreshold,
    healPerKill: a.healPerKill + b.healPerKill,
    extraInvulnMs: a.extraInvulnMs + b.extraInvulnMs,
  };
}
