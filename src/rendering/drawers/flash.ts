import type { GameConfig } from '../../config/gameConfig';
import type { Entity } from '../../entities/Entity';

export function isFlashing(entity: Entity, timeMs: number, config: GameConfig): boolean {
  return entity.hitAtMs !== undefined && timeMs - entity.hitAtMs < config.effects.hitFlashMs;
}

/** Small health bar above an entity, only once it has taken damage. */
export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number,
  color: string,
): void {
  if (hp >= maxHp) return;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x - width / 2, y, width, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2, y, width * (hp / maxHp), 4);
}
