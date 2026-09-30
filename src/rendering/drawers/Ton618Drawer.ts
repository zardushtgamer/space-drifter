import type { GameConfig } from '../../config/gameConfig';
import type { Ton618System } from '../../systems/Ton618System';
import type { WorldSystem } from '../../systems/WorldSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** In The Void: a pointer to TON 618 when far away, and a flashing warning inside its pull. */
export class Ton618Drawer implements ILayerDrawer {
  constructor(
    private readonly world: WorldSystem,
    private readonly ton: Ton618System,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, width, height, timeMs, camera }: RenderView): void {
    const t = this.world.ton618;
    if (!t) return;
    const sx = t.body.position.x - camera.x;
    const sy = t.body.position.y - camera.y;
    ctx.save();
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.ton.pull > 0) {
      const pull = this.ton.pull;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(timeMs / (pull > 0.6 ? 70 : 160));
      ctx.fillStyle = pull > 0.6 ? '#ff4d6d' : '#ffb020';
      ctx.font = `700 ${pull > 0.6 ? 18 : 14}px ${FONT}`;
      ctx.fillText(`⚠ TON 618 GRAVITY ${Math.round(pull * 100)}% — ESCAPE!`, width / 2, height - 100);
    } else if (sx < 0 || sy < 0 || sx > width || sy > height) {
      // Edge arrow with distance.
      const cx = width / 2;
      const cy = height / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const pad = 44;
      const k = Math.min(Math.abs((cx - pad) / Math.cos(a)), Math.abs((cy - pad) / Math.sin(a)));
      const x = cx + Math.cos(a) * k;
      const y = cy + Math.sin(a) * k;
      ctx.translate(x, y);
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -8);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const ly = Math.round(Math.hypot(sx - cx, sy - cy) / this.config.economy.pxPerLy);
      ctx.fillStyle = '#ffd08a';
      ctx.fillText(`TON 618 · ${ly} ly`, -Math.cos(a) * 26, -Math.sin(a) * 18);
    }
    ctx.restore();
  }
}
