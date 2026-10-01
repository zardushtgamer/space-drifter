import { findBall, findTrail, MATH_SYMBOLS, resolveColor, type BallSkin, type CosmeticColor } from '../../config/cosmetics';
import type { GameConfig } from '../../config/gameConfig';
import { singularityStats } from '../../config/upgrades';
import type { SingularitySystem } from '../../systems/SingularitySystem';
import type { TrajectoryPredictor } from '../../systems/TrajectoryPredictor';

/** Afterimage lookahead: 1.5 s of simulated flight, a ghost every quarter second. */
const AHEAD_STEPS = 90;
const AHEAD_SAMPLE = 15;
import type { SaveData } from '../../core/SaveData';
import type { Vec2 } from '../../core/types';
import type { Entity } from '../../entities/Entity';
import type { IDrawer, RenderView } from '../IRenderer';
import { drawBall, drawEffect } from '../effects';
import { drawCube } from '../tesseract';
import { isFlashing } from './flash';

/** Draws the player with the equipped ball skin, trail and effect. */
export class PlayerDrawer implements IDrawer {
  /** Recent positions, oldest first. */
  private readonly trail: Vec2[] = [];
  /** Total points ever pushed, so each trail point keeps a stable identity as the buffer shifts. */
  private pushes = 0;

  constructor(
    private readonly config: GameConfig,
    private readonly save: SaveData,
    private readonly singularity?: SingularitySystem,
    private readonly predictor?: TrajectoryPredictor,
  ) {}

  draw(view: RenderView, entity: Entity): void {
    const { ctx, timeMs } = view;
    const { position, circleRadius: r = 0 } = entity.body;
    const ball = findBall(this.save.ball);

    this.trail.push({ x: position.x, y: position.y });
    this.pushes++;
    if (this.trail.length > this.config.effects.trailLength) this.trail.shift();
    const afterimage = findTrail(this.save.trail).style === 'afterimage';
    if (afterimage) this.drawAfterimages(ctx, ball, r, timeMs, entity.body.velocity, 'behind');
    else this.drawTrail(ctx, ball, r, timeMs);

    if (this.singularity?.enabled) this.drawSingularity(ctx, position, timeMs);

    const effect = this.save.effect;
    drawEffect(ctx, effect, position.x, position.y, r, timeMs, 'under');
    drawBall(ctx, ball, position.x, position.y, r, timeMs, this.config.effects.glowBlur, isFlashing(entity, timeMs, this.config));
    drawEffect(ctx, effect, position.x, position.y, r, timeMs, 'over');
    if (afterimage) this.drawAfterimages(ctx, ball, r, timeMs, entity.body.velocity, 'ahead');
  }

  /**
   * Afterimage trail: blue-tinted ghosts of the exact ball (pattern, ring and all).
   * 'behind' echoes where you've been; 'ahead' flickers where you're about to be.
   */
  private drawAfterimages(
    ctx: CanvasRenderingContext2D,
    ball: BallSkin,
    r: number,
    t: number,
    v: Vec2,
    side: 'behind' | 'ahead',
  ): void {
    const ghost = (x: number, y: number, alpha: number, scale: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBall(ctx, ball, x, y, r * scale, t, 0);
      // Blue wash and outline over the copy.
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.55)';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    if (side === 'behind') {
      // Every few frames along the recent path, oldest faintest.
      const n = this.trail.length;
      const step = 5;
      for (let i = n - 1 - step, k = 1; i >= 0; i -= step, k++) {
        const p = this.trail[i]!;
        ghost(p.x, p.y, Math.max(0, 0.55 - k * 0.1), 1 - k * 0.03);
      }
      return;
    }

    // Ahead: ghosts along the *predicted* path (gravity, gas giants, wind...), joined by a dotted line.
    const speed = Math.hypot(v.x, v.y);
    if (speed < 1) return;
    const p = this.trail[this.trail.length - 1]!;
    const path = this.predictor
      ? this.predictor.predict(p, v, AHEAD_STEPS, AHEAD_SAMPLE)
      : Array.from({ length: AHEAD_STEPS / AHEAD_SAMPLE }, (_, i) => ({
          x: p.x + v.x * AHEAD_SAMPLE * (i + 1),
          y: p.y + v.y * AHEAD_SAMPLE * (i + 1),
        }));
    const fade = Math.min(1, speed / 6);

