import { infinityStats } from '../../config/upgrades';
import type { EntityRegistry } from '../../entities/EntityRegistry';
import type { Player } from '../../entities/Player';
import type { InfinitySystem } from '../../systems/InfinitySystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

/**
 * Infinity visuals (world space): a faint shimmering boundary around you, and
 * caught enemies wrapped in rings that tighten and brighten as they freeze.
 */
export class InfinityDrawer implements ILayerDrawer {
  constructor(
    private readonly system: InfinitySystem,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
  ) {}

  draw({ ctx, camera, timeMs }: RenderView): void {
    if (!this.system.enabled) return;
    const { range } = infinityStats(this.system.level());
    const p = this.player.body.position;
    const edge = (this.player.body.circleRadius ?? 0) + range;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Field boundary: thin, slowly rippling, with a soft inner glow.
    const glow = ctx.createRadialGradient(p.x, p.y, edge * 0.4, p.x, p.y, edge);
    glow.addColorStop(0, 'rgba(147, 197, 253, 0)');
    glow.addColorStop(1, 'rgba(147, 197, 253, 0.08)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, edge, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(191, 219, 254, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const rr = edge + Math.sin(a * 6 + timeMs / 300) * 2;
      ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    }
    ctx.stroke();

    // Caught enemies: rings closing in as they slow, and an ∞ once nearly stopped.
    for (const e of this.registry.all()) {
      const k = this.system.slowed.get(e.id);
      if (k === undefined) continue;
      const q = e.body.position;
      const r = e.body.circleRadius ?? 10;
      ctx.strokeStyle = `rgba(191, 219, 254, ${0.25 + 0.6 * k})`;
      ctx.lineWidth = 1.5;
      for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, r + 4 + (1 - k) * 14 + ring * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (k > 0.85) {
        ctx.fillStyle = 'rgba(219, 234, 254, 0.9)';
        ctx.font = `700 ${Math.round(r * 0.9)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('∞', q.x, q.y - r - 8);
      }
    }
    ctx.restore();
  }
}
