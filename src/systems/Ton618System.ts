import Matter from 'matter-js';
import type { GameConfig } from '../config/gameConfig';
import type { RunStats } from '../core/RunStats';
import type { IClock } from '../core/Clock';
import type { TimeScale } from '../core/TimeScale';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { GravitySystem } from './GravitySystem';
import type { ISystem } from './ISystem';
import type { WorldSystem } from './WorldSystem';

const { Body } = Matter;

/**
 * TON 618 at the center of The Void. Its gravity drags in everything:
 * the player and enemies are pulled; obstacles (even static planets) drift
 * in faster and faster and are destroyed at the horizon. Crossing the
 * horizon is fatal to the player.
 */
export class Ton618System implements ISystem {
  /** 0..1 pull felt by the player (for the warning HUD). */
  pull = 0;
  /** Obstacles swallowed this run, for bragging rights. */
  swallowed = 0;

  constructor(
    private readonly world: WorldSystem,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly gravity: GravitySystem,
    private readonly timeScale: TimeScale,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly config: GameConfig,
  ) {}

  update(): void {
    const ton = this.world.ton618;
    this.pull = 0;
    if (!ton) return;
    const c = this.config.ton618;
    const center = ton.body.position;
    const horizon = c.radius;
    const reach = c.radius * c.reachScale;

    /** 0 at the edge of reach, 1 at the horizon. */
    const closeness = (d: number) => Math.max(0, Math.min(1, (reach - d) / (reach - horizon)));

    for (const e of this.registry.all()) {
      if (e === ton || e.dead) continue;
      const p = e.body.position;
      const dx = center.x - p.x;
      const dy = center.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d >= reach || d === 0) continue;
      const k = closeness(d);
      const ux = dx / d;
      const uy = dy / d;

      if (e === this.player) {
        if (d < horizon) {
          this.stats.banner = { text: 'SPAGHETTIFIED BY TON 618', untilMs: this.clock.now() + 5000 };
          this.stats.deathCause = 'ton618';
          this.combat.killPlayer();
          return;
        }
        this.pull = k;
        this.accelerate(e.body, ux, uy, c.pullStrength * k);
        continue;
      }

      if (d < horizon) {
        e.dead = true;
        if (e instanceof Obstacle) this.swallowed++;
        continue;
      }

      if (e instanceof Enemy) {
        this.accelerate(e.body, ux, uy, c.pullStrength * k);
      } else if (e instanceof Obstacle && !e.link) {
        // Static bodies (planets, mines, hazards) can't feel forces, so drag them in directly.
        // Linked wormholes are anchored in spacetime and resist.
        if (e.body.isStatic) {
          const speed = c.obstacleMinSpeed + (c.obstacleMaxSpeed - c.obstacleMinSpeed) * k * k;
          Body.setPosition(e.body, { x: p.x + ux * speed, y: p.y + uy * speed });
        } else {
          this.accelerate(e.body, ux, uy, c.pullStrength * k);
        }
      }
    }

    // Deep time dilation near the horizon (stacks with GravitySystem's, keeping the stronger).
    const pd = Math.hypot(this.player.body.position.x - center.x, this.player.body.position.y - center.y);
    const dilationRange = c.radius * c.dilationScale;
    if (pd < dilationRange) {
      const dil = 1 - (pd - horizon) / (dilationRange - horizon);
      this.gravity.dilation = Math.max(this.gravity.dilation, dil);
      this.timeScale.value = Math.min(this.timeScale.value, 1 - dil * (1 - c.minTimeScale));
    }
  }

  /** Pull on the player at a point, px/step per step (zero outside The Void or its reach). Pure. */
  accelAt(p: { x: number; y: number }): { x: number; y: number } {
    const ton = this.world.ton618;
    if (!ton) return { x: 0, y: 0 };
    const c = this.config.ton618;
    const reach = c.radius * c.reachScale;
    const dx = ton.body.position.x - p.x;
    const dy = ton.body.position.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= reach || d === 0) return { x: 0, y: 0 };
    const k = Math.max(0, Math.min(1, (reach - d) / (reach - c.radius)));
    return { x: (dx / d) * c.pullStrength * k, y: (dy / d) * c.pullStrength * k };
  }

  private accelerate(body: Matter.Body, ux: number, uy: number, a: number): void {
    const v = body.velocity;
    Body.setVelocity(body, { x: v.x + ux * a, y: v.y + uy * a });
  }

  dispose(): void {}
}
