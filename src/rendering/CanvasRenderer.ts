import { PALETTE, type GameConfig } from '../config/gameConfig';
import type { Camera } from '../core/Camera';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { DrawerRegistry } from './drawers/DrawerRegistry';
import type { ILayerDrawer, IRenderer, RenderView } from './IRenderer';

export interface RenderLayers {
  background: readonly ILayerDrawer[];
  /** Screen-space layers that transform to world space themselves (e.g. bullets). */
  world: readonly ILayerDrawer[];
  foreground: readonly ILayerDrawer[];
}

export class CanvasRenderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly entities: EntityRegistry,
    private readonly drawers: DrawerRegistry,
    private readonly layers: RenderLayers,
    private readonly camera: Camera,
    private readonly config: GameConfig,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.render.maxDevicePixelRatio);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(timeMs: number): void {
    const camera = this.camera.topLeft(timeMs);
    const view: RenderView = { ctx: this.ctx, width: this.width, height: this.height, timeMs, camera };
    this.ctx.fillStyle = PALETTE.space;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const layer of this.layers.background) layer.draw(view);

    const m = this.config.render.cullMargin;
    this.ctx.save();
    this.ctx.translate(-camera.x, -camera.y);
    // Two passes: huge background bodies first, then everything else on top.
    for (const behind of [true, false]) {
      for (const entity of this.entities.all()) {
        if (!!entity.drawBehind !== behind) continue;
        const { x, y } = entity.body.position;
        // Big bodies draw far beyond their center (TON 618's disk), so widen their margin.
        const pad = m + Math.max((entity.body.circleRadius ?? 0) * 3, entity.drawRadius ?? 0);
        if (x < camera.x - pad || y < camera.y - pad || x > camera.x + this.width + pad || y > camera.y + this.height + pad) {
          continue;
        }
        this.drawers.get(entity.kind)?.draw(view, entity);
      }
    }
    this.ctx.restore();

    for (const layer of this.layers.world) layer.draw(view);
    for (const layer of this.layers.foreground) layer.draw(view);
  }

  dispose(): void {}
}
