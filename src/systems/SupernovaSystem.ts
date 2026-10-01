import Matter from 'matter-js';
import { supernovaStats } from '../config/upgrades';
import type { Camera } from '../core/Camera';
import type { IClock } from '../core/Clock';
import type { RunStats } from '../core/RunStats';
import type { Vec2 } from '../core/types';
import { Boss } from '../entities/Boss';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { InfinitySystem } from './InfinitySystem';
import type { ISystem } from './ISystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { SingularitySystem } from './SingularitySystem';

const { Body } = Matter;

export interface Blast {
  x: number;
  y: number;
  /** Render-clock time of detonation. */
  atMs: number;
  radius: number;
  vfx: number;
}

/**
 * Supernova: with Infinity (repulsion) and Singularity (attraction) both active,
 * press N to collapse them together. A short charge pulls everything in, then
 * a blast damages and hurls back everything in range and erases bullets.
 */
export class SupernovaSystem implements ISystem {
  /** Game time. */
  private timeMs = 0;
  private readyAtMs = 0;
  /** Game time the charge started, or null when not charging. */
  chargeStartMs: number | null = null;
  /** Most recent detonation, for the drawer. */
  lastBlast: Blast | null = null;

  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly projectiles: ProjectileSystem,
    private readonly infinity: InfinitySystem,
    private readonly singularity: SingularitySystem,
    private readonly camera: Camera,
    private readonly clock: IClock,
    private readonly stats: RunStats,
    readonly level: () => number,
  ) {}

  /** Owned, and both ingredients switched on. */
  get available(): boolean {
    return this.level() > 0 && this.infinity.enabled && this.singularity.enabled;
  }

  get ready(): boolean {
    return this.available && this.chargeStartMs === null && this.timeMs >= this.readyAtMs;
  }

  /** 0..1 recharge progress. */
  get recharge(): number {
    const s = supernovaStats(this.level());
    return Math.max(0, Math.min(1, 1 - (this.readyAtMs - this.timeMs) / s.cooldownMs));
  }

  /** 0..1 progress through the charge-up (0 when not charging). */
  get charge(): number {
    if (this.chargeStartMs === null) return 0;
    return Math.min(1, (this.timeMs - this.chargeStartMs) / supernovaStats(this.level()).chargeMs);
  }

  /** Returns false (and explains via the banner) if it can't fire right now. */
  activate(): boolean {
    if (this.level() <= 0) return false;
    if (!this.infinity.enabled || !this.singularity.enabled) {
      this.stats.banner = { text: 'SUPERNOVA NEEDS INFINITY + SINGULARITY ON', untilMs: this.clock.now() + 1500 };
      return false;
    }
    if (!this.ready) return false;
    this.chargeStartMs = this.timeMs;
    return true;
  }

  update(dtMs: number): void {
    this.timeMs += dtMs;
    if (this.chargeStartMs === null) return;
    const s = supernovaStats(this.level());
    if (this.timeMs - this.chargeStartMs < s.chargeMs) {
      this.camera.shake(80, 2 + this.charge * 4);
      return;
    }
    this.chargeStartMs = null;
    this.readyAtMs = this.timeMs + s.cooldownMs;
    this.detonate(s);
  }

  private detonate(s: ReturnType<typeof supernovaStats>): void {
    const p: Vec2 = { ...this.player.body.position };
    for (const e of [...this.registry.all()]) {
      if (e === this.player || e.dead) continue;
      const q = e.body.position;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = s.radius + (e.body.circleRadius ?? 0);
      if (d > reach) continue;
      const falloff = 1 - 0.5 * (d / reach);
      const ux = dx / d;
      const uy = dy / d;

      if (e instanceof Enemy || e instanceof Boss) {
        e.health.damage(s.damage * falloff);
        e.hitAtMs = this.clock.now();
        if (e.health.isDead()) this.combat.consume(e);
        const kb = s.knockback * falloff * (e instanceof Boss ? 0.4 : 1);
        Body.setVelocity(e.body, { x: ux * kb, y: uy * kb });
      } else if (e instanceof Obstacle && !e.body.isStatic) {
        Body.setVelocity(e.body, { x: ux * s.knockback * falloff, y: uy * s.knockback * falloff });
      }
    }
    // Bullets in range are vaporized.
    const bullets = this.projectiles.bullets;
    let w = 0;
    for (const b of bullets) if (Math.hypot(b.x - p.x, b.y - p.y) > s.radius) bullets[w++] = b;
    bullets.length = w;

    this.camera.shake(400 + 80 * s.vfx, 10 + 4 * s.vfx);
    this.lastBlast = { x: p.x, y: p.y, atMs: this.clock.now(), radius: s.radius, vfx: s.vfx };
    this.stats.banner = { text: '💥 SUPERNOVA', untilMs: this.clock.now() + 1200 };
  }

  dispose(): void {}
}
