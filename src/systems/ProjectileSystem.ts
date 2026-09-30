import type { GameConfig } from '../config/gameConfig';
import type { Vec2 } from '../core/types';
import type { Entity } from '../entities/Entity';
import type { ISystem } from './ISystem';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
}

/** Enemy bullets. Kept out of Matter: they only ever need a distance check vs the player. */
export class ProjectileSystem implements ISystem {
  readonly bullets: Projectile[] = [];

  constructor(
    private readonly player: Entity,
    private readonly hurtPlayer: (amount: number) => void,
    private readonly config: GameConfig,
  ) {}

  /** `dir` is scaled by the base speed, so its length acts as a speed multiplier. */
  fire = (origin: Vec2, dir: Vec2): void => {
    const { speed, lifeMs } = this.config.projectiles;
    this.bullets.push({ x: origin.x, y: origin.y, vx: dir.x * speed, vy: dir.y * speed, lifeMs });
  };

  update(dtMs: number): void {
    const { radius, damage } = this.config.projectiles;
    const p = this.player.body.position;
    const hitDist = radius + (this.player.body.circleRadius ?? 0);
    let w = 0;
    for (const b of this.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.lifeMs -= dtMs;
      if (b.lifeMs <= 0) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < hitDist) {
        this.hurtPlayer(damage);
        continue;
      }
      this.bullets[w++] = b;
    }
    this.bullets.length = w;
  }

  dispose(): void {
    this.bullets.length = 0;
  }
}
