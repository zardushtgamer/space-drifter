import type Matter from 'matter-js';
import type { IUpdatable } from '../core/types';

export type EntityKind = 'player' | 'enemy' | 'boss' | 'obstacle';

export interface Entity extends Partial<IUpdatable> {
  readonly id: number;
  readonly kind: EntityKind;
  readonly body: Matter.Body;
  /** Set when the entity should be removed at the next sweep. */
  dead?: boolean;
  /** Time (ms, render clock) of the last hit, for the flash effect. */
  hitAtMs?: number;
  /** How far from its center it may draw, if beyond its body (so culling doesn't clip it). */
  drawRadius?: number;
  /** Draw behind everything else (gas giants, landmark auras). */
  drawBehind?: boolean;
}
