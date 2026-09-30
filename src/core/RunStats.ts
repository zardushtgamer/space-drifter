/** Mutable per-run scoreboard, shared by systems and the HUD. */
export class RunStats {
  score = 0;
  kills = 0;
  bossesDefeated = 0;
  elapsedMs = 0;
  /** Distance of the farthest point reached from the origin, px. */
  farthest = 0;
  /** Pilot level reached this run. */
  level = 1;
  /** Current round, 1-based. */
  round = 1;
  /** Enemies still to defeat this round (spawned or not); 0 on boss rounds. */
  enemiesLeft = 0;
  /** Coins already paid out this run for distance. */
  distanceCoins = 0;
  /** Coins already paid out this run from gems and landmarks. */
  bonusCoins = 0;
  banner: { text: string; untilMs: number } | null = null;
  // Achievement tracking.
  gemsCollected = 0;
  swallowed = 0;
  wormholeJumps = 0;
  bloomHarvests = 0;
  highestBossKilled = 0;
  /** Fastest the player has flown this run, in Mach. */
  topMach = 0;
  deathCause: 'ton618' | null = null;
}
