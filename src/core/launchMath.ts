import type { Vec2 } from './types';

export interface LaunchParams {
  maxDrag: number;
  forceScale: number;
  maxSpeed: number;
}

export interface LaunchResult {
  /** New velocity in px/step. */
  velocity: Vec2;
  /** Drag strength, 0..1 of maxDrag. */
  force: number;
}

export function clampLength(v: Vec2, max: number): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len <= max || len === 0) return { x: v.x, y: v.y };
  const s = max / len;
  return { x: v.x * s, y: v.y * s };
}

/** Drag vector (release - start), clamped to maxDrag. */
export function dragVector(from: Vec2, to: Vec2, maxDrag: number): Vec2 {
  return clampLength({ x: to.x - from.x, y: to.y - from.y }, maxDrag);
}

export function computeLaunch(current: Vec2, from: Vec2, to: Vec2, p: LaunchParams): LaunchResult {
  const drag = dragVector(from, to, p.maxDrag);
  const velocity = clampLength(
    { x: current.x + drag.x * p.forceScale, y: current.y + drag.y * p.forceScale },
    p.maxSpeed,
  );
  return { velocity, force: Math.hypot(drag.x, drag.y) / p.maxDrag };
}
