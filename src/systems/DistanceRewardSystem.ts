import type { DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import type { RunStats } from '../core/RunStats';
import type { SaveData } from '../core/SaveData';
import type { ISystem } from './ISystem';

/** Pays coins live for every new light-year reached from home (more in richer dimensions). */
export class DistanceRewardSystem implements ISystem {
  private lyPaid = 0;

  constructor(
    private readonly stats: RunStats,
    private readonly save: SaveData,
    private readonly dimension: DimensionState,
    private readonly config: GameConfig,
  ) {}

  update(): void {
    const { pxPerLy, coinsPerLy } = this.config.economy;
    const ly = Math.floor(this.stats.farthest / pxPerLy);
    if (ly <= this.lyPaid) return;
    const coins = (ly - this.lyPaid) * coinsPerLy * this.dimension.theme.coinMultiplier;
    this.lyPaid = ly;
    this.stats.distanceCoins += this.save.addCoins(coins);
  }

  dispose(): void {}
}
