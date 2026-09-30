/** Shop catalog. `'rainbow'` colors cycle hue over time. */

import type { DimensionId } from './dimensions';

export type CosmeticColor = string | 'rainbow';

/** Fields every shop item has. `theme` tags items inspired by a dimension. */
export interface ShopItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly theme?: DimensionId;
}

export interface BallSkin extends ShopItem {
  readonly fill: CosmeticColor;
  /** Optional outline ring. */
  readonly ring?: string;
  /** Optional surface pattern, drawn in `color` over the fill. */
  readonly pattern?: { readonly kind: BallPattern; readonly color: string };
  /** Replaces the plain sphere look (the physics shape stays a circle). */
  readonly shape?: 'tesseract';
}

export type BallPattern = 'stripes' | 'spots' | 'swirl' | 'core' | 'eight';

/** 'afterimage' draws ghost copies of the ball itself, behind and ahead of you. */
export type TrailStyle = 'ribbon' | 'sparks' | 'afterimage' | 'cubes' | 'none';

export interface TrailSkin extends ShopItem {
  readonly style: TrailStyle;
  /** Gradient from tail to head; 'ball' matches the equipped ball. */
  readonly colors: readonly CosmeticColor[] | 'ball';
}

export const BALLS: readonly BallSkin[] = [
  { id: 'cyan', name: 'Drifter', price: 0, fill: '#5ee7ff' },
  { id: 'ember', name: 'Ember', price: 60, fill: '#ff7a3d' },
  { id: 'toxic', name: 'Toxic', price: 90, fill: '#a3ff47' },
  { id: 'orchid', name: 'Orchid', price: 120, fill: '#e879f9' },
  { id: 'gold', name: 'Gold', price: 250, fill: '#ffd166', ring: '#fff3c4' },
  { id: 'void', name: 'Void', price: 350, fill: '#0b0d18', ring: '#8b5cf6' },
  { id: 'prism', name: 'Prism', price: 600, fill: 'rainbow' },
  // Dimension collection
  { id: 'nebula', name: 'Nebula', price: 300, fill: '#c026d3', ring: '#f0abfc', theme: 'andromeda' },
  { id: 'magma', name: 'Magma', price: 320, fill: '#7f1d1d', ring: '#fb923c', theme: 'ember' },
  { id: 'glacier', name: 'Glacier', price: 320, fill: '#e0f7ff', ring: '#38bdf8', theme: 'frost' },
  { id: 'abyss', name: 'Abyss', price: 450, fill: '#05050a', ring: '#4c1d95', theme: 'void' },
  { id: 'wisp', name: 'Wisp', price: 450, fill: '#bbf7d0', ring: '#34d399', theme: 'spectral' },
  { id: 'geode', name: 'Geode', price: 550, fill: '#f9a8d4', ring: '#fde68a', theme: 'crystal' },
  { id: 'boulder', name: 'Boulder', price: 400, fill: '#6b5344', ring: '#d6a77a', theme: 'caverns' },
  { id: 'toxicorb', name: 'Toxic Orb', price: 420, fill: '#4d7c0f', ring: '#d9f99d', pattern: { kind: 'core', color: '#ecfccb' }, theme: 'toxic' },
  { id: 'solarflare', name: 'Solar Flare', price: 420, fill: '#f59e0b', ring: '#fffbeb', pattern: { kind: 'core', color: '#fff7c2' }, theme: 'solar' },
  { id: 'pearl', name: 'Reef Pearl', price: 520, fill: '#fce7f3', ring: '#2dd4bf', pattern: { kind: 'swirl', color: '#99f6e4' }, theme: 'reef' },
  // Pattern collection
  { id: 'beachball', name: 'Beach Ball', price: 150, fill: '#ef4444', pattern: { kind: 'stripes', color: '#ffffff' } },
  { id: 'eightball', name: 'Eight Ball', price: 200, fill: '#111111', ring: '#444444', pattern: { kind: 'eight', color: '#ffffff' } },
  { id: 'earth', name: 'Earth', price: 250, fill: '#2563eb', pattern: { kind: 'spots', color: '#22c55e' } },
  { id: 'jupiter', name: 'Jupiter', price: 250, fill: '#d97706', pattern: { kind: 'stripes', color: '#fde68a' } },
  { id: 'moon', name: 'Moon', price: 200, fill: '#9ca3af', pattern: { kind: 'spots', color: '#6b7280' } },
  { id: 'candy', name: 'Candy Swirl', price: 300, fill: '#f472b6', pattern: { kind: 'swirl', color: '#ffffff' } },
  { id: 'tesseract', name: 'Tesseract', price: 900, fill: '#0e1a2b', ring: '#5ee7ff', shape: 'tesseract' },
  { id: 'plasma', name: 'Plasma Core', price: 500, fill: '#5b21b6', ring: '#c4b5fd', pattern: { kind: 'core', color: '#f0abfc' } },
];

