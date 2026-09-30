import Matter from 'matter-js';
import { clampLength } from '../core/launchMath';
import type { Vec2 } from '../core/types';

const { Body } = Matter;

/** Adds `accel` px/step toward `target` (plus optional extra), then caps speed. */
export function steer(body: Matter.Body, target: Vec2, accel: number, maxSpeed: number, extra?: Vec2): void {
  const dx = target.x - body.position.x;
  const dy = target.y - body.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const v = Body.getVelocity(body);
  Body.setVelocity(
    body,
    clampLength(
      { x: v.x + (dx / len) * accel + (extra?.x ?? 0), y: v.y + (dy / len) * accel + (extra?.y ?? 0) },
      maxSpeed,
    ),
  );
}
