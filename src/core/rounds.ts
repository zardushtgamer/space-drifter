import type { GameConfig } from '../config/gameConfig';

type Rounds = GameConfig['rounds'];

export function isBossRound(round: number, r: Rounds): boolean {
  return round % r.bossEvery === 0;
}

/** Boss rounds 10, 20, 30... fight boss levels 1, 2, 3... */
export function bossLevel(round: number, r: Rounds): number {
  return Math.max(1, Math.floor(round / r.bossEvery));
}

export function waveSize(round: number, r: Rounds): number {
  return isBossRound(round, r) ? 0 : r.baseEnemies + round * r.enemiesPerRound;
}

export function maxAlive(round: number, r: Rounds): number {
  return Math.min(r.maxAliveCap, r.baseMaxAlive + round * r.maxAlivePerRound);
}

export function spawnIntervalMs(round: number, r: Rounds): number {
  return Math.max(r.minSpawnIntervalMs, r.baseSpawnIntervalMs - round * r.spawnIntervalPerRoundMs);
}

export function bruteChance(round: number, r: Rounds): number {
  return Math.min(r.bruteMaxChance, round * r.bruteChancePerRound);
}
