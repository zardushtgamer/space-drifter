import type Matter from 'matter-js';
import type { IUpdatable } from '../core/types';

export type EntityKind = 'player' | 'boss' | 'obstacle';

export interface Entity extends Partial<IUpdatable> {
  readonly id: number;
  readonly kind: EntityKind;
  readonly body: Matter.Body;
}
