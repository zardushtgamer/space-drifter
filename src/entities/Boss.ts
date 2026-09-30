import type Matter from 'matter-js';
import type { Health } from '../components/Health';
import type { GameConfig } from '../config/gameConfig';
import type { Vec2 } from '../core/types';
import type { Entity } from './Entity';
import { steer } from './steering';

export type FireFn = (origin: Vec2, direction: Vec2) => void;

/** Weaving homer that periodically fires a shotgun blast at its target. Scales with level. */
export class Boss implements Entity {
  readonly kind = 'boss' as const;
  dead = false;
  hitAtMs?: number;
  private ageMs = 0;
  private fireTimerMs: number;

  constructor(
    readonly body: Matter.Body,
    readonly health: Health,
    readonly level: number,
    private readonly target: Entity,
    private readonly fire: FireFn,
    private readonly config: GameConfig['boss'],
  ) {
    this.fireTimerMs = this.fireIntervalMs;
  }

  get id(): number {
    return this.body.id;
  }

  get fireIntervalMs(): number {
    const c = this.config;
    return Math.max(c.minFireIntervalMs, c.fireIntervalMs - (this.level - 1) * c.fireIntervalPerLevelMs);
  }

  update(dtMs: number): void {
    const c = this.config;
    this.ageMs += dtMs;
    const p = this.body.position;
    const t = this.target.body.position;
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const weave = Math.sin((this.ageMs / 1000) * c.weaveHz * Math.PI * 2) * c.weaveAccel;
    const speed = c.maxSpeed * (1 + 0.1 * (this.level - 1));
    steer(this.body, t, c.homingAccel, speed, { x: (-dy / len) * weave, y: (dx / len) * weave });

    this.fireTimerMs -= dtMs;
    if (this.fireTimerMs <= 0) {
      this.fireTimerMs = this.fireIntervalMs;
      // Shotgun blast fanned around the direction to the player.
      const n = c.pelletsPerShot + (this.level - 1) * c.pelletsPerLevel;
      const spread = ((c.spreadDeg + (this.level - 1) * c.spreadPerLevelDeg) * Math.PI) / 180;
      const aim = Math.atan2(dy, dx);
      const r = this.body.circleRadius ?? 0;
      for (let i = 0; i < n; i++) {
        const a = aim - spread / 2 + (n === 1 ? spread / 2 : (i / (n - 1)) * spread) + (Math.random() - 0.5) * 0.08;
        const speed = 1 + (Math.random() * 2 - 1) * c.pelletSpeedJitter;
        const dir = { x: Math.cos(a), y: Math.sin(a) };
        this.fire({ x: p.x + dir.x * r, y: p.y + dir.y * r }, { x: dir.x * speed, y: dir.y * speed });
      }
    }
  }
}
