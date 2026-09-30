import type { IDisposable, Vec2 } from '../core/types';
import type { Entity } from '../entities/Entity';

export interface RenderView {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly timeMs: number;
  /** World position of the screen's top-left corner. */
  readonly camera: Vec2;
}

export interface IRenderer extends IDisposable {
  resize(width: number, height: number): void;
  render(timeMs: number): void;
}

/** Draws one entity kind, in world coordinates (the camera transform is already applied). */
export interface IDrawer {
  draw(view: RenderView, entity: Entity): void;
}

/** Draws a whole layer (starfield, aim line, HUD) in screen coordinates. */
export interface ILayerDrawer {
  draw(view: RenderView): void;
}
