import Matter from 'matter-js';
import { Health } from '../components/Health';
import type { GameConfig } from '../config/gameConfig';
import { LANDMARK_TUNING, type LandmarkDef } from '../config/landmarks';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { Vec2 } from '../core/types';
import { Boss, type FireFn } from '../entities/Boss';
import { Bot, type BotProfile } from '../entities/Bot';
import { Enemy, type EnemyType } from '../entities/Enemy';
import type { Entity } from '../entities/Entity';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle, SENSOR_OBSTACLES, type ObstacleType } from '../entities/Obstacle';
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

  createPlayer(position: Vec2, maxHpBonus = 0): Player {
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
    const health = new Health(c.maxHp + maxHpBonus, (hp, maxHp) => this.bus.emit('player:damaged', { hp, maxHp }));
    return this.register(new Player(body, health));
  }

  /** A bot pilot: same body as the player. */
  createBot(position: Vec2, profile: BotProfile): Bot {
    const c = this.config.player;
    const body = Bodies.circle(position.x, position.y, c.radius, {
      label: 'bot',
      density: c.density,
      frictionAir: c.frictionAir,
      restitution: c.restitution,
      friction: c.friction,
      frictionStatic: c.frictionStatic,
      collisionFilter: { category: this.config.collision.player },
    });
    return this.register(new Bot(body, new Health(c.maxHp), profile));
  }

  createEnemy(position: Vec2, type: EnemyType, target: Entity, fire: FireFn | null = null): Enemy {
    const c = this.config.enemyTypes[type];
    const body = Bodies.circle(position.x, position.y, c.radius, {
      label: 'enemy',
      density: c.density,
      frictionAir: c.frictionAir,
      restitution: c.restitution,
      friction: 0,
      collisionFilter: { category: this.config.collision.enemy },
    });
    return this.register(new Enemy(body, new Health(c.maxHp), type, c, target, fire));
  }

  createBoss(position: Vec2, level: number, target: Entity, fire: FireFn): Boss {
    const c = this.config.boss;
    const body = Bodies.circle(position.x, position.y, c.radius, {
      label: 'boss',
      density: c.density,
      frictionAir: c.frictionAir,
      restitution: c.restitution,
      friction: 0,
      collisionFilter: { category: this.config.collision.boss },
    });
    const maxHp = Math.round(c.maxHp * (1 + (level - 1) * c.hpPerLevel));
    const health = new Health(maxHp, (hp, max) => this.bus.emit('boss:damaged', { hp, maxHp: max }));
    return this.register(new Boss(body, health, level, target, fire, c));
  }

  createObstacle(
    position: Vec2,
    radius: number,
    type: ObstacleType,
    chunkKey: string,
    random: () => number,
    hueRange: readonly [number, number] = [0, 360],
  ): Obstacle {
    const c = this.config.obstacles;
    const body = Bodies.circle(position.x, position.y, radius, {
      label: type,
      isStatic: type !== 'rock',
      isSensor: SENSOR_OBSTACLES.has(type),
      density: c.density,
      frictionAir: c.frictionAir,
      restitution: type === 'planet' ? this.config.planets.restitution : c.restitution,
      friction: c.friction,
      collisionFilter: { category: this.config.collision.obstacle },
    });
    const shape = Array.from({ length: 9 }, () => 0.8 + random() * 0.25);
    const hue = (hueRange[0] + random() * (hueRange[1] - hueRange[0])) % 360;
    const ringed = random() < 0.4;
    return this.register(new Obstacle(body, type, chunkKey, shape, hue, ringed));
  }

  destroy(entity: Entity): void {
    this.physics.remove(entity.body);
    this.registry.remove(entity);
  }

  createLandmark(def: LandmarkDef): Obstacle {
    const body = Bodies.circle(def.position.x, def.position.y, def.radius, {
      label: 'landmark',
      isStatic: true,
      isSensor: !def.solid,
      restitution: 0.8,
      friction: 0,
      collisionFilter: { category: this.config.collision.obstacle },
    });
    const o = this.register(new Obstacle(body, 'landmark', `landmark:${def.id}`, [], 0, false));
    o.landmark = def;
    // Beams, auras and fields reach well past the body.
    o.drawRadius = Math.max(def.clearRadius, LANDMARK_TUNING.lighthouse.length) + 100;
    o.drawBehind = true;
    return o;
  }

  /**
   * A gas giant. Its body collides with nothing (mask 0): it's far too big for
   * Matter to handle as a sensor, and GasGiantSystem does all its physics.
   */
  createGasGiant(position: Vec2, hue: number, random: () => number): Obstacle {
    const g = this.config.gasGiant;
    const body = Bodies.circle(position.x, position.y, g.radius, {
      label: 'gasgiant',
      isStatic: true,
      isSensor: true,
      collisionFilter: { category: this.config.collision.obstacle, mask: 0 },
    });
    const shape = Array.from({ length: 9 }, () => 0.8 + random() * 0.25);
    const o = this.register(new Obstacle(body, 'gasgiant', 'gasgiant', shape, hue, random() < 0.5));
    o.drawRadius = g.radius * g.reachScale;
    o.drawBehind = true;
    return o;
  }

  createGem(position: Vec2, coins: number, chunkKey: string, random: () => number): Obstacle {
    const gem = this.createObstacle(position, LANDMARK_TUNING.gem.radius, 'gem', chunkKey, random);
    gem.coins = coins;
    return gem;
  }

  /** A solid rectangular slab of cave rock (x, y is its top-left corner). */
  createCaveWall(x: number, y: number, w: number, h: number, chunkKey: string): Obstacle {
    const body = Bodies.rectangle(x + w / 2, y + h / 2, w, h, {
      label: 'cavewall',
      isStatic: true,
      restitution: this.config.caves.restitution,
      friction: 0,
      frictionStatic: 0,
      collisionFilter: { category: this.config.collision.obstacle },
    });
    return this.register(new Obstacle(body, 'cavewall', chunkKey, [], 0, false));
  }

  /** Re-adds an entity previously removed with `destroy` (e.g. a stashed wormhole). */
  restore<T extends Entity>(entity: T): T {
    return this.register(entity);
  }

  private register<T extends Entity>(entity: T): T {
    this.physics.add(entity.body);
    this.registry.add(entity);
    return entity;
  }
}
