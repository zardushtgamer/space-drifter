import type { GameConfig } from '../../config/gameConfig';
import type { ILayerDrawer, RenderView } from '../IRenderer';

interface Star {
  /** Normalized 0..1 so stars survive resizes. */
  u: number;
  v: number;
  r: number;
}

/** Static starfield for now; twinkle arrives in Phase 5. */
export class StarfieldDrawer implements ILayerDrawer {
  private readonly stars: Star[];

  constructor(config: GameConfig, random: () => number = Math.random) {
    const { starCount, starMaxRadius } = config.effects;
    this.stars = Array.from({ length: starCount }, () => ({
      u: random(),
      v: random(),
      r: random() * starMaxRadius,
    }));
  }

  draw({ ctx, width, height }: RenderView): void {
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.u * width, s.v * height, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
