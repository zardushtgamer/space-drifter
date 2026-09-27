import type { Vec2 } from './types';

export interface HpPayload {
  hp: number;
  maxHp: number;
}

export interface GameEndPayload {
  timeMs: number;
}

export interface EventMap {
  'game:started': undefined;
  'game:won': GameEndPayload;
  'game:lost': GameEndPayload;
  'player:damaged': HpPayload;
  'boss:damaged': HpPayload;
  'player:launched': { force: number };
  'obstacle:hit': { id: number };
  'drag:start': { from: Vec2 };
  'drag:update': { from: Vec2; to: Vec2 };
  'drag:end': undefined;
}