export const TRAILS: readonly TrailSkin[] = [
  { id: 'classic', name: 'Classic', price: 0, style: 'ribbon', colors: 'ball' },
  { id: 'none', name: 'None', price: 0, style: 'none', colors: 'ball' },
  { id: 'fire', name: 'Fire', price: 80, style: 'ribbon', colors: ['#ff2d2d', '#ff8a00', '#ffe066'] },
  { id: 'ice', name: 'Frost', price: 80, style: 'ribbon', colors: ['#3b82f6', '#a5f3fc', '#ffffff'] },
  { id: 'sparks', name: 'Sparks', price: 180, style: 'sparks', colors: ['#ffd166', '#ffffff'] },
  { id: 'rainbow', name: 'Rainbow', price: 400, style: 'ribbon', colors: ['rainbow'] },
  { id: 'afterimage', name: 'Afterimage', price: 700, style: 'afterimage', colors: ['#60a5fa'] },
  { id: 'cubetrail', name: 'Hypercube Wake', price: 600, style: 'cubes', colors: ['#e879f9', '#5ee7ff'] },
  // Dimension collection
  { id: 'stardust', name: 'Stardust', price: 250, style: 'ribbon', colors: ['#7c3aed', '#e879f9', '#ffd6f5'], theme: 'andromeda' },
  { id: 'cinders', name: 'Cinders', price: 260, style: 'sparks', colors: ['#991b1b', '#f97316', '#fde047'], theme: 'ember' },
  { id: 'blizzard', name: 'Blizzard', price: 260, style: 'sparks', colors: ['#7dd3fc', '#e0f7ff', '#ffffff'], theme: 'frost' },
  { id: 'voidtrail', name: 'Event Horizon', price: 380, style: 'ribbon', colors: ['#000000', '#4c1d95', '#a78bfa'], theme: 'void' },
  { id: 'ecto', name: 'Ectoplasm', price: 380, style: 'ribbon', colors: ['#064e3b', '#34d399', '#d1fae5'], theme: 'spectral' },
  { id: 'shards', name: 'Shards', price: 480, style: 'sparks', colors: ['#f9a8d4', '#a5f3fc', '#fde68a'], theme: 'crystal' },
  { id: 'toxicdrip', name: 'Toxic Drip', price: 380, style: 'ribbon', colors: ['#1a2e05', '#65a30d', '#d9f99d'], theme: 'toxic' },
  { id: 'solarwind', name: 'Solar Wind', price: 380, style: 'sparks', colors: ['#f97316', '#fde047', '#ffffff'], theme: 'solar' },
  { id: 'bubbles', name: 'Bubbles', price: 450, style: 'sparks', colors: ['#2dd4bf', '#ccfbf1', '#fda4af'], theme: 'reef' },
  { id: 'dust', name: 'Rockdust', price: 350, style: 'sparks', colors: ['#4a3f38', '#a8876b', '#e7cfb4'], theme: 'caverns' },
];

