import type { GameConfig } from '../../config/gameConfig';
import type { GasGiantSystem } from '../../systems/GasGiantSystem';
import type { WorldSystem } from '../../systems/WorldSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** HUD for the gas giant: edge pointer when far, pull warning when near, atmosphere tint and depth gauge inside. */
export class GasGiantDrawer implements ILayerDrawer {
  constructor(
    private readonly world: WorldSystem,
    private readonly system: GasGiantSystem,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, width, height, timeMs, camera }: RenderView): void {
    const giant = this.world.gasGiant;
    if (!giant) return;
    const h = giant.hue;
    const depth = this.system.depth;

    ctx.save();
    if (depth > 0) {
      // Thickening haze the deeper you go.
      ctx.fillStyle = `hsla(${h}, 50%, 30%, ${0.15 + depth * 0.45})`;
      ctx.fillRect(0, 0, width, height);

      const bw = Math.min(260, width - 40);
      const x = (width - bw) / 2;
      const y = height - 120;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x, y, bw, 10);
      ctx.fillStyle = depth > 0.82 ? '#ff4d6d' : `hsl(${h}, 80%, 65%)`;
      ctx.fillRect(x, y, bw * depth, 10);
      ctx.textAlign = 'center';
      ctx.font = `700 14px ${FONT}`;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(timeMs / (depth > 0.82 ? 80 : 200));
      ctx.fillStyle = depth > 0.82 ? '#ff4d6d' : '#ffffff';
      const text = depth > 0.82 ? '⚠ CORE PRESSURE — GET OUT!' : 'INSIDE THE GAS GIANT — launch outward to escape';
      ctx.fillText(text, width / 2, y - 12);
      ctx.font = `500 11px ${FONT}`;
      ctx.fillText(`depth ${Math.round(depth * 100)}%`, width / 2, y + 26);
    } else if (this.system.approach > 0) {
      ctx.textAlign = 'center';
      ctx.font = `700 13px ${FONT}`;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(timeMs / 200);
      ctx.fillStyle = `hsl(${h}, 80%, 70%)`;
      ctx.fillText(`GAS GIANT GRAVITY ${Math.round(this.system.approach * 100)}%`, width / 2, height - 120);
    } else {
      this.pointer(ctx, width, height, giant.body.position.x - camera.x, giant.body.position.y - camera.y, h);
    }
    ctx.restore();
  }

  private pointer(ctx: CanvasRenderingContext2D, width: number, height: number, sx: number, sy: number, h: number): void {
    const r = this.config.gasGiant.radius;
    if (sx > -r && sy > -r && sx < width + r && sy < height + r) return;
    const cx = width / 2;
    const cy = height / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const pad = 70;
    const k = Math.min(Math.abs((cx - pad) / Math.cos(a)), Math.abs((cy - pad) / Math.sin(a)));
    ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
    ctx.fillStyle = `hsl(${h}, 70%, 60%)`;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    const ly = Math.round((Math.hypot(sx - cx, sy - cy) - r) / this.config.economy.pxPerLy);
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`GAS GIANT · ${ly} ly`, -Math.cos(a) * 34, -Math.sin(a) * 22);
  }
}
