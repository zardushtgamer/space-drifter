import Matter from 'matter-js';
import { singularityStats } from '../config/upgrades';
import { Boss } from '../entities/Boss';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle, type ObstacleType } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { ISystem } from './ISystem';
import type { ProjectileSystem } from './ProjectileSystem';

const { Body } = Matter;

/** Too big (or too important) to be pulled around. */
const IMMOVABLE: ReadonlySet<ObstacleType> = new Set(['landmark', 'gasgiant', 'ton618', 'cavewall', 'blackhole', 'rift']);
/** Pulled in, but collected by their own pickup logic rather than destroyed. */
const PICKUPS: ReadonlySet<ObstacleType> = new Set(['gem', 'health']);

/**
 * Singularity upgrade: the player becomes a black hole. Everything within
 * reach is pulled in; anything crossing the event horizon is swallowed.
 * Runs before projectiles, so bullets are eaten before they can hit.
 */
export class SingularitySystem implements ISystem {
  /** Toggled by the player (B). */
  active = true;

  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly projectiles: ProjectileSystem,
    /** Current upgrade level (0 = not owned). */
    readonly level: () => number,
    /** Called for each enemy swallowed (achievement tracking). */
    private readonly onSwallow: () => void = () => {},
  ) {}

  get enabled(): boolean {
    return this.active && this.level() > 0;
  }

  update(dtMs: number): void {
    if (!this.enabled) return;
    const s = singularityStats(this.level());
    const p = this.player.body.position;

    /** 0 at the edge of reach, 1 at the horizon. */
    const closeness = (d: number) => Math.max(0, Math.min(1, (s.reach - d) / (s.reach - s.horizon)));

    for (const e of [...this.registry.all()]) {
      if (e === this.player || e.dead) continue;
      const q = e.body.position;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d = Math.hypot(dx, dy);
      const r = e.body.circleRadius ?? 0;
      if (d - r >= s.reach || d === 0) continue;
      const ux = dx / d;
      const uy = dy / d;
      const k = closeness(d - r);
      const swallowed = d - r < s.horizon;

      if (e instanceof Boss) {
        this.accelerate(e.body, ux, uy, s.pull * k * 0.3);
        if (swallowed) {
          e.health.damage((s.bossDps * dtMs) / 1000);
          if (e.health.isDead()) this.combat.consume(e);
        }
      } else if (e instanceof Enemy) {
        if (swallowed) {
          this.combat.consume(e);
          this.onSwallow();
        }
        else this.accelerate(e.body, ux, uy, s.pull * k);
      } else if (e instanceof Obstacle) {
        if (IMMOVABLE.has(e.type) || e.link) continue;
        if (e.type === 'planet' && !s.swallowsPlanets) continue;
        if (swallowed && !PICKUPS.has(e.type)) {
          e.dead = true;
          continue;
        }
        if (e.body.isStatic) {
          // Static bodies can't feel forces: drag them in, faster the closer they are.
          const speed = Math.min(d, s.staticSpeed * (0.2 + 0.8 * k));
          Body.setPosition(e.body, { x: q.x + ux * speed, y: q.y + uy * speed });
        } else {
          this.accelerate(e.body, ux, uy, s.pull * k);
        }
      }
    }

    // Bullets curve in and are eaten at the horizon.
    const bullets = this.projectiles.bullets;
    let w = 0;
    for (const b of bullets) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < s.horizon) continue;
      if (d < s.reach) {
        const a = s.pull * closeness(d) * 1.5;
        b.vx += (dx / d) * a;
        b.vy += (dy / d) * a;
      }
      bullets[w++] = b;
    }
    bullets.length = w;
  }

  private accelerate(body: Matter.Body, ux: number, uy: number, a: number): void {
    const v = body.velocity;
    Body.setVelocity(body, { x: v.x + ux * a, y: v.y + uy * a });
  }

  dispose(): void {}
}