    ctx.save();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 7]);
    ctx.lineDashOffset = -t / 30;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (const q of path) ctx.lineTo(q.x, q.y);
    ctx.stroke();
    ctx.restore();

    path.forEach((q, i) => {
      const flicker = 0.6 + 0.4 * Math.sin(t / 70 + i * 1.7);
      ghost(q.x, q.y, (0.42 - i * 0.06) * flicker * fade, 1 - i * 0.04);
    });
  }

  /** The player as a black hole: swirling pull field out to its reach, and an event horizon sized by level. */
  private drawSingularity(ctx: CanvasRenderingContext2D, p: Vec2, t: number): void {
    const s = singularityStats(this.singularity!.level());
    ctx.save();
    ctx.translate(p.x, p.y);
    const field = ctx.createRadialGradient(0, 0, s.horizon, 0, 0, s.reach);
    field.addColorStop(0, 'rgba(76, 29, 149, 0.35)');
    field.addColorStop(1, 'rgba(76, 29, 149, 0)');
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(0, 0, s.reach, 0, Math.PI * 2);
    ctx.fill();
    // Streams of light spiralling in.
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.25)';
    ctx.lineWidth = 1.5;
    for (let arm = 0; arm < 6; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const f = k / 30;
        const a = -t / 500 + (arm / 6) * Math.PI * 2 + f * 4;
        const rr = s.reach * (1 - f) + s.horizon * f;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The black-hole art draws its horizon at ~1.18× the radius it's given.
    const r = s.horizon / 1.18;
    drawEffect(ctx, 'blackhole', p.x, p.y, r, t, 'under');
    drawEffect(ctx, 'blackhole', p.x, p.y, r, t, 'over');
  }

  private drawTrail(ctx: CanvasRenderingContext2D, ball: BallSkin, radius: number, timeMs: number): void {
    const skin = findTrail(this.save.trail);
    const n = this.trail.length;
    if (skin.style === 'none' || n < 2) return;
    if (skin.style === 'equations') {
      // Chalk symbols dropped every few points. Each is keyed to the frame it was
      // dropped on, so it keeps its symbol and tilt as the trail scrolls.
      const chalk = skin.colors === 'ball' ? ['#f8fafc'] : skin.colors;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n - 1; i++) {
        const id = this.pushes - (n - 1 - i);
        if (id % 5 !== 0) continue;
        const p = this.trail[i]!;
        const age = 1 - i / (n - 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(id * 1.7) * 0.4);
        ctx.globalAlpha = (1 - age) * 0.9;
        ctx.fillStyle = resolveColor(chalk[(id / 5) % chalk.length]!, timeMs);
        ctx.font = `600 ${Math.round(radius * (1.3 - age * 0.5))}px "Space Grotesk", serif`;
        ctx.fillText(MATH_SYMBOLS[(id / 5) % MATH_SYMBOLS.length]!, 0, 0);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    if (skin.style === 'cubes') {
      // Spinning wireframe cubes dropped along the path, alternating colors, shrinking as they fade.
      const cubeColors = skin.colors === 'ball' ? ['#5ee7ff'] : skin.colors;
      for (let i = n - 2, k = 0; i >= 0; i -= 4, k++) {
        const p = this.trail[i]!;
        const age = 1 - i / (n - 1);
        drawCube(
          ctx,
          p.x,
          p.y,
          radius * (1.2 - age * 0.6),
          timeMs / 400 + i * 0.35,
          resolveColor(cubeColors[k % cubeColors.length]!, timeMs),
          (1 - age) * 0.85,
        );
      }
      return;
    }
    const colors: readonly CosmeticColor[] = skin.colors === 'ball' ? [ball.ring ?? ball.fill] : skin.colors;
    const colorAt = (t: number, i: number) =>
      resolveColor(colors[Math.min(colors.length - 1, Math.floor(t * colors.length))]!, timeMs, -i * 14);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowBlur = 12;
    for (let i = 1; i < n; i++) {
      const a = this.trail[i - 1]!;
      const b = this.trail[i]!;
      const t = i / (n - 1);
      const color = colorAt(t, n - i);
      ctx.shadowColor = color;
      ctx.globalAlpha = t * 0.6;
      if (skin.style === 'ribbon') {
        ctx.strokeStyle = color;
        ctx.lineWidth = radius * 1.6 * t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else {
        // Sparks: dots that wobble sideways off the path.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const wobble = Math.sin(timeMs / 60 + i * 1.7) * radius * 0.9 * (1 - t);
        ctx.fillStyle = color;
        ctx.globalAlpha = t * 0.9;
        ctx.beginPath();
        ctx.arc(b.x + (-dy / len) * wobble, b.y + (dx / len) * wobble, 1.5 + 3 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
