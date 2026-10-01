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
  | 'radar'
  | 'infinity'
  | 'supernova';

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly name: string;
  readonly icon: string;
  /** What one level does, for the shop card. */
  readonly perLevel: string;
  readonly maxLevel: number;
  /** Cost of level n (1-based) is basePrice * n. */
  readonly basePrice: number;
  /** Upgrades you must own (level ≥ 1) before buying this one. */
  readonly requires?: readonly UpgradeId[];
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
  {
    id: 'infinity',
    name: 'Infinity',
    icon: '♾️',
    perLevel: 'enemies and bullets slow the closer they get, stopping dead before they touch you (I to toggle). Wider field',
    maxLevel: 3,
    basePrice: 700,
  },
  {
    id: 'supernova',
    name: 'Supernova',
    icon: '💥',
    perLevel: 'with Infinity + Singularity both on, press N to collapse them into a blast. More damage, knockback, reach and spectacle',
    maxLevel: 5,
    basePrice: 900,
    requires: ['infinity', 'singularity'],
  },
];

/** Supernova strength at a given upgrade level (0 = not owned). */
export function supernovaStats(level: number): {
  radius: number;
  damage: number;
  knockback: number;
  cooldownMs: number;
  chargeMs: number;
  /** Visual tier: more rings, rays, particles and a harder flash at higher levels. */
  vfx: number;
} {
  return {
    /** Blast radius, px. */
    radius: 320 + 90 * level,
    /** Damage at the center (falls to half at the edge). */
    damage: 30 + 30 * level,
    /** Outward speed given to everything caught, px/step (also falls off). */
    knockback: 9 + 4 * level,
    cooldownMs: Math.max(6000, 13_000 - 1300 * level),
    chargeMs: 650,
    vfx: level,
  };
}

/** Infinity field at a given upgrade level (0 = not owned). */
export function infinityStats(level: number): { range: number; maxApproach: number } {
  return {
    /** Gap (hitbox edge to hitbox edge, px) where slowing starts. */
    range: 60 + 50 * level,
    /** Max approach speed at the edge of the field, px/step; falls linearly to 0 at contact. */
    maxApproach: 6,
  };
}

/**
 * Infinity stops things with their hitbox this far (px) from yours: a hair's breadth,
 * with enough margin that crowd shoving can't push them into contact.
 */
export const INFINITY_STOP_GAP = 8;
/** Slowest creep inside the field (fraction of maxApproach), so things actually arrive. */
const INFINITY_MIN_CREEP = 0.12;

/**
 * Max speed (px/step) something may close in at, given the gap between hitboxes.
 * Full speed outside the field, slowing linearly toward a gentle creep, and never
 * more than the remaining gap, so it ends exactly at INFINITY_STOP_GAP: just
 * barely touching, with zero speed.
 */
export function infinityApproachCap(gap: number, range: number, maxApproach: number): number {
  if (gap >= range) return Infinity;
  const curve = maxApproach * Math.max(INFINITY_MIN_CREEP, gap / range);
  return Math.max(0, Math.min(curve, gap - INFINITY_STOP_GAP));
}

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
