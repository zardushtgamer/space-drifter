import type Matter from 'matter-js';
import type { DimensionId, HazardType } from '../config/dimensions';
import type { LandmarkDef } from '../config/landmarks';
import type { Entity } from './Entity';

export type ObstacleType =
  | 'rock'
  | 'mine'
  | 'health'
  | 'planet'
  | 'blackhole'
  | 'rift'
  | 'ton618'
  | 'cavewall'
  | 'landmark'
  | 'gem'
  | 'gasgiant'
  | HazardType;

/** Non-solid obstacles the player passes through. */
export const SENSOR_OBSTACLES: ReadonlySet<ObstacleType> = new Set([
  'health',
  'blackhole',
  'rift',
  'ton618',
  'gem',
  'lava',
  'acid',
  'current',
  'frost',
  'boost',
]);

/**
 * Rocks are pushable debris; mines are static and explode on the player;
 * health packs are non-solid pickups that heal the player; planets are
 * static and pull the player in with gravity; black holes pull much harder
 * and wormhole the player away when it crosses the horizon; rifts (dimension
 * holes) carry the player to another dimension. Hazards are area-specific
 * (see gameConfig.hazards).
 */
export class Obstacle implements Entity {
  readonly kind = 'obstacle' as const;
  dead = false;
  /** Black holes only: the partner this one's wormhole leads to (and back). */
  link: Obstacle | null = null;
  /** Rifts only: the dimension this hole leads to. */
  destination: DimensionId | null = null;
  /** Landmarks only: which one this is. */
  landmark: LandmarkDef | null = null;
  /** Gems only: coins it's worth. */
  coins = 0;
  drawRadius?: number;
  drawBehind?: boolean;

  constructor(
    readonly body: Matter.Body,
    readonly type: ObstacleType,
    /** Chunk that spawned it; unloading the chunk removes it. */
    readonly chunkKey: string,
    /** Rock outline as radius multipliers, so each rock looks different. */
    readonly shape: readonly number[],
    /** Base hue (0-360) for planets. */
    readonly hue: number,
    /** Planets only: whether it has a ring. */
    readonly ringed: boolean,
  ) {}

  get id(): number {
    return this.body.id;
  }
}
