import Matter from 'matter-js';
import { DIMENSIONS, pickOtherDimension, type DimensionId, type DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import type { Camera } from '../core/Camera';
import type { IClock } from '../core/Clock';
import type { RunStats } from '../core/RunStats';
import type { Vec2 } from '../core/types';
import type { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { EntityFactory } from '../factories/EntityFactory';
import type { CombatSystem } from './CombatSystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { WorldSystem } from './WorldSystem';

const { Body } = Matter;

/**
 * Black holes come in linked pairs. Falling into one for the first time
 * creates its partner far away; after that the two lead to each other.
 * Linked holes are pinned so they persist for the whole run.
 */
export class Wormhole {
  /** Render-clock time of the last jump, for the hyperspace effect. */
  lastWarpAtMs = -Infinity;
  /** Game time (ms) until which wormholes ignore the player. */
  private cooldownUntilMs = 0;
  private timeMs = 0;

  constructor(
    private readonly player: Player,
    private readonly camera: Camera,
    private readonly combat: CombatSystem,
    private readonly projectiles: ProjectileSystem,
    private readonly factory: EntityFactory,
    private readonly world: WorldSystem,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly config: GameConfig,
    private readonly dimension: DimensionState,
    private readonly random: () => number = Math.random,
  ) {}

  /** Advance game time; called by GravitySystem each step. */
  tick(dtMs: number): void {
    this.timeMs += dtMs;
  }

  get ready(): boolean {
    return this.timeMs >= this.cooldownUntilMs;
  }

  warp(entrance: Obstacle): void {
    if (!this.ready) return;
    const c = this.config.blackHoles;
    const exit = entrance.link ?? this.createPartner(entrance);

    // Pop out beside the partner, flung away from it so its pull can't recapture us.
    const a = this.random() * Math.PI * 2;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const reach = (exit.body.circleRadius ?? 0) * c.pullRadiusScale;
    const to = {
      x: exit.body.position.x + dir.x * reach * c.exitReachFraction,
      y: exit.body.position.y + dir.y * reach * c.exitReachFraction,
    };
    const from = { ...this.player.body.position };

    Body.setPosition(this.player.body, to);
    Body.setVelocity(this.player.body, { x: dir.x * c.exitSpeed, y: dir.y * c.exitSpeed });
    this.camera.snap(to);
    this.projectiles.bullets.length = 0;
    this.combat.grantInvulnerability(c.invulnMs);
    this.cooldownUntilMs = this.timeMs + c.reentryCooldownMs;

    const now = this.clock.now();
    this.lastWarpAtMs = now;
    const ly = Math.round(Math.hypot(to.x - from.x, to.y - from.y) / this.config.economy.pxPerLy);
    this.stats.banner = { text: `WORMHOLE · ${ly} LY JUMP`, untilMs: now + c.warpFxMs + 800 };
    this.stats.wormholeJumps++;
  }

  /** A dimension hole leads to the area it's labelled with. */
  enterRift(rift: Obstacle): void {
    this.travelDimension(rift.destination ?? pickOtherDimension(this.dimension.current, this.random()));
  }

  /** Rift / pause-menu travel: regenerate the field around the player as another dimension. */
  travelDimension(to: DimensionId): void {
    const c = this.config.blackHoles;
    this.world.switchDimension(to);
    this.projectiles.bullets.length = 0;
    this.combat.grantInvulnerability(c.invulnMs);
    this.cooldownUntilMs = this.timeMs + c.reentryCooldownMs;
    const now = this.clock.now();
    this.lastWarpAtMs = now;
    this.stats.banner = { text: `ENTERING ${DIMENSIONS[to].name.toUpperCase()}`, untilMs: now + c.warpFxMs + 1200 };
  }

  private createPartner(entrance: Obstacle): Obstacle {
    const c = this.config.blackHoles;
    const a = this.random() * Math.PI * 2;
    const dist = c.warpMinDistance + this.random() * (c.warpMaxDistance - c.warpMinDistance);
    const at: Vec2 = {
      x: entrance.body.position.x + Math.cos(a) * dist,
      y: entrance.body.position.y + Math.sin(a) * dist,
    };
    const size = this.config.world.chunkSize;
    const chunkKey = `${Math.floor(at.x / size)},${Math.floor(at.y / size)}`;
    const partner = this.factory.createObstacle(at, c.radius, 'blackhole', chunkKey, this.random);

    entrance.link = partner;
    partner.link = entrance;
    this.world.pin(entrance);
    this.world.pin(partner);
    return partner;
  }
}
