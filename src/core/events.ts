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
  'enemy:killed': { id: number; score: number; x: number; y: number; color: string; radius: number };
  'boss:spawned': { level: number };
  'boss:killed': { level: number; x: number; y: number };
  'round:cleared': { round: number };
  'level:up': { level: number };
  'drag:start': { from: Vec2 };
  'drag:update': { from: Vec2; to: Vec2 };
  'drag:end': undefined;
}
