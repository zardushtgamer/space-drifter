import { PALETTE } from '../../config/gameConfig';
import type { Entity } from '../../entities/Entity';
import type { IDrawer, RenderView } from '../IRenderer';

export class PlayerDrawer implements IDrawer {
  draw({ ctx }: RenderView, entity: Entity): void {
    const { position, circleRadius = 0 } = entity.body;
    ctx.beginPath();
    ctx.arc(position.x, position.y, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.player;
    ctx.fill();
  }
}
