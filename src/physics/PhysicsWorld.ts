import Matter from 'matter-js';
import type { GameConfig } from '../config/gameConfig';
import type { IDisposable, Vec2 } from '../core/types';

const { Bodies, Body, Composite, Engine, Events } = Matter;

export type CollisionEventName = 'collisionStart' | 'collisionActive' | 'collisionEnd';
export type CollisionHandler = (pairs: readonly Matter.Pair[]) => void;

const WALL_LABEL = 'wall';

/**
 * Wraps the Matter engine. Owns walls and records pre-step velocities,
 * because Matter fires collision events after resolving them.
 */
export class PhysicsWorld implements IDisposable {
  readonly engine: Matter.Engine;
  private walls: Matter.Body[] = [];
  private readonly preStepVelocity = new Map<number, Vec2>();
  private readonly subscriptions: Array<() => void> = [];

  constructor(private readonly config: GameConfig) {
    this.engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    // Belt and braces: the spec wants all three zeroed explicitly.
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 0;
    this.engine.gravity.scale = 0;

    const record = () => {
      this.preStepVelocity.clear();
      for (const body of Composite.allBodies(this.engine.world)) {
        if (!body.isStatic) this.preStepVelocity.set(body.id, Body.getVelocity(body));
      }
    };
    Events.on(this.engine, 'beforeUpdate', record);
    this.subscriptions.push(() => Events.off(this.engine, 'beforeUpdate', record));
  }

  add(body: Matter.Body): void {
    Composite.add(this.engine.world, body);
  }

  remove(body: Matter.Body): void {
    Composite.remove(this.engine.world, body);
    this.preStepVelocity.delete(body.id);
  }

  step(dtMs: number): void {
    Engine.update(this.engine, dtMs);
  }

  /** Velocity (px/step) a body had before the most recent step. */
  velocityBeforeStep(body: Matter.Body): Vec2 {
    return this.preStepVelocity.get(body.id) ?? Body.getVelocity(body);
  }

  onCollision(event: CollisionEventName, handler: CollisionHandler): () => void {
    // @types/matter-js only narrows the event type for literal names, so widen here.
    const listener = (e: Matter.IEvent<Matter.Engine>) =>
      handler((e as Matter.IEventCollision<Matter.Engine>).pairs);
    Events.on(this.engine, event, listener);
    const off = () => Events.off(this.engine, event, listener);
    this.subscriptions.push(off);
    return off;
  }

  /** Rebuilds walls just outside the viewport and pulls stray bodies back inside. */
  setBounds(width: number, height: number): void {
    for (const wall of this.walls) Composite.remove(this.engine.world, wall);

    const t = this.config.physics.wallThickness;
    const opts: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      label: WALL_LABEL,
      restitution: this.config.physics.wallRestitution,
      friction: 0,
      frictionStatic: 0,
      collisionFilter: { category: this.config.collision.wall },
    };
    this.walls = [
      Bodies.rectangle(width / 2, -t / 2, width + 2 * t, t, opts),
      Bodies.rectangle(width / 2, height + t / 2, width + 2 * t, t, opts),
      Bodies.rectangle(-t / 2, height / 2, t, height + 2 * t, opts),
      Bodies.rectangle(width + t / 2, height / 2, t, height + 2 * t, opts),
    ];
    Composite.add(this.engine.world, this.walls);

    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.isStatic) continue;
      const r = body.circleRadius ?? 0;
      const x = Math.min(Math.max(body.position.x, r), Math.max(r, width - r));
      const y = Math.min(Math.max(body.position.y, r), Math.max(r, height - r));
      if (x !== body.position.x || y !== body.position.y) Body.setPosition(body, { x, y });
    }
  }

  dispose(): void {
    for (const off of this.subscriptions) off();
    this.subscriptions.length = 0;
    Composite.clear(this.engine.world, false, true);
    Engine.clear(this.engine);
    this.walls = [];
    this.preStepVelocity.clear();
  }
}
