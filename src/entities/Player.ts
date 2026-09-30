import type Matter from 'matter-js';
import type { Health } from '../components/Health';
import type { Entity } from './Entity';

export class Player implements Entity {
  readonly kind = 'player' as const;
  hitAtMs?: number;

  constructor(
    readonly body: Matter.Body,
    readonly health: Health,
  ) {}

  get id(): number {
    return this.body.id;
  }
}
