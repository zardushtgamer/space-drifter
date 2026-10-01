import type Matter from 'matter-js';
import type { Health } from '../components/Health';
import type { BallSkin } from '../config/cosmetics';
import type { Vec2 } from '../core/types';
import type { Entity } from './Entity';

/** A bot pilot's identity and score, kept across respawns. */
export interface BotProfile {
  readonly name: string;
  readonly skin: BallSkin;
  /** Main color (name tag, trail, kill effect). */
  readonly color: string;
  kos: number;
  deaths: number;
}

/** An AI pilot in Multiplayer (Bots): a ball like yours that launches and rams. */
export class Bot implements Entity {
  readonly kind = 'bot' as const;
  dead = false;
  hitAtMs?: number;
  /** AI timers (game ms). */
  nextLaunchMs = 0;
  retargetAtMs = 0;
  targetId: number | null = null;
  /** Who hit it last, and when (for KO credit). */
  lastHitBy: Entity | null = null;
  lastHitAtMs = -Infinity;
  /** Recent positions for its trail. */
  readonly trail: Vec2[] = [];

  constructor(
    readonly body: Matter.Body,
    readonly health: Health,
    readonly profile: BotProfile,
  ) {}

  get id(): number {
    return this.body.id;
  }
}
