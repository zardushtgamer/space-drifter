import Matter from 'matter-js';
import { INFINITY_STOP_GAP, infinityApproachCap, infinityStats } from '../config/upgrades';
import { Boss } from '../entities/Boss';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { Player } from '../entities/Player';
import type { ISystem } from './ISystem';
import type { ProjectileSystem } from './ProjectileSystem';

const { Body } = Matter;

/**
 * Infinity upgrade: inside the field, anything's speed *toward* the player is
 * capped by how close its hitbox is to yours, reaching 0 at contact, so it can
 * never touch you. Sideways motion is untouched, and your own launches still
 * close the gap (you can ram them). Runs after everything that sets enemy
 * velocity and before projectiles move.
 */
export class InfinitySystem implements ISystem {
  /** Toggled by the player (I). */
  active = true;
  /** Enemies currently being slowed, 0..1 how strongly (for the drawer). */
  readonly slowed = new Map<number, number>();

  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly projectiles: ProjectileSystem,
    readonly level: () => number,
  ) {}

  get enabled(): boolean {
    return this.active && this.level() > 0;
  }

  update(): void {
    this.slowed.clear();
    if (!this.enabled) return;
    const { range, maxApproach } = infinityStats(this.level());
    const p = this.player.body.position;
    const pr = this.player.body.circleRadius ?? 0;

    for (const e of this.registry.all()) {
      if ((!(e instanceof Enemy) && !(e instanceof Boss)) || e.dead) continue;
      const q = e.body.position;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d = Math.hypot(dx, dy) || 1;
      const gap = d - pr - (e.body.circleRadius ?? 0);
      if (gap >= range) continue;
      const ux = dx / d;
      const uy = dy / d;
      const v = e.body.velocity;
      const toward = v.x * ux + v.y * uy;
      this.slowed.set(e.id, 1 - Math.max(0, gap) / range);
      if (gap < INFINITY_STOP_GAP) {
        // Shoved inside the stop line (e.g. by a crowd behind it): ease it back out, keep sideways motion.
        const out = Math.min(3, INFINITY_STOP_GAP - gap);
        Body.setVelocity(e.body, { x: v.x - ux * (toward + out), y: v.y - uy * (toward + out) });
        continue;
      }
      const cap = infinityApproachCap(gap, range, maxApproach);
      if (toward <= cap) continue;
      // Remove the excess approach speed, keep the sideways part.
      const cut = toward - cap;
      Body.setVelocity(e.body, { x: v.x - ux * cut, y: v.y - uy * cut });
    }

    for (const b of this.projectiles.bullets) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const gap = d - pr - 6;
      if (gap >= range) continue;
      const ux = dx / d;
      const uy = dy / d;
      const toward = b.vx * ux + b.vy * uy;
      const cap = infinityApproachCap(gap, range, maxApproach);
      if (toward <= cap) continue;
      const cut = toward - cap;
      b.vx -= ux * cut;
      b.vy -= uy * cut;
    }
  }

  dispose(): void {}
}
