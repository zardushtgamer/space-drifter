import Matter from 'matter-js';
import { LANDMARK_TUNING as T } from '../config/landmarks';
import type { IClock } from '../core/Clock';
import type { RunStats } from '../core/RunStats';
import type { SaveData } from '../core/SaveData';
import type { Vec2 } from '../core/types';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { ISystem } from './ISystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { WorldSystem } from './WorldSystem';

const { Body } = Matter;

/** Distance from point p to the segment a-b. */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Runs the current dimension's landmark (see config/landmarks.ts) and gem pickups. */
export class LandmarkSystem implements ISystem {
  private timeMs = 0;
  private lastTickMs = 0;
  private stargateReadyAtMs = 0;
  private nextEruptionMs: number = T.volcano.eruptEveryMs;
  /** Bloom open/close cycle id the player already harvested (one reward per opening). */
  private bloomHarvestedCycle = -1;
  /** Solar Array charge, 0..1. */
  arrayCharge = 0;
  private overdriveUntilMs = 0;
  private pearlReadyAtMs = 0;

  /** The Great Bloom: is it open right now? */
  get bloomOpen(): boolean {
    const b = T.bloom;
    return this.timeMs % (b.closedMs + b.openMs) >= b.closedMs;
  }

  /** 0..1 how far through its current phase the bloom is (for the petal animation). */
  get bloomPhase(): number {
    const b = T.bloom;
    const t = this.timeMs % (b.closedMs + b.openMs);
    return this.bloomOpen ? (t - b.closedMs) / b.openMs : t / b.closedMs;
  }

  get pearlReady(): boolean {
    return this.timeMs >= this.pearlReadyAtMs;
  }

  /** Launch multiplier from the Solar Array's overdrive (1 when inactive). */
  get launchBoost(): number {
    return this.timeMs < this.overdriveUntilMs ? T.array.overdrive : 1;
  }

  get overdriveLeftMs(): number {
    return Math.max(0, this.overdriveUntilMs - this.timeMs);
  }

  constructor(
    private readonly world: WorldSystem,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly projectiles: ProjectileSystem,
    private readonly save: SaveData,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly healthPackHeal: number,
    /** Extra pickup reach from the Magnet upgrade / Tractor Beam perk. */
    private readonly pickupReach: () => number,
  ) {}

  /** Rotation of beam landmarks (lighthouse, spire), radians. Read by the drawer. */
  beamAngle(turnRadPerSec: number): number {
    return (this.timeMs / 1000) * turnRadPerSec;
  }

  /** 0..1 stargate charge, for the drawer. */
  get stargateCharge(): number {
    const t = T.stargate;
    return Math.min(1, 1 - (this.stargateReadyAtMs - this.timeMs) / t.cooldownMs);
  }

