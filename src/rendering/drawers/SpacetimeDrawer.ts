import type { GameConfig } from '../../config/gameConfig';
import type { GravitySystem } from '../../systems/GravitySystem';
import type { Wormhole } from '../../systems/Wormhole';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Screen effects for black holes: time-dilation vignette and the hyperspace jump. */
export class SpacetimeDrawer implements ILayerDrawer {
  constructor(
    private readonly gravity: GravitySystem,
    private readonly wormhole: Wormhole,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, width, height, timeMs }: RenderView): void {
    this.drawDilation(ctx, width, height, timeMs);
    this.drawWarp(ctx, width, height, timeMs);
  }

  private drawDilation(ctx: CanvasRenderingContext2D, w: number, h: number, timeMs: number): void {
    const d = this.gravity.dilation;
    if (d <= 0) return;
    ctx.save();
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, 'rgba(20, 0, 40, 0)');
    g.addColorStop(1, `rgba(20, 0, 40, ${0.75 * d})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // "1 hour here is 7 years on Earth": show how slow time is running.
    const scale = 1 - d * (1 - this.config.blackHoles.minTimeScale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `700 14px ${FONT}`;
    ctx.globalAlpha = Math.min(1, d * 2) * (0.7 + 0.3 * Math.sin(timeMs / 200));
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText(`TIME DILATION ×${scale.toFixed(2)}`, w / 2, h - 70);
    ctx.restore();
  }

  private drawWarp(ctx: CanvasRenderingContext2D, w: number, h: number, timeMs: number): void {
    const t = (timeMs - this.wormhole.lastWarpAtMs) / this.config.blackHoles.warpFxMs;
    if (t < 0 || t >= 1) return;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;
    const fade = 1 - t;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // Hyperspace streaks radiating from the center, shrinking as we arrive.
    for (let i = 0; i < 90; i++) {
      const a = i * 2.399963;
      const seed = (i * 0.618) % 1;
      const r0 = maxR * ((seed + t * 1.8) % 1) * 0.9;
      const len = maxR * 0.35 * fade * (0.4 + seed);
      ctx.strokeStyle = i % 3 === 0 ? `rgba(196, 181, 253, ${fade})` : `rgba(125, 211, 252, ${fade})`;
      ctx.lineWidth = 1 + 2 * seed;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();

    // Blinding flash on exit, fading out.
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.pow(fade, 3) * 0.9})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
