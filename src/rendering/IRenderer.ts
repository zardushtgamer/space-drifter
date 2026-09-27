import type { IDisposable } from '../core/types';
import type { Entity } from '../entities/Entity';

export interface RenderView {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly timeMs: number;
}

export interface IRenderer extends IDisposable {
  resize(width: number, height: number): void;
  render(timeMs: number): void;
}

/** Draws one entity kind. */
export interface IDrawer {
  draw(view: RenderView, entity: Entity): void;
}

/** Draws a whole layer (starfield, aim line) independent of entities. */
export interface ILayerDrawer {
  draw(view: RenderView): void;
}
