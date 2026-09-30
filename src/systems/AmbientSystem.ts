import Matter from 'matter-js';
import type { DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { ISystem } from './ISystem';

const { Body } = Matter;

const DEG = Math.PI / 180;

/**
 * Area-wide mechanics that make the newer dimensions play differently:
 * - Toxic Bloom: acid pools drift around like gas clouds.
 * - Solar Storm: a solar wind pushes everything, changing direction now and then.
 * - Nebula Reef: currents carry the player and enemies along.
 */
export class AmbientSystem implements ISystem {
  /** Current solar wind direction, radians (read by the drawer). */
  windAngle = 0;
  private windTarget = 0;
  private windTimerMs = 0;

  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly dimension: DimensionState,
    private readonly config: GameConfig,
    private readonly random: () => number = Math.random,
  ) {}

  update(dtMs: number): void {
    switch (this.dimension.current) {
      case 'toxic':
        return this.driftAcid();
      case 'solar':
        return this.blowWind(dtMs);
      case 'reef':
        return this.flowCurrents();
    }
  }

  private driftAcid(): void {
    const speed = this.config.ambient.acidDriftSpeed;
    for (const e of this.registry.all()) {
      if (!(e instanceof Obstacle) || e.type !== 'acid') continue;
      // Each cloud wanders along its own slowly turning heading.
      const a = e.hue * DEG + Math.sin(e.body.position.x / 400 + e.id) * 0.8;
      Body.setPosition(e.body, {
        x: e.body.position.x + Math.cos(a) * speed,
        y: e.body.position.y + Math.sin(a) * speed,
      });
    }
  }

  private blowWind(dtMs: number): void {
    const c = this.config.ambient;
    this.windTimerMs += dtMs;
    if (this.windTimerMs >= c.solarWindChangeMs) {
      this.windTimerMs = 0;
      this.windTarget = this.random() * Math.PI * 2;
    }
    // Turn smoothly toward the target the short way round.
    let diff = this.windTarget - this.windAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.windAngle += Math.max(-c.solarWindTurnRate, Math.min(c.solarWindTurnRate, diff));

    const wx = Math.cos(this.windAngle) * c.solarWindStrength;
    const wy = Math.sin(this.windAngle) * c.solarWindStrength;
    this.push(this.player.body, wx, wy);
    for (const e of this.registry.all()) if (e instanceof Enemy && !e.dead) this.push(e.body, wx, wy);
  }

  private flowCurrents(): void {
    const push = this.config.hazards.current.push;
    const currents: Obstacle[] = [];
    for (const e of this.registry.all()) if (e instanceof Obstacle && e.type === 'current') currents.push(e);
    if (currents.length === 0) return;

    const carry = (body: Matter.Body) => {
      for (const c of currents) {
        const r = c.body.circleRadius ?? 0;
        const dx = body.position.x - c.body.position.x;
        const dy = body.position.y - c.body.position.y;
        if (dx * dx + dy * dy > r * r) continue;
        this.push(body, Math.cos(c.hue * DEG) * push, Math.sin(c.hue * DEG) * push);
      }
    };
    carry(this.player.body);
    for (const e of this.registry.all()) if (e instanceof Enemy && !e.dead) carry(e.body);
  }

  /**
   * A frozen copy of the ambient forces on the player (solar wind, reef currents)
   * as a function of position. Used for trajectory prediction.
   */
  fieldSnapshot(): (x: number, y: number) => { x: number; y: number } {
    const id = this.dimension.current;
    if (id === 'solar') {
      const s = this.config.ambient.solarWindStrength;
      const w = { x: Math.cos(this.windAngle) * s, y: Math.sin(this.windAngle) * s };
      return () => w;
    }
    if (id === 'reef') {
      const push = this.config.hazards.current.push;
      const currents: Array<{ x: number; y: number; r2: number; ax: number; ay: number }> = [];
      for (const e of this.registry.all()) {
        if (!(e instanceof Obstacle) || e.type !== 'current') continue;
        const r = e.body.circleRadius ?? 0;
        currents.push({
          x: e.body.position.x,
          y: e.body.position.y,
          r2: r * r,
          ax: Math.cos(e.hue * DEG) * push,
          ay: Math.sin(e.hue * DEG) * push,
        });
      }
      return (x, y) => {
        let ax = 0;
        let ay = 0;
        for (const c of currents) {
          if ((x - c.x) ** 2 + (y - c.y) ** 2 > c.r2) continue;
          ax += c.ax;
          ay += c.ay;
        }
        return { x: ax, y: ay };
      };
    }
    const zero = { x: 0, y: 0 };
    return () => zero;
  }

  private push(body: Matter.Body, ax: number, ay: number): void {
    const v = body.velocity;
    Body.setVelocity(body, { x: v.x + ax, y: v.y + ay });
  }

  dispose(): void {}
}
