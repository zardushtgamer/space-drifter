/** Separate areas of space. Each regenerates the field with its own seed, look, enemies and hazards. */

import type { EnemyType } from '../entities/Enemy';

export type DimensionId =
  | 'milkyway'
  | 'andromeda'
  | 'ember'
  | 'frost'
  | 'void'
  | 'spectral'
  | 'crystal'
  | 'caverns'
  | 'toxic'
  | 'solar'
  | 'reef';

export type HazardType = 'lava' | 'frost' | 'repulsor' | 'boost' | 'crystal' | 'acid' | 'current';

export interface DimensionTheme {
  readonly id: DimensionId;
  readonly name: string;
  /** XORed into the world seed so each dimension has its own layout. */
  readonly seedSalt: number;
  readonly planetChanceMul: number;
  readonly blackHoleChanceMul: number;
  /** Planet hue range, degrees. */
  readonly planetHue: readonly [number, number];
  readonly rockFill: string;
  readonly rockStroke: string;
  readonly starColors: readonly string[];
  /** Background nebula color stops (inner to outer), or null for plain space. */
  readonly nebula: readonly string[] | null;
  readonly labelColor: string;
  /** Multiplier on distance coins earned here. */
  readonly coinMultiplier: number;
  /** Enemy type unique to this area, and how often it replaces a normal spawn. */
  readonly special: { readonly type: EnemyType; readonly chance: number } | null;
  /** Obstacle unique to this area, and the chance a chunk has one. */
  readonly hazard: { readonly type: HazardType; readonly chance: number } | null;
  /** Solid rock cave walls fill the field (see gameConfig.caves). */
  readonly caves?: boolean;
  /** Multiplier on the player's launch power and top speed here (default 1). */
  readonly playerSpeedScale?: number;
  /** If set, the area must be bought in the shop for this many coins before it can be visited. */
  readonly price?: number;
}

