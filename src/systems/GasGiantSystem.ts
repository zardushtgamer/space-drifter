import Matter from 'matter-js';
import type { GameConfig } from '../config/gameConfig';
import type { Vec2 } from '../core/types';
import { Enemy } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { ISystem } from './ISystem';
import type { WorldSystem } from './WorldSystem';

const { Body } = Matter;

/**
 * The current dimension's gas giant. Outside it, gravity reaches far and pulls
 * you in; inside the atmosphere the gas drags on you and keeps pulling you down,
 * so escaping takes several launches straight outward. The core crushes.
 */
export class GasGiantSystem implements ISystem {
  /** 0 outside, 0..1 how deep into the atmosphere the player is (for the HUD). */
  depth = 0;
  /** 0..1 pull felt while outside the atmosphere but within reach. */
  approach = 0;

  constructor(
    private readonly world: WorldSystem,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly config: GameConfig,
  ) {}

  update(): void {
    this.depth = 0;
    this.approach = 0;
    const giant = this.world.gasGiant;
    if (!giant) return;
    const g = this.config.gasGiant;

    const apply = (body: Matter.Body, factor: number): { d: number; inside: boolean } | null => {
      const e = this.effectAt(body.position);
      if (!e) return null;
      const v = body.velocity;
      Body.setVelocity(body, { x: v.x * e.drag + e.ax * factor, y: v.y * e.drag + e.ay * factor });
      return { d: e.d, inside: e.d < g.radius };
    };

    const hit = apply(this.player.body, 1);
    if (hit) {
      if (hit.inside) {
        this.depth = 1 - hit.d / g.radius;
        if (hit.d < g.coreRadius) this.combat.hurtPlayer(g.coreDamage);
      } else {
        const reach = g.radius * g.reachScale;
        this.approach = (reach - hit.d) / (reach - g.radius);
      }
    }
    for (const e of this.registry.all()) {
      if (e instanceof Enemy && !e.dead) apply(e.body, g.enemyPullFactor);
    }
  }

  /**
   * Pull (px/step per step) and velocity drag the gas giant applies at a point,
   * or null outside its reach. Pure: also used for trajectory prediction.
   */
  effectAt(p: Vec2): { ax: number; ay: number; drag: number; d: number } | null {
    const giant = this.world.gasGiant;
    if (!giant) return null;
    const g = this.config.gasGiant;
    const c = giant.body.position;
    const reach = g.radius * g.reachScale;
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= reach || d === 0) return null;
    const inside = d < g.radius;
    const pull = inside
      ? g.innerPull + g.corePullExtra * (1 - d / g.radius)
      : g.outerPull * ((reach - d) / (reach - g.radius));
    return { ax: (dx / d) * pull, ay: (dy / d) * pull, drag: inside ? g.drag : 1, d };
  }

  dispose(): void {}
}
