import { BOSS_COLOR } from '../../config/enemyColors';
import type { EventBus } from '../../core/EventBus';
import type { EventMap } from '../../core/events';
import type { SaveData } from '../../core/SaveData';
import type { IDisposable } from '../../core/types';
import type { ILayerDrawer, RenderView } from '../IRenderer';
import { KillFxEngine } from '../killfx';

/** Plays the equipped kill effect wherever an enemy (or boss) is destroyed. World-space layer. */
export class KillFxDrawer implements ILayerDrawer, IDisposable {
  private readonly engine = new KillFxEngine();
  private lastMs: number | null = null;
  private readonly unsubs: Array<() => void>;

  constructor(
    bus: EventBus<EventMap>,
    private readonly save: SaveData,
  ) {
    this.unsubs = [
      bus.on('enemy:killed', ({ x, y, color, radius }) => this.engine.spawn(this.save.kill, x, y, color, radius)),
      bus.on('boss:killed', ({ x, y }) => {
        // Bosses get a much bigger version, twice over.
        this.engine.spawn(this.save.kill, x, y, BOSS_COLOR, 46);
        this.engine.spawn(this.save.kill, x, y, '#ffffff', 70);
      }),
    ];
  }

  draw({ ctx, camera, timeMs }: RenderView): void {
    const dt = this.lastMs === null ? 0 : Math.min(100, timeMs - this.lastMs);
    this.lastMs = timeMs;
    this.engine.update(dt);
    if (this.engine.count === 0) return;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    this.engine.draw(ctx);
    ctx.restore();
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
  }
}
