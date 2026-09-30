import Matter from 'matter-js';
import type { Health } from '../components/Health';
import type { Vec2 } from '../core/types';
import type { FireFn } from './Boss';
import type { Entity } from './Entity';
import { steer } from './steering';

const { Body } = Matter;

export type EnemyType =
  | 'chaser'
  | 'brute'
  | 'dasher'
  | 'splitter'
  | 'sniper'
  | 'phantom'
  | 'swarmer'
  | 'bloater'
  | 'orbiter'
  | 'jelly';

export interface EnemyStats {
  readonly accel: number;
  readonly maxSpeed: number;
  readonly contactDamage: number;
  readonly score: number;
  // Type-specific tuning (see gameConfig.enemyTypes).
  readonly stalkMs?: number;
  readonly windupMs?: number;
  readonly dashMs?: number;
  readonly dashSpeed?: number;
  readonly preferredDistance?: number;
  readonly fireIntervalMs?: number;
  readonly bulletSpeed?: number;
  readonly blinkIntervalMs?: number;
  readonly blinkMinDistance?: number;
  readonly blinkMaxDistance?: number;
  readonly orbitRadius?: number;
  readonly pulseIntervalMs?: number;
  readonly pulseSpeed?: number;
}

export type DasherPhase = 'stalk' | 'windup' | 'dash';

/** Homes in on the target and hurts it on contact; some types add a twist. */
export class Enemy implements Entity {
  readonly kind = 'enemy' as const;
  dead = false;
  hitAtMs?: number;
  /** Dasher state, exposed for the drawer. */
  phase: DasherPhase = 'stalk';
  /** Game time of the phantom's last blink, for its fade-in. */
  blinkedAtMs = -Infinity;
  /** Age at the jelly's last pulse, for its squash animation. */
  pulsedAtMs = -Infinity;
  ageMs = 0;
  private timerMs = 0;

  constructor(
    readonly body: Matter.Body,
    readonly health: Health,
    readonly type: EnemyType,
    readonly stats: EnemyStats,
    private readonly target: Entity,
    private readonly fire: FireFn | null = null,
    private readonly random: () => number = Math.random,
  ) {
    // Stagger timers so groups don't act in lockstep.
    this.timerMs = this.random() * 800;
  }

  get id(): number {
    return this.body.id;
  }

  update(dtMs: number): void {
    this.ageMs += dtMs;
    this.timerMs += dtMs;
    const s = this.stats;
    const t = this.target.body.position;
    switch (this.type) {
      case 'dasher':
        return this.updateDasher(t);
      case 'sniper':
        return this.updateSniper(t);
      case 'phantom':
        if (this.timerMs >= (s.blinkIntervalMs ?? 3000)) this.blink(t);
        return steer(this.body, t, s.accel, s.maxSpeed);
      case 'orbiter':
        return this.updateOrbiter(t);
      case 'jelly':
        return this.updateJelly(t);
      default:
        return steer(this.body, t, s.accel, s.maxSpeed);
    }
  }

  private updateDasher(t: Vec2): void {
    const s = this.stats;
    if (this.phase === 'stalk') {
      steer(this.body, t, s.accel, s.maxSpeed);
      if (this.timerMs >= (s.stalkMs ?? 1500)) this.setPhase('windup');
    } else if (this.phase === 'windup') {
      const v = this.body.velocity;
      Body.setVelocity(this.body, { x: v.x * 0.85, y: v.y * 0.85 });
      if (this.timerMs >= (s.windupMs ?? 400)) {
        const d = this.dirTo(t);
        const speed = s.dashSpeed ?? 10;
        Body.setVelocity(this.body, { x: d.x * speed, y: d.y * speed });
        this.setPhase('dash');
      }
    } else if (this.timerMs >= (s.dashMs ?? 500)) {
      this.setPhase('stalk');
    }
  }

  private updateSniper(t: Vec2): void {
    const s = this.stats;
    const p = this.body.position;
    const dist = Math.hypot(t.x - p.x, t.y - p.y);
    const want = s.preferredDistance ?? 350;
    // Close in when far, back off when too close, strafe in between.
    if (dist > want * 1.2) steer(this.body, t, s.accel, s.maxSpeed);
    else if (dist < want * 0.8) steer(this.body, { x: 2 * p.x - t.x, y: 2 * p.y - t.y }, s.accel, s.maxSpeed);
    else {
      const d = this.dirTo(t);
      steer(this.body, { x: p.x - d.y * 100, y: p.y + d.x * 100 }, s.accel * 0.5, s.maxSpeed * 0.6);
    }
    if (this.fire && this.timerMs >= (s.fireIntervalMs ?? 2000)) {
      this.timerMs = 0;
      const d = this.dirTo(t);
      const k = s.bulletSpeed ?? 1;
      this.fire({ x: p.x + d.x * 18, y: p.y + d.y * 18 }, { x: d.x * k, y: d.y * k });
    }
  }

  /** Chases a point a little ahead of itself on a circle around the player, shooting inward. */
  private updateOrbiter(t: Vec2): void {
    const s = this.stats;
    const p = this.body.position;
    const orbit = s.orbitRadius ?? 250;
    const a = Math.atan2(p.y - t.y, p.x - t.x) + 0.5;
    steer(this.body, { x: t.x + Math.cos(a) * orbit, y: t.y + Math.sin(a) * orbit }, s.accel, s.maxSpeed);
    if (this.fire && this.timerMs >= (s.fireIntervalMs ?? 2000)) {
      this.timerMs = 0;
      const d = this.dirTo(t);
      const k = s.bulletSpeed ?? 1;
      this.fire({ x: p.x + d.x * 16, y: p.y + d.y * 16 }, { x: d.x * k, y: d.y * k });
    }
  }

  /** Coasts to a stop, then kicks off toward the player in a burst. */
  private updateJelly(t: Vec2): void {
    const s = this.stats;
    if (this.timerMs < (s.pulseIntervalMs ?? 1300)) return;
    this.timerMs = 0;
    this.pulsedAtMs = this.ageMs;
    const d = this.dirTo(t);
    const speed = s.pulseSpeed ?? 6;
    Body.setVelocity(this.body, { x: d.x * speed, y: d.y * speed });
  }

  private blink(t: Vec2): void {
    const s = this.stats;
    const a = this.random() * Math.PI * 2;
    const min = s.blinkMinDistance ?? 140;
    const dist = min + this.random() * ((s.blinkMaxDistance ?? 240) - min);
    Body.setPosition(this.body, { x: t.x + Math.cos(a) * dist, y: t.y + Math.sin(a) * dist });
    Body.setVelocity(this.body, { x: 0, y: 0 });
    this.timerMs = 0;
    this.blinkedAtMs = this.ageMs;
  }

  private setPhase(phase: DasherPhase): void {
    this.phase = phase;
    this.timerMs = 0;
  }

  private dirTo(t: Vec2): Vec2 {
    const p = this.body.position;
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
}