/** Animated decoration around the ball, like a profile-picture frame. */
export type EffectSkin = ShopItem;

export const EFFECTS: readonly EffectSkin[] = [
  // Ids share one "owned" list with balls and trails, so they must be unique across all three.
  { id: 'plain', name: 'None', price: 0 },
  { id: 'halo', name: 'Halo', price: 100 },
  { id: 'orbit', name: 'Moons', price: 140 },
  { id: 'flame', name: 'Blue Flame', price: 220 },
  { id: 'storm', name: 'Storm', price: 260 },
  { id: 'blackhole', name: 'Black Hole', price: 400 },
  { id: 'hypercube', name: 'Hypercube', price: 1000 },
  // Dimension collection
  { id: 'galaxy', name: 'Galaxy', price: 450, theme: 'andromeda' },
  { id: 'inferno', name: 'Inferno', price: 450, theme: 'ember' },
  { id: 'frostbite', name: 'Frostbite', price: 450, theme: 'frost' },
  { id: 'tendrils', name: 'Void Tendrils', price: 600, theme: 'void' },
  { id: 'spirits', name: 'Spirits', price: 600, theme: 'spectral' },
  { id: 'crystals', name: 'Crystal Crown', price: 750, theme: 'crystal' },
  { id: 'debris', name: 'Rock Ring', price: 650, theme: 'caverns' },
  { id: 'spores', name: 'Spore Cloud', price: 650, theme: 'toxic' },
  { id: 'corona', name: 'Corona', price: 650, theme: 'solar' },
  { id: 'fishschool', name: 'Fish School', price: 800, theme: 'reef' },
];

/** A set of cosmetics sold together at a discount on whatever you don't own yet. */
export interface Bundle {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly items: ReadonlyArray<{ readonly slot: 'ball' | 'trail' | 'effect'; readonly id: string }>;
  /** Fraction of the unowned items' total price you pay. */
  readonly priceFactor: number;
}

export const BUNDLES: readonly Bundle[] = [
  {
    id: 'bundle-4d',
    name: '4D Tesseract Bundle',
    icon: '🧊',
    description: 'A ball, trail and effect folded in from the fourth dimension',
    items: [
      { slot: 'ball', id: 'tesseract' },
      { slot: 'trail', id: 'cubetrail' },
      { slot: 'effect', id: 'hypercube' },
    ],
    priceFactor: 0.7,
  },
];

export function itemPrice(slot: 'ball' | 'trail' | 'effect', id: string): number {
  const list: readonly ShopItem[] = slot === 'ball' ? BALLS : slot === 'trail' ? TRAILS : EFFECTS;
  return list.find((i) => i.id === id)?.price ?? 0;
}

/** Bundle price given what you already own (you only pay for the rest). */
export function bundlePrice(b: Bundle, owns: (id: string) => boolean): number {
  const rest = b.items.filter((i) => !owns(i.id)).reduce((sum, i) => sum + itemPrice(i.slot, i.id), 0);
  return Math.round(rest * b.priceFactor);
}

export const DEFAULT_BALL = 'cyan';
export const DEFAULT_TRAIL = 'classic';
export const DEFAULT_EFFECT = 'plain';

export function findBall(id: string): BallSkin {
  return BALLS.find((b) => b.id === id) ?? BALLS[0]!;
}

export function findTrail(id: string): TrailSkin {
  return TRAILS.find((t) => t.id === id) ?? TRAILS[0]!;
}

/** Resolves a cosmetic color to CSS; `offset` shifts rainbow hue (e.g. along a trail). */
export function resolveColor(c: CosmeticColor, timeMs: number, offset = 0): string {
  return c === 'rainbow' ? `hsl(${(timeMs / 8 + offset) % 360}, 95%, 65%)` : c;
}
