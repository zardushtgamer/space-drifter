import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig';
import { bossLevel, isBossRound, waveSize } from '../src/core/rounds';

const r = gameConfig.rounds;

describe('rounds', () => {
  it('makes every 10th round a boss-only round', () => {
    expect(isBossRound(9, r)).toBe(false);
    expect(isBossRound(10, r)).toBe(true);
    expect(isBossRound(11, r)).toBe(false);
    expect(isBossRound(20, r)).toBe(true);
    expect(waveSize(10, r)).toBe(0);
  });

  it('levels bosses up every boss round', () => {
    expect(bossLevel(10, r)).toBe(1);
    expect(bossLevel(20, r)).toBe(2);
    expect(bossLevel(30, r)).toBe(3);
  });

  it('grows waves each round', () => {
    expect(waveSize(2, r)).toBeGreaterThan(waveSize(1, r));
    expect(waveSize(1, r)).toBeGreaterThan(0);
  });
});
