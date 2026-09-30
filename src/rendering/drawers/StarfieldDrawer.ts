import type { DimensionState } from '../../config/dimensions';
import type { GameConfig } from '../../config/gameConfig';
import type { ILayerDrawer, RenderView } from '../IRenderer';

interface Star {
  /** Normalized 0..1 so stars survive resizes. */
  u: number;
  v: number;
  r: number;
  /** Parallax factor: 0 = fixed to screen, 1 = moves with the world. */
  depth: number;
  phase: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Endless, wrapping parallax starfield with a gentle twinkle. */
export class StarfieldDrawer implements ILayerDrawer {
  private readonly stars: Star[];

  constructor(
    private readonly config: GameConfig,
    private readonly dimension: DimensionState,
    random: () => number = Math.random,
  ) {
    const { starCount, starMaxRadius } = config.effects;
    this.stars = Array.from({ length: starCount }, () => {
      const depth = 0.05 + random() * 0.45;
      return {
        u: random(),
        v: random(),
        r: 0.3 + depth * 2 * starMaxRadius * random(),
        depth,
        phase: random() * Math.PI * 2,
      };
    });
  }

  draw({ ctx, width, height, timeMs, camera }: RenderView): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const theme = this.dimension.theme;
    if (theme.nebula) this.drawNebula(ctx, w, h, camera, theme.nebula);

    const twinkle = (timeMs / 1000) * this.config.effects.twinkleHz * Math.PI * 2;
    const colors = theme.starColors;
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i]!;
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(twinkle + s.phase) + s.depth * 0.4;
      ctx.beginPath();
      ctx.arc(mod(s.u * w - camera.x * s.depth, w), mod(s.v * h - camera.y * s.depth, h), s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Two huge soft clouds drifting with very slow parallax. */
  private drawNebula(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camera: { x: number; y: number },
    stops: readonly string[],
  ): void {
    const span = Math.max(w, h);
    const clouds = [
      { u: 0.3, v: 0.35, size: 0.9, depth: 0.02 },
      { u: 0.75, v: 0.7, size: 0.7, depth: 0.035 },
    ];
    ctx.save();
    for (const c of clouds) {
      const x = mod(c.u * w - camera.x * c.depth, w * 1.5) - w * 0.25;
      const y = mod(c.v * h - camera.y * c.depth, h * 1.5) - h * 0.25;
      const g = ctx.createRadialGradient(x, y, 0, x, y, span * c.size);
      stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
}
