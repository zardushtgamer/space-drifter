import type { DimensionState } from '../../config/dimensions';
import type { GameConfig } from '../../config/gameConfig';
import type { Entity } from '../../entities/Entity';
import type { ILayerDrawer, RenderView } from '../IRenderer';

/** In cave dimensions: a blazing warm wash over everything, extra bright around the player. */
export class CaveLightDrawer implements ILayerDrawer {
  constructor(
    private readonly player: Entity,
    private readonly dimension: DimensionState,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, width, height, timeMs, camera }: RenderView): void {
    if (!this.dimension.theme.caves) return;
    const c = this.config.caves;
    const x = this.player.body.position.x - camera.x;
    const y = this.player.body.position.y - camera.y;
    const pulse = 1 + 0.04 * Math.sin(timeMs / 400);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Whole-screen sunlit wash.
    ctx.fillStyle = `rgba(255, 210, 150, ${c.brightness * 0.5})`;
    ctx.fillRect(0, 0, width, height);
    // Hot spot around the player.
    const r = c.lightRadius * pulse;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 245, 220, ${c.brightness})`);
    g.addColorStop(1, 'rgba(255, 245, 220, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
