import { PALETTE, type GameConfig } from '../config/gameConfig';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { DrawerRegistry } from './drawers/DrawerRegistry';
import type { ILayerDrawer, IRenderer, RenderView } from './IRenderer';

export interface RenderLayers {
  background: readonly ILayerDrawer[];
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
    const view: RenderView = { ctx: this.ctx, width: this.width, height: this.height, timeMs };
    this.ctx.fillStyle = PALETTE.space;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const layer of this.layers.background) layer.draw(view);
    for (const entity of this.entities.all()) this.drawers.get(entity.kind)?.draw(view, entity);
    for (const layer of this.layers.foreground) layer.draw(view);
  }

  dispose(): void {}
}
