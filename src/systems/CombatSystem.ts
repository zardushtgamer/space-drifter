import Matter from 'matter-js';
import type { GameConfig } from '../config/gameConfig';
import { computeModifiers, type Modifiers } from '../config/upgrades';

const NO_MODIFIERS = computeModifiers(() => 0);
import type { Camera } from '../core/Camera';
import type { IClock } from '../core/Clock';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { GameStateMachine } from '../core/GameStateMachine';
import type { RunStats } from '../core/RunStats';
import { Boss } from '../entities/Boss';
import { Enemy } from '../entities/Enemy';
import type { Entity } from '../entities/Entity';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ISystem } from './ISystem';

const { Body } = Matter;

/**
 * Resolves collisions into damage: the player rams enemies at speed to hurt
 * them, otherwise enemies hurt the player on contact. Mines explode on touch.
 */
export class CombatSystem implements ISystem {
  private timeMs = 0;
  private lastHurtMs = -Infinity;
  private invulnUntilMs = 0;
  /** Entity id -> time of the player's last successful ram on it. */
  private readonly lastRamMs = new Map<number, number>();
  private readonly unsubs: Array<() => void>;

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly state: GameStateMachine,
    private readonly bus: EventBus<EventMap>,
    private readonly camera: Camera,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly config: GameConfig,
    /** Upgrade + perk effects; read live so purchases and level-ups apply immediately. */
    private readonly mods: () => Modifiers = () => NO_MODIFIERS,
  ) {
    this.unsubs = [
      physics.onCollision('collisionStart', (pairs) => this.onPairs(pairs, true)),
      physics.onCollision('collisionActive', (pairs) => this.onPairs(pairs, false)),
    ];
  }

  update(dtMs: number): void {
    this.timeMs += dtMs;
  }

  /** Ignore all player damage for the next `ms` of game time. */
  grantInvulnerability(ms: number): void {
    this.invulnUntilMs = Math.max(this.invulnUntilMs, this.timeMs + ms);
  }

  /** Instant death that ignores invulnerability (e.g. crossing TON 618's horizon). */
  killPlayer(): void {
    if (!this.state.is('playing')) return;
    this.player.health.damage(this.player.health.maxHp);
    this.camera.shake(this.config.effects.shakeMs * 3, this.config.effects.shakeMagnitude * 3);
    if (this.state.transition('lost')) this.bus.emit('game:lost', { timeMs: this.stats.elapsedMs });
  }

  hurtPlayer = (amount: number): void => {
    if (!this.state.is('playing')) return;
    if (this.timeMs < this.invulnUntilMs) return;
    if (this.timeMs - this.lastHurtMs < this.config.player.hurtCooldownMs + this.mods().extraInvulnMs) return;
    this.lastHurtMs = this.timeMs;
    this.player.health.damage(amount * this.mods().damageTaken);
    this.player.hitAtMs = this.clock.now();
    const fx = this.config.effects;
    this.camera.shake(fx.shakeMs, fx.shakeMagnitude);
    if (this.player.health.isDead() && this.state.transition('lost')) {
      this.bus.emit('game:lost', { timeMs: this.stats.elapsedMs });
    }
  };

  private onPairs(pairs: readonly Matter.Pair[], started: boolean): void {
    for (const pair of pairs) {
      const a = this.registry.get(pair.bodyA);
      const b = this.registry.get(pair.bodyB);
      if (!a || !b || a.dead || b.dead) continue;

      if (a === this.player || b === this.player) {
        const other = a === this.player ? b : a;
        if (other instanceof Obstacle) {
          this.touchObstacle(other, started);
        } else if (other instanceof Enemy || other instanceof Boss) {
          this.clash(other, started);
        }
        continue;
      }

      // Enemies that blunder into mines blow up with them.
      if (started) {
        const mine = [a, b].find((e) => e instanceof Obstacle && e.type === 'mine') as Obstacle | undefined;
        const enemy = [a, b].find((e) => e instanceof Enemy) as Enemy | undefined;
        if (mine && enemy) {
          mine.dead = true;
          this.kill(enemy);
        }
      }
    }
  }

  private clash(other: Enemy | Boss, started: boolean): void {
    const c = this.config.combat;
    const lastRam = this.lastRamMs.get(other.id) ?? -Infinity;
    const recentlyRammed = this.timeMs - lastRam < c.rammingCooldownMs;

    if (started && !recentlyRammed) {
      const vp = this.physics.velocityBeforeStep(this.player.body);
      const vo = this.physics.velocityBeforeStep(other.body);
      const rel = Math.hypot(vp.x - vo.x, vp.y - vo.y);
      const threshold = c.rammingSpeedThreshold * this.mods().ramThreshold;
      if (rel >= threshold) {
        const dmg = Math.min(
          c.rammingMaxDamage,
          Math.max(c.rammingMinDamage, (rel - threshold) / c.rammingDamageDivisor),
        );
        this.lastRamMs.set(other.id, this.timeMs);
        other.health.damage(dmg * this.mods().ramDamage);
        other.hitAtMs = this.clock.now();
        this.camera.shake(this.config.effects.shakeMs * 0.6, this.config.effects.shakeMagnitude * 0.5);
        if (other.health.isDead()) this.kill(other);
        return;
      }
    }
    if (recentlyRammed) return;
    const dmg = other instanceof Boss ? this.config.boss.contactDamage : other.stats.contactDamage;
    this.hurtPlayer(dmg);
  }

  private detonate(mine: Obstacle): void {
    const o = this.config.obstacles;
    mine.dead = true;
    const p = this.player.body.position;
    const dx = p.x - mine.body.position.x;
    const dy = p.y - mine.body.position.y;
    const len = Math.hypot(dx, dy) || 1;
    Body.setVelocity(this.player.body, { x: (dx / len) * o.mineKnockback, y: (dy / len) * o.mineKnockback });
    this.hurtPlayer(o.mineDamage);
    this.camera.shake(this.config.effects.shakeMs * 1.5, this.config.effects.shakeMagnitude * 1.5);
  }

  /** Player touching an obstacle; `started` is true only on the first step of contact. */
  private touchObstacle(o: Obstacle, started: boolean): void {
    const hz = this.config.hazards;
    const body = this.player.body;
    switch (o.type) {
      case 'mine':
        if (started) this.detonate(o);
        break;
      case 'health':
        this.pickUp(o);
        break;
      case 'lava':
        // hurtPlayer's cooldown turns this into a steady burn.
        this.hurtPlayer(hz.lava.damage);
        break;
      case 'crystal':
        this.hurtPlayer(hz.crystal.damage);
        break;
      case 'acid': {
        this.hurtPlayer(hz.acid.damage);
        const v = body.velocity;
        Body.setVelocity(body, { x: v.x * hz.acid.dragPerStep, y: v.y * hz.acid.dragPerStep });
        break;
      }
      case 'frost': {
        const v = body.velocity;
        Body.setVelocity(body, { x: v.x * hz.frost.dragPerStep, y: v.y * hz.frost.dragPerStep });
        break;
      }
      case 'boost': {
        if (!started) break;
        const v = body.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed === 0) break;
        const next = Math.min(hz.boost.maxSpeed, Math.max(hz.boost.minSpeed, speed * hz.boost.speedMultiplier));
        Body.setVelocity(body, { x: (v.x / speed) * next, y: (v.y / speed) * next });
        this.camera.shake(this.config.effects.shakeMs * 0.5, this.config.effects.shakeMagnitude * 0.4);
        break;
      }
    }
  }

  private pickUp(pack: Obstacle): void {
    // Leave packs in place at full health so they aren't wasted.
    if (this.player.health.hp >= this.player.health.maxHp) return;
    pack.dead = true;
    this.player.health.heal(this.config.obstacles.healthPackHeal);
  }

  /** Destroys an enemy or boss as if the player killed it (score, XP, heals). Used by the Singularity. */
  consume(entity: Enemy | Boss): void {
    this.kill(entity);
  }

  private kill(entity: Enemy | Boss): void {
    if (entity.dead) return;
    entity.dead = true;
    this.lastRamMs.delete(entity.id);
    const c = this.config.combat;
    if (entity instanceof Boss) {
      this.stats.score += this.config.boss.score * entity.level;
      this.stats.bossesDefeated++;
      this.player.health.heal(c.healPerBoss);
      this.stats.highestBossKilled = Math.max(this.stats.highestBossKilled, entity.level);
      this.bus.emit('boss:killed', { level: entity.level });
    } else {
      this.stats.score += entity.stats.score;
      this.stats.kills++;
      this.player.health.heal(c.healPerKill + this.mods().healPerKill);
      this.bus.emit('enemy:killed', { id: entity.id, score: entity.stats.score });
    }
  }

  /** Forget ram timers for entities that no longer exist. */
  forget(entity: Entity): void {
    this.lastRamMs.delete(entity.id);
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    this.lastRamMs.clear();
  }
}
