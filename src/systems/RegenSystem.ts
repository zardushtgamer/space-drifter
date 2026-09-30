import type { Player } from '../entities/Player';
import type { ISystem } from './ISystem';

/** Nano Repair upgrade: slowly restores the player's HP. */
export class RegenSystem implements ISystem {
  private pending = 0;

  constructor(
    private readonly player: Player,
    private readonly regenPerSec: () => number,
  ) {}

  update(dtMs: number): void {
    const rate = this.regenPerSec();
    if (rate <= 0) return;
    this.pending += (rate * dtMs) / 1000;
    if (this.pending < 1) return;
    const whole = Math.floor(this.pending);
    this.pending -= whole;
    this.player.health.heal(whole);
  }

  dispose(): void {}
}
