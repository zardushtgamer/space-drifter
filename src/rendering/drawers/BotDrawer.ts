import type { GameConfig } from '../../config/gameConfig';
import { Bot } from '../../entities/Bot';
import type { Entity } from '../../entities/Entity';
import { drawBall } from '../effects';
import type { IDrawer, RenderView } from '../IRenderer';
import { drawHealthBar, isFlashing } from './flash';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** A bot pilot: its trail, its shop ball skin, a name tag and a health bar. */
export class BotDrawer implements IDrawer {
  constructor(private readonly config: GameConfig) {}

  draw({ ctx, timeMs }: RenderView, entity: Entity): void {
    if (!(entity instanceof Bot)) return;
    const { position: p, circleRadius: r = 17 } = entity.body;
    const color = entity.profile.color;

    // Trail.
    const n = entity.trail.length;
    if (n > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      for (let i = 1; i < n; i++) {
        const a = entity.trail[i - 1]!;
        const b = entity.trail[i]!;
        const t = i / (n - 1);
        ctx.globalAlpha = t * 0.45;
        ctx.lineWidth = r * 1.3 * t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBall(ctx, entity.profile.skin, p.x, p.y, r, timeMs, this.config.effects.glowBlur, isFlashing(entity, timeMs, this.config));

    ctx.save();
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeText(entity.profile.name, p.x, p.y - r - 18);
    ctx.fillStyle = color;
    ctx.fillText(entity.profile.name, p.x, p.y - r - 18);
    ctx.restore();
    // Always show the bar for bots (even at full health), so you can size up a fight.
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(p.x - r, p.y - r - 12, r * 2, 4);
    ctx.restore();
    drawHealthBar(ctx, p.x, p.y - r - 12, r * 2, entity.health.hp, entity.health.maxHp + 0.001, color);
  }
}
