/** Achievements: unlocked once (saved), each paying a coin reward. */

import type { RunStats } from '../core/RunStats';

/** Everything an achievement check can look at. */
export interface AchievementContext {
  readonly stats: RunStats;
  readonly level: number;
  readonly coins: number;
  readonly ownedCosmetics: number;
  /** Lifetime counters (kills, gems, swallowed, bosses). */
  readonly lifetime: (key: string) => number;
  readonly dimensionsVisited: number;
  readonly totalDimensions: number;
  /** Deepest gas giant depth reached this run, 0..1. */
  readonly gasDepth: number;
  /** One-off events: 'spaghettified', 'untouchable'. */
  readonly flags: ReadonlySet<string>;
}

export interface AchievementDef {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly reward: number;
  /** [current, goal] for a progress bar. Unlocks when current >= goal. */
  readonly progress: (c: AchievementContext) => readonly [number, number];
}

const flag = (name: string) => (c: AchievementContext) => [c.flags.has(name) ? 1 : 0, 1] as const;

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', icon: '🩸', description: 'Destroy your first enemy', reward: 25, progress: (c) => [c.lifetime('kills'), 1] },
  { id: 'exterminator', name: 'Exterminator', icon: '💀', description: '100 kills in a single run', reward: 150, progress: (c) => [c.stats.kills, 100] },
  { id: 'genocide', name: 'Galactic Menace', icon: '☠️', description: '1,000 kills across all runs', reward: 500, progress: (c) => [c.lifetime('kills'), 1000] },
  { id: 'boss_slayer', name: 'Boss Slayer', icon: '👑', description: 'Defeat a boss', reward: 150, progress: (c) => [c.lifetime('bosses'), 1] },
  { id: 'titan_toppler', name: 'Titan Toppler', icon: '⚔️', description: 'Defeat a level 3 boss', reward: 500, progress: (c) => [c.stats.highestBossKilled, 3] },
  { id: 'survivor', name: 'Survivor', icon: '🛡️', description: 'Reach round 10', reward: 150, progress: (c) => [c.stats.round, 10] },
  { id: 'veteran', name: 'Veteran', icon: '🎖️', description: 'Reach round 25', reward: 500, progress: (c) => [c.stats.round, 25] },
  { id: 'level5', name: 'Rising Star', icon: '⭐', description: 'Reach level 5 in a run', reward: 100, progress: (c) => [c.level, 5] },
  { id: 'level15', name: 'Ascended', icon: '🌟', description: 'Reach level 15 in a run', reward: 400, progress: (c) => [c.level, 15] },
  { id: 'wanderer', name: 'Wanderer', icon: '🧭', description: 'Get 100 ly from home', reward: 100, progress: (c) => [Math.floor(c.stats.farthest / 100), 100] },
  { id: 'voyager', name: 'Voyager', icon: '🚀', description: 'Get 500 ly from home', reward: 300, progress: (c) => [Math.floor(c.stats.farthest / 100), 500] },
  { id: 'wormhole_rider', name: 'Wormhole Rider', icon: '🌀', description: 'Jump through a wormhole', reward: 150, progress: (c) => [c.stats.wormholeJumps, 1] },
  { id: 'hopper', name: 'Dimension Hopper', icon: '🌌', description: 'Visit 5 different dimensions', reward: 250, progress: (c) => [c.dimensionsVisited, 5] },
  { id: 'tourist', name: 'Multiverse Tourist', icon: '🗺️', description: 'Visit every dimension', reward: 750, progress: (c) => [c.dimensionsVisited, c.totalDimensions] },
  { id: 'spaghettified', name: 'Spaghettified', icon: '🍝', description: 'Get eaten by TON 618', reward: 200, progress: flag('spaghettified') },
  { id: 'stargazer', name: 'Gem Hunter', icon: '💎', description: 'Collect 50 gems across all runs', reward: 250, progress: (c) => [c.lifetime('gems'), 50] },
  { id: 'hoarder', name: 'Hoarder', icon: '🪙', description: 'Hold 5,000 coins at once', reward: 300, progress: (c) => [c.coins, 5000] },
  { id: 'collector', name: 'Collector', icon: '🎨', description: 'Own 25 cosmetics', reward: 400, progress: (c) => [c.ownedCosmetics, 25] },
  { id: 'event_horizon', name: 'Event Horizon', icon: '🕳️', description: 'Swallow 50 enemies as a Singularity', reward: 400, progress: (c) => [c.lifetime('swallowed'), 50] },
  { id: 'deep_diver', name: 'Deep Diver', icon: '🪐', description: 'Reach 90% depth inside a gas giant', reward: 300, progress: (c) => [Math.round(c.gasDepth * 100), 90] },
  { id: 'nectar', name: 'Sweet Nectar', icon: '🌸', description: 'Drink from the Great Bloom', reward: 200, progress: (c) => [c.stats.bloomHarvests, 1] },
  {
    id: 'mach3',
    name: 'The sin of the insignificant is ignorance of strength.',
    icon: '💨',
    description: 'Reach Mach 3',
    reward: 1000,
    progress: (c) => [Math.floor(c.stats.topMach * 10) / 10, 3],
  },
  { id: 'untouchable', name: 'Untouchable', icon: '✨', description: 'Clear a round from round 3 on without taking damage', reward: 250, progress: flag('untouchable') },
];

export function achievementKey(id: string): string {
  return `ach:${id}`;
}
