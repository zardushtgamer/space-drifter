import type { EnemyType } from '../entities/Enemy';

/** Body color per enemy type (enemy art, radar, kill effects). */
export const ENEMY_COLORS: Readonly<Record<EnemyType, string>> = {
  chaser: '#ffb020',
  brute: '#c084fc',
  dasher: '#ff5a1f',
  splitter: '#7dd3fc',
  sniper: '#a78bfa',
  phantom: '#6ee7b7',
  swarmer: '#f9a8d4',
  bloater: '#84cc16',
  orbiter: '#fde047',
  jelly: '#fda4af',
};

export const BOSS_COLOR = '#ff4d6d';
