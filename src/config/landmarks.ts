/**
 * One unique set-piece per dimension (The Void's is TON 618, handled by
 * Ton618System). Each sits at a fixed spot and is created on first visit.
 */

import { DIMENSIONS, type DimensionId } from './dimensions';

export type LandmarkId =
  | 'sun'
  | 'stargate'
  | 'volcano'
  | 'titan'
  | 'lighthouse'
  | 'spire'
  | 'grotto'
  | 'bloom'
  | 'array'
  | 'palace';

export interface GemRing {
  readonly count: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  /** Coins per gem. */
  readonly coins: number;
}

export interface LandmarkDef {
  readonly id: LandmarkId;
  readonly dimension: DimensionId;
  readonly name: string;
  /** Short hint shown next to the HUD pointer. */
  readonly tagline: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly radius: number;
  /** Solid bodies bounce you; otherwise you fly through. */
  readonly solid: boolean;
  readonly color: string;
  /** Nothing random spawns within this distance of the center. */
  readonly clearRadius: number;
  /** Coin gems scattered around it (collected once per run). */
  readonly gems?: GemRing;
}

export const LANDMARKS: readonly LandmarkDef[] = [
  {
    id: 'sun',
    dimension: 'milkyway',
    name: 'The Sun',
    tagline: 'pulls hard · burns up close',
    position: { x: 0, y: -6000 },
    radius: 320,
    solid: true,
    color: '#ffd166',
    clearRadius: 1700,
  },
  {
    id: 'stargate',
    dimension: 'andromeda',
    name: 'The Stargate',
    tagline: 'fly through: full heal + coins',
    position: { x: 6000, y: 0 },
    radius: 240,
    solid: false,
    color: '#f0abfc',
    clearRadius: 600,
  },
  {
    id: 'volcano',
    dimension: 'ember',
    name: 'Mount Cinder',
    tagline: 'erupting volcano world',
    position: { x: 0, y: 6000 },
    radius: 300,
    solid: true,
    color: '#fb923c',
    clearRadius: 1100,
    gems: { count: 10, minDistance: 500, maxDistance: 800, coins: 20 },
  },
  {
    id: 'titan',
    dimension: 'frost',
    name: 'The Frozen Titan',
    tagline: 'freezes enemies · heals you',
    position: { x: -6000, y: 0 },
    radius: 320,
    solid: true,
    color: '#7dd3fc',
    clearRadius: 1200,
  },
  {
    id: 'lighthouse',
    dimension: 'spectral',
    name: 'The Phantom Lighthouse',
    tagline: 'its light heals you · banishes enemies',
    position: { x: 0, y: -6000 },
    radius: 70,
    solid: true,
    color: '#6ee7b7',
    clearRadius: 700,
  },
  {
    id: 'spire',
    dimension: 'crystal',
    name: 'The Prism Spire',
    tagline: 'dodge the lasers · grab the gems',
    position: { x: 6000, y: 6000 },
    radius: 130,
    solid: true,
    color: '#f9a8d4',
    clearRadius: 1100,
    gems: { count: 16, minDistance: 420, maxDistance: 900, coins: 25 },
  },
  {
    id: 'grotto',
    dimension: 'caverns',
    name: 'The Treasure Grotto',
    tagline: 'a cavern full of gems',
    position: { x: 4000, y: 0 },
    radius: 90,
    solid: true,
    color: '#ffd08a',
    clearRadius: 900,
    gems: { count: 24, minDistance: 250, maxDistance: 780, coins: 20 },
  },
  {
    id: 'bloom',
    dimension: 'toxic',
    name: 'The Great Bloom',
    tagline: 'fly in while it’s open · thorns when closed',
    position: { x: 0, y: 6000 },
    radius: 190,
    solid: false,
    color: '#a3e635',
    clearRadius: 800,
  },
  {
    id: 'array',
    dimension: 'solar',
    name: 'The Solar Array',
    tagline: 'stay close to charge · overdrive + coins',
    position: { x: -6000, y: 0 },
    radius: 90,
    solid: true,
    color: '#fde047',
    clearRadius: 1000,
  },
  {
    id: 'palace',
    dimension: 'reef',
    name: 'The Coral Palace',
    tagline: 'safe from enemies · claim the pearl',
    position: { x: 6000, y: 0 },
    radius: 60,
    solid: true,
    color: '#2dd4bf',
    clearRadius: 900,
  },
];

/**
 * Where a dimension's gas giant sits: `distance` from the origin, in a
 * direction that differs per dimension (derived from its layout salt).
 */
export function gasGiantPosition(dimension: DimensionId, distance: number): { x: number; y: number } {
  const a = ((DIMENSIONS[dimension].seedSalt % 360) * Math.PI) / 180;
  return { x: Math.cos(a) * distance, y: Math.sin(a) * distance };
}

export function landmarkFor(dimension: DimensionId): LandmarkDef | null {
  return LANDMARKS.find((l) => l.dimension === dimension) ?? null;
}

/** Behaviour tuning for each landmark. */
export const LANDMARK_TUNING = {
  sun: { pullScale: 5, pullStrength: 0.3, burnScale: 1.5, burnDamage: 7 },
  stargate: { coreRadius: 110, cooldownMs: 45_000, coins: 150 },
  volcano: { eruptEveryMs: 3500, fireballs: 20, fireballSpeed: 1.1, burnScale: 1.35, burnDamage: 6 },
  titan: { auraScale: 3.5, enemyDrag: 0.9, healEveryMs: 400, heal: 2 },
  lighthouse: { beams: 2, length: 1600, width: 46, turnRadPerSec: 0.35, healEveryMs: 150, heal: 1 },
  spire: { beams: 3, length: 1000, width: 22, turnRadPerSec: 0.5, damage: 12 },
  grotto: {},
  bloom: { closedMs: 8000, openMs: 6000, coreRadius: 70, coins: 120, thornDamage: 10 },
  array: { panelOrbit: 300, panels: 6, chargeRadius: 900, chargeMs: 12_000, coins: 100, overdriveMs: 10_000, overdrive: 1.5 },
  palace: { safeRadius: 700, enemyPush: 1.2, pearlRadius: 140, pearlCoins: 200, pearlRespawnMs: 60_000 },
  gem: { radius: 14, pickupPadding: 8 },
} as const;
