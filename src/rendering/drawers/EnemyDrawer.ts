import { PALETTE, type GameConfig } from '../../config/gameConfig';
import { Enemy, type EnemyType } from '../../entities/Enemy';
import type { Entity } from '../../entities/Entity';
import type { IDrawer, RenderView } from '../IRenderer';
import { drawHealthBar, isFlashing } from './flash';

const COLORS: Readonly<Record<EnemyType, string>> = {
  chaser: PALETTE.enemy,
  brute: PALETTE.brute,
  dasher: '#ff5a1f',
  splitter: '#7dd3fc',
  sniper: '#a78bfa',
  phantom: '#6ee7b7',
  swarmer: '#f9a8d4',
  bloater: '#84cc16',
  orbiter: '#fde047',
  jelly: '#fda4af',
};

/** Polygon sides per type; chasers/dashers point where they're heading. */
const SIDES: Readonly<Record<EnemyType, number>> = {
  chaser: 3,
  brute: 6,
  dasher: 3,
  splitter: 4,
  sniper: 5,
  phantom: 8,
  swarmer: 3,
  bloater: 12,
  orbiter: 6,
  jelly: 10,
};

export class EnemyDrawer implements IDrawer {
  constructor(private readonly config: GameConfig) {}

  draw({ ctx, timeMs }: RenderView, entity: Entity): void {
    if (!(entity instanceof Enemy)) return;
    const { position: p, velocity: v, circleRadius: r = 0 } = entity.body;
    const color = COLORS[entity.type];
    const pointy = entity.type === 'chaser' || entity.type === 'dasher' || entity.type === 'swarmer';
    const angle = pointy ? Math.atan2(v.y, v.x) : timeMs / 900;
    const sides = SIDES[entity.type];

    ctx.save();
    ctx.translate(p.x, p.y);

    if (entity.type === 'dasher') this.dasherTell(ctx, entity, r, timeMs);
    if (entity.type === 'bloater' || entity.type === 'orbiter' || entity.type === 'jelly') {
      this.drawNewKind(ctx, entity, r, color, timeMs);
      ctx.restore();
      drawHealthBar(ctx, p.x, p.y - r - 10, r * 2, entity.health.hp, entity.health.maxHp, color);
      return;
    }
    if (entity.type === 'phantom') {
      // Flickers, and fades back in after a blink.
      const sinceBlink = entity.ageMs - entity.blinkedAtMs;
      ctx.globalAlpha = Math.min(1, sinceBlink / 350) * (0.55 + 0.25 * Math.sin(timeMs / 90));
    }

    ctx.rotate(angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = this.config.effects.glowBlur / 2;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rr = pointy && i === 0 ? r * 1.35 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = isFlashing(entity, timeMs, this.config) ? '#ffffff' : color;
    ctx.fill();

    if (entity.type === 'splitter') {
      // Crack lines hint that it breaks apart.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
    } else if (entity.type === 'sniper') {
      // Scope eye.
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05070d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawHealthBar(ctx, p.x, p.y - r - 10, r * 2, entity.health.hp, entity.health.maxHp, color);
  }

  /** Toxic Bloom bloater, Solar Storm orbiter, Nebula Reef jelly. Context is at the enemy's center. */
  private drawNewKind(ctx: CanvasRenderingContext2D, e: Enemy, r: number, color: string, t: number): void {
    const flash = isFlashing(e, t, this.config);
    ctx.shadowColor = color;
    ctx.shadowBlur = this.config.effects.glowBlur / 2;

    if (e.type === 'bloater') {
      // Swollen, breathing sac covered in pustules.
      const breathe = 1 + 0.07 * Math.sin(t / 220 + e.id);
      ctx.fillStyle = flash ? '#ffffff' : '#4d7c0f';
      ctx.beginPath();
      ctx.arc(0, 0, r * breathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = flash ? '#ffffff' : color;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + e.id;
        const d = r * 0.55 * breathe;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.18 + 0.05 * Math.sin(t / 150 + i)), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'orbiter') {
      // Bright core inside a spinning ring.
      ctx.rotate(t / 150);
      ctx.strokeStyle = flash ? '#ffffff' : color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
      ctx.fillStyle = flash ? '#ffffff' : '#fffbeb';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Jelly: translucent dome that squashes when it pulses, trailing tentacles.
      const since = e.ageMs - e.pulsedAtMs;
      const squash = since < 250 ? 1 - 0.3 * (1 - since / 250) : 1;
      const v = e.body.velocity;
      ctx.rotate(Math.atan2(v.y, v.x) + Math.PI / 2);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.3, r * 0.3);
        for (let s = 1; s <= 5; s++) {
          ctx.lineTo(i * r * 0.3 + Math.sin(t / 120 + i + s) * 4, r * 0.3 + s * r * 0.3);
        }
        ctx.stroke();
      }
      ctx.fillStyle = flash ? '#ffffff' : color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (2 - squash), r * squash, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Pulsing warning ring while winding up; streaks while charging. */
  private dasherTell(ctx: CanvasRenderingContext2D, e: Enemy, r: number, timeMs: number): void {
    if (e.phase === 'windup') {
      ctx.strokeStyle = `rgba(255, 90, 31, ${0.5 + 0.5 * Math.sin(timeMs / 40)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.phase === 'dash') {
      const v = e.body.velocity;
      ctx.strokeStyle = 'rgba(255, 170, 60, 0.6)';
      ctx.lineWidth = r;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-v.x * 4, -v.y * 4);
      ctx.stroke();
    }
  }
}