export const DIMENSIONS: Readonly<Record<DimensionId, DimensionTheme>> = {
  milkyway: {
    id: 'milkyway',
    name: 'Milky Way',
    seedSalt: 0,
    planetChanceMul: 1,
    blackHoleChanceMul: 1,
    planetHue: [0, 360],
    rockFill: '#454b63',
    rockStroke: '#9aa0b8',
    starColors: ['#ffffff'],
    nebula: null,
    labelColor: '#5ee7ff',
    coinMultiplier: 1,
    special: null,
    hazard: null,
  },
  andromeda: {
    id: 'andromeda',
    name: 'Andromeda',
    seedSalt: 0x5a17d0,
    planetChanceMul: 1.8,
    blackHoleChanceMul: 2,
    planetHue: [270, 350],
    rockFill: '#4a2f5c',
    rockStroke: '#d8a4f5',
    starColors: ['#ffd6f5', '#c4b5fd', '#99f6e4'],
    nebula: ['rgba(190, 60, 170, 0.22)', 'rgba(80, 40, 160, 0.14)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#f0abfc',
    coinMultiplier: 2,
    special: null,
    hazard: null,
  },
  ember: {
    id: 'ember',
    name: 'Ember Nebula',
    seedSalt: 0xe3b3e2,
    planetChanceMul: 1,
    blackHoleChanceMul: 1,
    planetHue: [0, 40],
    rockFill: '#4a2218',
    rockStroke: '#ff9a5c',
    starColors: ['#ffd29a', '#ff8a5c', '#fff1d6'],
    nebula: ['rgba(255, 90, 30, 0.22)', 'rgba(160, 30, 20, 0.14)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#fb923c',
    coinMultiplier: 2,
    special: { type: 'dasher', chance: 0.45 },
    hazard: { type: 'lava', chance: 0.5 },
  },
  frost: {
    id: 'frost',
    name: 'Frost Expanse',
    seedSalt: 0xf205f7,
    planetChanceMul: 1.2,
    blackHoleChanceMul: 1,
    planetHue: [180, 220],
    rockFill: '#2a4556',
    rockStroke: '#bfefff',
    starColors: ['#e0f7ff', '#a5f3fc', '#ffffff'],
    nebula: ['rgba(80, 200, 255, 0.18)', 'rgba(40, 90, 160, 0.12)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#7dd3fc',
    coinMultiplier: 2,
    special: { type: 'splitter', chance: 0.4 },
    hazard: { type: 'frost', chance: 0.45 },
  },
  void: {
    id: 'void',
    name: 'The Void',
    seedSalt: 0x7019d1,
    planetChanceMul: 0.5,
    blackHoleChanceMul: 3,
    planetHue: [240, 280],
    rockFill: '#15151f',
    rockStroke: '#6b6b8a',
    starColors: ['#8b8ba8', '#5b5b7a'],
    nebula: ['rgba(60, 20, 90, 0.25)', 'rgba(10, 5, 25, 0.2)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#a78bfa',
    coinMultiplier: 3,
    special: { type: 'sniper', chance: 0.4 },
    hazard: { type: 'repulsor', chance: 0.35 },
  },
  spectral: {
    id: 'spectral',
    name: 'Spectral Veil',
    seedSalt: 0x5bec72,
    planetChanceMul: 1,
    blackHoleChanceMul: 1,
    planetHue: [120, 170],
    rockFill: '#1f3b35',
    rockStroke: '#8ff5d0',
    starColors: ['#d1fae5', '#86efac', '#ffffff'],
    nebula: ['rgba(60, 230, 160, 0.16)', 'rgba(20, 110, 100, 0.12)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#6ee7b7',
    coinMultiplier: 3,
    special: { type: 'phantom', chance: 0.45 },
    hazard: { type: 'boost', chance: 0.45 },
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Hive',
    seedSalt: 0xc2b57a,
    planetChanceMul: 1,
    blackHoleChanceMul: 1,
    planetHue: [290, 340],
    rockFill: '#3a2d4d',
    rockStroke: '#ffd6f5',
    starColors: ['#fbcfe8', '#a5f3fc', '#fde68a'],
    nebula: ['rgba(240, 120, 200, 0.18)', 'rgba(250, 200, 80, 0.1)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#f9a8d4',
    coinMultiplier: 4,
    special: { type: 'swarmer', chance: 0.5 },
    hazard: { type: 'crystal', chance: 0.6 },
  },
  caverns: {
    id: 'caverns',
    name: 'Rock Caverns',
    seedSalt: 0xca7e25,
    planetChanceMul: 0,
    blackHoleChanceMul: 0.5,
    planetHue: [20, 40],
    rockFill: '#c9955f',
    rockStroke: '#fff1d6',
    starColors: ['#fff7e6', '#ffe0a3'],
    nebula: ['rgba(255, 220, 150, 0.55)', 'rgba(255, 170, 90, 0.35)', 'rgba(255, 200, 140, 0.15)'],
    labelColor: '#ffd08a',
    coinMultiplier: 3,
    special: { type: 'swarmer', chance: 0.35 },
    hazard: { type: 'crystal', chance: 0.4 },
    caves: true,
    playerSpeedScale: 0.55,
    price: 800,
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic Bloom',
    seedSalt: 0x70c1c5,
    planetChanceMul: 1.3,
    blackHoleChanceMul: 1,
    planetHue: [80, 130],
    rockFill: '#2b3a14',
    rockStroke: '#bef264',
    starColors: ['#d9f99d', '#a3e635', '#fef9c3'],
    nebula: ['rgba(163, 230, 53, 0.2)', 'rgba(60, 120, 20, 0.14)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#a3e635',
    coinMultiplier: 3,
    special: { type: 'bloater', chance: 0.4 },
    hazard: { type: 'acid', chance: 0.55 },
  },
  solar: {
    id: 'solar',
    name: 'Solar Storm',
    seedSalt: 0x5014a2,
    planetChanceMul: 0.8,
    blackHoleChanceMul: 1,
    planetHue: [35, 60],
    rockFill: '#5c4012',
    rockStroke: '#fde68a',
    starColors: ['#fffbeb', '#fde047', '#fb923c'],
    nebula: ['rgba(253, 224, 71, 0.22)', 'rgba(251, 146, 60, 0.14)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#fde047',
    coinMultiplier: 3,
    special: { type: 'orbiter', chance: 0.45 },
    hazard: { type: 'boost', chance: 0.4 },
    // Solar wind: everything's faster here.
    playerSpeedScale: 1.25,
  },
  reef: {
    id: 'reef',
    name: 'Nebula Reef',
    seedSalt: 0x2eef01,
    planetChanceMul: 1.5,
    blackHoleChanceMul: 0.8,
    planetHue: [160, 200],
    rockFill: '#7a2e3a',
    rockStroke: '#fda4af',
    starColors: ['#ccfbf1', '#fda4af', '#ffffff'],
    nebula: ['rgba(45, 212, 191, 0.2)', 'rgba(251, 113, 133, 0.12)', 'rgba(5, 7, 13, 0)'],
    labelColor: '#2dd4bf',
    coinMultiplier: 4,
    special: { type: 'jelly', chance: 0.5 },
    hazard: { type: 'current', chance: 0.7 },
  },
};

export const DIMENSION_IDS = Object.keys(DIMENSIONS) as DimensionId[];

/** Save-data id for owning a paid dimension. */
export function dimensionPassId(id: DimensionId): string {
  return `dim-${id}`;
}

/** A dimension other than `current` (and within `allowed`), chosen with `random` (0..1). */
export function pickOtherDimension(
  current: DimensionId,
  random: number,
  allowed: readonly DimensionId[] = DIMENSION_IDS,
): DimensionId {
  const others = allowed.filter((id) => id !== current);
  if (others.length === 0) return current === 'milkyway' ? 'andromeda' : 'milkyway';
  return others[Math.min(others.length - 1, Math.floor(random * others.length))]!;
}

/** Current dimension, shared by the world, rendering and HUD. */
export class DimensionState {
  current: DimensionId = 'milkyway';

  get theme(): DimensionTheme {
    return DIMENSIONS[this.current];
  }
}
