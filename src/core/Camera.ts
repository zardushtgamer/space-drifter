import type { IClock } from './Clock';
import type { Vec2 } from './types';
import type { Viewport } from './Viewport';

/** Follows a world point; world coordinates are CSS px, unbounded. */
export class Camera {
  /** World position at the screen center. */
  x = 0;
  y = 0;
  private shakeUntil = 0;
  private shakeMs = 0;
  private shakeMag = 0;

  constructor(
    private readonly viewport: Viewport,
    private readonly clock: IClock,
  ) {}

  snap(target: Vec2): void {
    this.x = target.x;
    this.y = target.y;
  }

  follow(target: Vec2, lerp: number): void {
    this.x += (target.x - this.x) * lerp;
    this.y += (target.y - this.y) * lerp;
  }

  shake(durationMs: number, magnitude: number): void {
    const now = this.clock.now();
    // Keep the stronger of an ongoing and a new shake.
    if (now < this.shakeUntil && magnitude < this.shakeMag) return;
    this.shakeUntil = now + durationMs;
    this.shakeMs = durationMs;
    this.shakeMag = magnitude;
  }

  /** World position of the screen's top-left corner, including shake. */
  topLeft(nowMs: number): Vec2 {
    let ox = 0;
    let oy = 0;
    if (nowMs < this.shakeUntil) {
      const m = this.shakeMag * ((this.shakeUntil - nowMs) / this.shakeMs);
      ox = (Math.random() * 2 - 1) * m;
      oy = (Math.random() * 2 - 1) * m;
    }
    return { x: this.x - this.viewport.width / 2 + ox, y: this.y - this.viewport.height / 2 + oy };
  }
}
