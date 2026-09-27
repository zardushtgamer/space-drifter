import Matter from 'matter-js';
import { Health } from '../components/Health';
import type { GameConfig } from '../config/gameConfig';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { Vec2 } from '../core/types';
import type { Entity } from '../entities/Entity';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Player } from '../entities/Player';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

const { Bodies } = Matter;

/** The only place that creates Matter bodies for entities. */
export class EntityFactory {
  constructor(
    private readonly physics: PhysicsWorld,
    private readonly registry: EntityRegistry,
    private readonly bus: EventBus<EventMap>,
    private readonly config: GameConfig,
  ) {}

  createPlayer(position: Vec2): Player {
    const c = this.config.player;
    const body = Bodies.circle(position.x, position.y, c.radius, {
      label: 'player',
      density: c.density,
      frictionAir: c.frictionAir,
      restitution: c.restitution,
      friction: c.friction,
      frictionStatic: c.frictionStatic,
      collisionFilter: { category: this.config.collision.player },
    });
    const health = new Health(c.maxHp, (hp, maxHp) => this.bus.emit('player:damaged', { hp, maxHp }));
    return this.register(new Player(body, health));
  }

  destroy(entity: Entity): void {
    this.physics.remove(entity.body);
    this.registry.remove(entity);
  }

  private register<T extends Entity>(entity: T): T {
    this.physics.add(entity.body);
    this.registry.add(entity);
    return entity;
  }
}
