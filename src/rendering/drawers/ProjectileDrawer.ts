import { PALETTE, type GameConfig } from '../../config/gameConfig';
import type { ProjectileSystem } from '../../systems/ProjectileSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

export class ProjectileDrawer implements ILayerDrawer {
  constructor(
    private readonly projectiles: ProjectileSystem,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, camera }: RenderView): void {
    const r = this.config.projectiles.radius;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.shadowColor = PALETTE.boss;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    for (const b of this.projectiles.bullets) {
      ctx.moveTo(b.x + r, b.y);
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}
