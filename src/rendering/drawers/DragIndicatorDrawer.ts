import { PALETTE, type GameConfig } from '../../config/gameConfig';
import type { EventBus } from '../../core/EventBus';
import type { EventMap } from '../../core/events';
import type { IDisposable, Vec2 } from '../../core/types';
import type { Entity } from '../../entities/Entity';
import type { ILayerDrawer, RenderView } from '../IRenderer';

/** Dashed aim line from the player in the launch direction while dragging. */
export class DragIndicatorDrawer implements ILayerDrawer, IDisposable {
  private drag: { from: Vec2; to: Vec2 } | null = null;
  private readonly unsubs: Array<() => void>;

  constructor(
    private readonly player: Entity,
    bus: EventBus<EventMap>,
    private readonly config: GameConfig,
  ) {
    this.unsubs = [
      bus.on('drag:start', ({ from }) => (this.drag = { from, to: from })),
      bus.on('drag:update', (d) => (this.drag = d)),
      bus.on('drag:end', () => (this.drag = null)),
    ];
  }

  draw({ ctx, camera }: RenderView): void {
    if (!this.drag) return;
    const fx = this.config.effects;
    const { from, to } = this.drag;
    // Drag points are screen-space; the player is in world space.
    const p = { x: this.player.body.position.x - camera.x, y: this.player.body.position.y - camera.y };

    ctx.save();
    ctx.globalAlpha = fx.dragOriginAlpha;
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = fx.aimLineWidth;
    ctx.beginPath();
    ctx.arc(from.x, from.y, fx.dragOriginRadius, 0, Math.PI * 2);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.globalAlpha = fx.aimAlpha;
    ctx.setLineDash(fx.aimDash);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + (to.x - from.x), p.y + (to.y - from.y));
    ctx.stroke();
    ctx.restore();
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    this.drag = null;
  }
}