  update(dtMs: number): void {
    this.timeMs += dtMs;
    this.collectGems();
    const lm = this.world.landmark;
    const def = lm?.landmark;
    if (!lm || !def) return;
    const c = lm.body.position;
    const p = this.player.body.position;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    const r = def.radius;
    const every = (ms: number) => {
      if (this.timeMs - this.lastTickMs < ms) return false;
      this.lastTickMs = this.timeMs;
      return true;
    };

    switch (def.id) {
      case 'sun': {
        const s = T.sun;
        const reach = r * s.pullScale;
        if (d < reach && d > 0) {
          const k = Math.min(1, (reach - d) / (reach - r));
          this.nudge(this.player.body, c, s.pullStrength * k);
        }
        if (d < r * s.burnScale) this.combat.hurtPlayer(s.burnDamage);
        break;
      }
      case 'stargate': {
        if (d < T.stargate.coreRadius && this.timeMs >= this.stargateReadyAtMs) {
          this.stargateReadyAtMs = this.timeMs + T.stargate.cooldownMs;
          this.player.health.heal(this.player.health.maxHp);
          this.award(T.stargate.coins);
          this.banner(`STARGATE · FULL HEAL · +${T.stargate.coins} COINS`);
        }
        break;
      }
      case 'volcano': {
        const v = T.volcano;
        if (this.timeMs >= this.nextEruptionMs) {
          this.nextEruptionMs = this.timeMs + v.eruptEveryMs;
          // Only erupt when the player is near enough to see it.
          if (d < 2200) {
            const spin = this.timeMs / 1000;
            for (let i = 0; i < v.fireballs; i++) {
              const a = spin + (i / v.fireballs) * Math.PI * 2;
              const dir = { x: Math.cos(a), y: Math.sin(a) };
              this.projectiles.fire(
                { x: c.x + dir.x * (r + 10), y: c.y + dir.y * (r + 10) },
                { x: dir.x * v.fireballSpeed, y: dir.y * v.fireballSpeed },
              );
            }
          }
        }
        if (d < r * v.burnScale) this.combat.hurtPlayer(v.burnDamage);
        break;
      }
      case 'titan': {
        const t = T.titan;
        const aura = r * t.auraScale;
        for (const e of this.registry.all()) {
          if (!(e instanceof Enemy) || e.dead) continue;
          const q = e.body.position;
          if (Math.hypot(q.x - c.x, q.y - c.y) > aura) continue;
          const v = e.body.velocity;
          Body.setVelocity(e.body, { x: v.x * t.enemyDrag, y: v.y * t.enemyDrag });
        }
        if (d < aura && every(t.healEveryMs)) this.player.health.heal(t.heal);
        break;
      }
      case 'lighthouse': {
        const l = T.lighthouse;
        const beams = this.beams(c, l.beams, l.length, l.turnRadPerSec);
        const lit = (q: Vec2) => beams.some((b) => distToSegment(q, c, b) < l.width);
        if (lit(p) && every(l.healEveryMs)) this.player.health.heal(l.heal);
        for (const e of this.registry.all()) {
          if (e instanceof Enemy && !e.dead && lit(e.body.position)) e.dead = true;
        }
        break;
      }
      case 'spire': {
        const s = T.spire;
        const beams = this.beams(c, s.beams, s.length, s.turnRadPerSec);
        if (beams.some((b) => distToSegment(p, c, b) < s.width + (this.player.body.circleRadius ?? 0))) {
          this.combat.hurtPlayer(s.damage);
        }
        break;
      }
      case 'grotto':
        break;
      case 'bloom': {
        const b = T.bloom;
        if (!this.bloomOpen) {
          if (d < r) this.combat.hurtPlayer(b.thornDamage);
          break;
        }
        const cycle = Math.floor(this.timeMs / (b.closedMs + b.openMs));
        if (d < b.coreRadius && cycle !== this.bloomHarvestedCycle) {
          this.bloomHarvestedCycle = cycle;
          this.stats.bloomHarvests++;
          this.player.health.heal(this.player.health.maxHp);
          this.award(b.coins);
          this.banner(`NECTAR · FULL HEAL · +${b.coins} COINS`);
        }
        break;
      }
      case 'array': {
        const a = T.array;
        if (this.timeMs < this.overdriveUntilMs) break;
        if (d < a.chargeRadius) this.arrayCharge = Math.min(1, this.arrayCharge + dtMs / a.chargeMs);
        if (this.arrayCharge >= 1) {
          this.arrayCharge = 0;
          this.overdriveUntilMs = this.timeMs + a.overdriveMs;
          this.award(a.coins);
          this.banner(`OVERDRIVE · +${Math.round((a.overdrive - 1) * 100)}% LAUNCH · +${a.coins} COINS`);
        }
        break;
      }
      case 'palace': {
        const pl = T.palace;
        // No enemies allowed in the palace grounds.
        for (const e of this.registry.all()) {
          if (!(e instanceof Enemy) || e.dead) continue;
          const q = e.body.position;
          const ed = Math.hypot(q.x - c.x, q.y - c.y);
          if (ed >= pl.safeRadius || ed === 0) continue;
          const ux = (q.x - c.x) / ed;
          const uy = (q.y - c.y) / ed;
          const v = e.body.velocity;
          Body.setVelocity(e.body, { x: v.x + ux * pl.enemyPush, y: v.y + uy * pl.enemyPush });
        }
        if (d < pl.pearlRadius && this.pearlReady) {
          this.pearlReadyAtMs = this.timeMs + pl.pearlRespawnMs;
          this.award(pl.pearlCoins);
          this.banner(`PEARL CLAIMED · +${pl.pearlCoins} COINS`);
        }
        break;
      }
    }
  }

  /** The Sun's pull on the player at a point (zero elsewhere). Pure; used for trajectory prediction. */
  accelAt(p: Vec2): Vec2 {
    const lm = this.world.landmark;
    if (!lm || lm.landmark?.id !== 'sun') return { x: 0, y: 0 };
    const s = T.sun;
    const r = lm.landmark.radius;
    const c = lm.body.position;
    const reach = r * s.pullScale;
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= reach || d === 0) return { x: 0, y: 0 };
    const k = Math.min(1, (reach - d) / (reach - r));
    return { x: (dx / d) * s.pullStrength * k, y: (dy / d) * s.pullStrength * k };
  }

  /** End points of evenly spaced rotating beams. */
  beams(c: Vec2, count: number, length: number, turnRadPerSec: number): Vec2[] {
    const base = this.beamAngle(turnRadPerSec);
    return Array.from({ length: count }, (_, i) => {
      const a = base + (i / count) * Math.PI * 2;
      return { x: c.x + Math.cos(a) * length, y: c.y + Math.sin(a) * length };
    });
  }

  /** Gems always; health packs too once the Magnet upgrade extends reach past touching. */
  private collectGems(): void {
    const p = this.player.body.position;
    const magnet = this.pickupReach();
    const reach = (this.player.body.circleRadius ?? 0) + T.gem.radius + T.gem.pickupPadding + magnet;
    const hp = this.player.health;
    for (const e of this.registry.all()) {
      if (!(e instanceof Obstacle) || e.dead) continue;
      const isGem = e.type === 'gem';
      const isPack = e.type === 'health' && magnet > 0 && hp.hp < hp.maxHp;
      if (!isGem && !isPack) continue;
      const q = e.body.position;
      if (Math.abs(q.x - p.x) > reach || Math.abs(q.y - p.y) > reach) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) > reach) continue;
      e.dead = true;
      if (isGem) {
        this.award(e.coins);
        this.stats.gemsCollected++;
      }
      else hp.heal(this.healthPackHeal);
    }
  }

  private award(coins: number): void {
    this.stats.bonusCoins += this.save.addCoins(coins);
  }

  private banner(text: string): void {
    this.stats.banner = { text, untilMs: this.clock.now() + 2500 };
  }

  private nudge(body: Matter.Body, toward: Vec2, a: number): void {
    const dx = toward.x - body.position.x;
    const dy = toward.y - body.position.y;
    const len = Math.hypot(dx, dy) || 1;
    const v = body.velocity;
    Body.setVelocity(body, { x: v.x + (dx / len) * a, y: v.y + (dy / len) * a });
  }

  dispose(): void {}
}
