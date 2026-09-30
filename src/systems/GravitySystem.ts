import Matter from 'matter-js';
import type { GameConfig } from '../config/gameConfig';
import type { TimeScale } from '../core/TimeScale';
import type { Vec2 } from '../core/types';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { ISystem } from './ISystem';
import type { Wormhole } from './Wormhole';

const { Body } = Matter;

/**
 * Summed pull of the wells at a point, px/step per step: full strength at a
 * well's surface, fading linearly to 0 at the edge of its reach. Pure.
 */
export function accelFromWells(p: Vec2, wells: readonly Well[], factor = 1, blackHolesOnly = false): Vec2 {
  let ax = 0;
  let ay = 0;
  for (const w of wells) {
    if (blackHolesOnly && !w.blackHole) continue;
    const dx = w.pos.x - p.x;
    const dy = w.pos.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= w.reach || d === 0) continue;
    const falloff = Math.min(1, (w.reach - d) / (w.reach - w.radius));
    ax += (dx / d) * w.strength * falloff * factor;
    ay += (dy / d) * w.strength * falloff * factor;
  }
  return { x: ax, y: ay };
}

export interface Well {
  pos: Vec2;
  radius: number;
  reach: number;
  strength: number;
  blackHole: boolean;
  rift: boolean;
  entity: Obstacle;
}

/**
 * Gravity wells. Planets pull the player; black holes pull the player and
 * enemies much harder, dilate time nearby, swallow enemies, and wormhole the
 * player when it crosses the horizon.
 */
export class GravitySystem implements ISystem {
  /** 0..1, how deep the player is in a black hole's field (for the HUD). */
  dilation = 0;

  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly wormhole: Wormhole,
    private readonly timeScale: TimeScale,
    private readonly config: GameConfig,
  ) {}

  update(dtMs: number): void {
    this.wormhole.tick(dtMs);
    const wells = this.wells();
    const bh = this.config.blackHoles;
    this.dilation = 0;

    const p = this.player.body.position;
    for (const w of wells) {
      const d = Math.hypot(w.pos.x - p.x, w.pos.y - p.y);
      const swallow = w.rift ? this.config.rifts.swallowScale : bh.swallowScale;
      if (w.blackHole && d < w.radius * swallow && this.wormhole.ready) {
        if (w.rift) this.wormhole.enterRift(w.entity);
        else this.wormhole.warp(w.entity);
        this.dilation = 0;
        this.timeScale.value = 1;
        return;
      }
      if (w.blackHole && d < w.reach) this.dilation = Math.max(this.dilation, 1 - (d - w.radius) / (w.reach - w.radius));
    }
    this.pull(this.player.body, wells, 1, false);
    this.timeScale.value = 1 - Math.min(1, this.dilation) * (1 - bh.minTimeScale);

    const blackHoles = wells.filter((w) => w.blackHole);
    if (blackHoles.length === 0) return;
    for (const e of this.registry.all()) {
      if (!(e instanceof Enemy) || e.dead) continue;
      this.pull(e.body, blackHoles, bh.enemyPullFactor, true);
      const q = e.body.position;
      if (blackHoles.some((w) => Math.hypot(w.pos.x - q.x, w.pos.y - q.y) < w.radius)) e.dead = true;
    }
  }

  private wells(): Well[] {
    const out: Well[] = [];
    for (const e of this.registry.all()) {
      if (!(e instanceof Obstacle)) continue;
      const radius = e.body.circleRadius ?? 0;
      if (e.type === 'repulsor') {
        // Anti-gravity: a negative-strength planet.
        const rp = this.config.hazards.repulsor;
        out.push({
          pos: e.body.position,
          radius,
          reach: radius * rp.pushRadiusScale,
          strength: -rp.pushStrength,
          blackHole: false,
          rift: false,
          entity: e,
        });
        continue;
      }
      if (e.type !== 'planet' && e.type !== 'blackhole' && e.type !== 'rift') continue;
      const c =
        e.type === 'planet' ? this.config.planets
        : e.type === 'rift' ? this.config.rifts
        : this.config.blackHoles;
      out.push({
        pos: e.body.position,
        radius,
        reach: radius * c.pullRadiusScale,
        strength: c.pullStrength,
        // Rifts behave like black holes (dilation, swallowing enemies) apart from where they lead.
        blackHole: e.type !== 'planet',
        rift: e.type === 'rift',
        entity: e,
      });
    }
    return out;
  }

  /** Adds each well's pull to a body. */
  private pull(body: Matter.Body, wells: readonly Well[], factor: number, blackHolesOnly: boolean): void {
    const a = accelFromWells(body.position, wells, factor, blackHolesOnly);
    if (a.x === 0 && a.y === 0) return;
    const v = body.velocity;
    Body.setVelocity(body, { x: v.x + a.x, y: v.y + a.y });
  }

  /** Current wells, for trajectory prediction (see TrajectoryPredictor). */
  snapshotWells(): Well[] {
    return this.wells();
  }

  dispose(): void {
    this.timeScale.value = 1;
  }
}
