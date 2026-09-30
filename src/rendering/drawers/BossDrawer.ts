import { PALETTE, type GameConfig } from '../../config/gameConfig';
import { Boss } from '../../entities/Boss';
import type { Entity } from '../../entities/Entity';
import type { IDrawer, RenderView } from '../IRenderer';
import { isFlashing } from './flash';

/** Pulsing spiked core; more spikes per level. */
export class BossDrawer implements IDrawer {
  constructor(private readonly config: GameConfig) {}

  draw({ ctx, timeMs }: RenderView, entity: Entity): void {
    if (!(entity instanceof Boss)) return;
    const { position: p, circleRadius: r = 0 } = entity.body;
    const spikes = 8 + entity.level * 2;
    const pulse = 1 + 0.05 * Math.sin(timeMs / 150);
    const flash = isFlashing(entity, timeMs, this.config);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(timeMs / 1200);
    ctx.shadowColor = PALETTE.boss;
    ctx.shadowBlur = this.config.effects.glowBlur * 1.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = (i % 2 === 0 ? r * 1.15 : r * 0.85) * pulse;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.boss;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.space;
    ctx.fill();
    ctx.fillStyle = PALETTE.bullet;
    ctx.font = `700 ${Math.round(r * 0.5)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.rotate(-timeMs / 1200);
    ctx.fillText(String(entity.level), 0, 1);
    ctx.restore();
  }
}
