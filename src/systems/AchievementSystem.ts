import { ACHIEVEMENTS, achievementKey, type AchievementContext, type AchievementDef } from '../config/achievements';
import { DIMENSION_IDS, type DimensionState } from '../config/dimensions';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { RunLevels } from '../core/RunLevels';
import type { RunStats } from '../core/RunStats';
import type { SaveData } from '../core/SaveData';
import type { ISystem } from './ISystem';

const CHECK_EVERY_MS = 250;

/**
 * Tracks lifetime counters and unlocks achievements (saved, with coin rewards).
 * Checks a few times a second rather than every step.
 */
export class AchievementSystem implements ISystem {
  private sinceCheckMs = 0;
  private gasDepth = 0;
  private readonly flags = new Set<string>();
  /** Run stats already added to lifetime counters. */
  private readonly counted = { kills: 0, gems: 0, swallowed: 0, bosses: 0 };
  private tookDamageThisRound = false;
  private lastHp = Infinity;
  private readonly unsubs: Array<() => void>;

  constructor(
    private readonly save: SaveData,
    private readonly stats: RunStats,
    private readonly levels: RunLevels,
    private readonly dimension: DimensionState,
    private readonly gasDepth01: () => number,
    bus: EventBus<EventMap>,
    private readonly onUnlock: (def: AchievementDef) => void,
    /** Player's current speed in Mach. */
    private readonly playerMach: () => number = () => 0,
  ) {
    this.unsubs = [
      bus.on('player:damaged', ({ hp }) => {
        if (hp < this.lastHp) this.tookDamageThisRound = true;
        this.lastHp = hp;
      }),
      bus.on('round:cleared', ({ round }) => {
        if (round >= 3 && !this.tookDamageThisRound) this.flags.add('untouchable');
        this.tookDamageThisRound = false;
      }),
      bus.on('game:lost', () => {
        if (this.stats.deathCause === 'ton618') this.flags.add('spaghettified');
        this.check();
      }),
    ];
  }

  update(dtMs: number): void {
    this.gasDepth = Math.max(this.gasDepth, this.gasDepth01());
    // Every step, so a brief peak (a boost gate, a slingshot) still counts.
    this.stats.topMach = Math.max(this.stats.topMach, this.playerMach());
    this.sinceCheckMs += dtMs;
    if (this.sinceCheckMs < CHECK_EVERY_MS) return;
    this.sinceCheckMs = 0;
    this.check();
  }

  /** Current progress context, also used by the achievements screen. */
  context(): AchievementContext {
    return {
      stats: this.stats,
      level: this.levels.level,
      coins: this.save.coins,
      ownedCosmetics: this.save.ownedCount,
      lifetime: (key) => this.save.counter(key),
      dimensionsVisited: DIMENSION_IDS.filter((id) => this.save.isUnlocked(`visit:${id}`)).length,
      totalDimensions: DIMENSION_IDS.length,
      gasDepth: this.gasDepth,
      flags: this.flags,
    };
  }

  check(): void {
    this.save.unlock(`visit:${this.dimension.current}`);
    this.syncLifetime('kills', this.stats.kills);
    this.syncLifetime('gems', this.stats.gemsCollected);
    this.syncLifetime('swallowed', this.stats.swallowed);
    this.syncLifetime('bosses', this.stats.bossesDefeated);

    const ctx = this.context();
    for (const def of ACHIEVEMENTS) {
      if (this.save.isUnlocked(achievementKey(def.id))) continue;
      const [cur, goal] = def.progress(ctx);
      if (cur < goal) continue;
      this.save.unlock(achievementKey(def.id));
      this.save.grantCoins(def.reward);
      this.onUnlock(def);
    }
  }

  private syncLifetime(key: 'kills' | 'gems' | 'swallowed' | 'bosses', runValue: number): void {
    const delta = runValue - this.counted[key];
    if (delta <= 0) return;
    this.counted[key] = runValue;
    this.save.addToCounter(key, delta);
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
  }
}
