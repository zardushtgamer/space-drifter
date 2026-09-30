import type { DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import type { Vec2 } from '../core/types';
import type { AmbientSystem } from './AmbientSystem';
import type { GasGiantSystem } from './GasGiantSystem';
import { accelFromWells, type GravitySystem } from './GravitySystem';
import type { LandmarkSystem } from './LandmarkSystem';
import type { Ton618System } from './Ton618System';

/**
 * Simulates where the player will drift if they don't launch again, using the
 * same forces the game applies: planet/black-hole wells, the Sun, TON 618,
 * gas giants (pull and drag), solar wind, reef currents and air friction.
 * Collisions aren't simulated, so the path goes straight through obstacles.
 */
export class TrajectoryPredictor {
  constructor(
    private readonly gravity: GravitySystem,
    private readonly gasGiant: GasGiantSystem,
    private readonly ton: Ton618System,
    private readonly landmarks: LandmarkSystem,
    private readonly ambient: AmbientSystem,
    private readonly dimension: DimensionState,
    private readonly config: GameConfig,
  ) {}

  /** Positions every `sampleEvery` steps for `steps` steps ahead. */
  predict(start: Vec2, velocity: Vec2, steps: number, sampleEvery: number): Vec2[] {
    const wells = this.gravity.snapshotWells();
    const field = this.ambient.fieldSnapshot();
    const friction = 1 - this.config.player.frictionAir;
    const scale = this.dimension.theme.playerSpeedScale ?? 1;
    const cap = scale < 1 ? this.config.launch.maxSpeed * scale : Infinity;

    let x = start.x;
    let y = start.y;
    let vx = velocity.x;
    let vy = velocity.y;
    const out: Vec2[] = [];
    for (let i = 1; i <= steps; i++) {
      const p = { x, y };
      const w = accelFromWells(p, wells);
      const t = this.ton.accelAt(p);
      const s = this.landmarks.accelAt(p);
      const f = field(x, y);
      vx += w.x + t.x + s.x + f.x;
      vy += w.y + t.y + s.y + f.y;
      const g = this.gasGiant.effectAt(p);
      if (g) {
        vx = vx * g.drag + g.ax;
        vy = vy * g.drag + g.ay;
      }
      vx *= friction;
      vy *= friction;
      const speed = Math.hypot(vx, vy);
      if (speed > cap) {
        vx = (vx / speed) * cap;
        vy = (vy / speed) * cap;
      }
      x += vx;
      y += vy;
      if (i % sampleEvery === 0) out.push({ x, y });
    }
    return out;
  }
}
