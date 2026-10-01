import { mulberry32 } from '../../core/random';
import type { Player } from '../../entities/Player';
import type { SupernovaSystem } from '../../systems/SupernovaSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const TAU = Math.PI * 2;
const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/**
 * Supernova visuals. 'world': the charge-up (blue repulsion and violet
 * attraction spiralling into a core) and the blast (flash, shock rings, rays,
 * embers), all scaling with the upgrade's VFX tier. 'screen': the white flash
 * and the ready/recharge gauge.
 */
export class SupernovaDrawer implements ILayerDrawer {
  constructor(
    private readonly system: SupernovaSystem,
    private readonly player: Player,
    private readonly layer: 'world' | 'screen',
  ) {}

  draw(view: RenderView): void {
    if (this.layer === 'world') this.world(view);
    else this.screen(view);
  }

  private world({ ctx, camera, timeMs }: RenderView): void {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    const charge = this.system.charge;
    if (charge > 0) this.chargeUp(ctx, charge, timeMs);
    const b = this.system.lastBlast;
    if (b) this.blast(ctx, b, timeMs);
    ctx.restore();
  }

  /** Blue and violet streams spiralling into a swelling white core. */
  private chargeUp(ctx: CanvasRenderingContext2D, k: number, t: number): void {
    const p = this.player.body.position;
    const R = 220 * (1 - k) + 30;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + t / 200 + k * 6;
      const r = R * (0.5 + ((i * 0.37) % 1) * 0.6);
      ctx.fillStyle = i % 2 ? 'rgba(96, 165, 250, 0.8)' : 'rgba(192, 132, 252, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2 + k * 2, 0, TAU);
      ctx.fill();
    }
    const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20 + k * 60);
    core.addColorStop(0, `rgba(255, 255, 255, ${0.5 + k * 0.5})`);
    core.addColorStop(0.4, `rgba(196, 181, 253, ${0.4 * k})`);
    core.addColorStop(1, 'rgba(96, 165, 250, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + k * 60, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private blast(ctx: CanvasRenderingContext2D, b: NonNullable<SupernovaSystem['lastBlast']>, t: number): void {
    const age = t - b.atMs;
    const duration = 1200 + 200 * b.vfx;
    if (age < 0 || age > duration) return;
    const f = age / duration;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Core flash.
    if (age < 350) {
      const k = 1 - age / 350;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 0.45);
      g.addColorStop(0, `rgba(255, 255, 255, ${k})`);
      g.addColorStop(0.5, `rgba(253, 224, 71, ${0.6 * k})`);
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, TAU);
      ctx.fill();
    }

    // Shock rings: one more per VFX tier, each slightly delayed and wider.
    const ringColors = ['255, 255, 255', '253, 224, 71', '249, 115, 22', '192, 132, 252', '96, 165, 250', '244, 63, 94'];
    for (let i = 0; i <= b.vfx; i++) {
      const ra = age - i * 90;
      if (ra < 0) continue;
      const rf = Math.min(1, ra / (700 + i * 80));
      ctx.strokeStyle = `rgba(${ringColors[i % ringColors.length]}, ${(1 - rf) * 0.9})`;
      ctx.lineWidth = (8 - i) * (1 - rf) + 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * (1 + i * 0.12) * Math.pow(rf, 0.6), 0, TAU);
      ctx.stroke();
    }

    // Rays.
    const rays = 10 + b.vfx * 5;
    const rng = mulberry32(Math.floor(b.atMs));
    ctx.lineCap = 'round';
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + rng() * 0.2;
      const len = b.radius * (0.5 + rng() * 0.7) * Math.min(1, f * 4);
      ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - f) * 0.7})`;
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(a) * len * 0.3, b.y + Math.sin(a) * len * 0.3);
      ctx.lineTo(b.x + Math.cos(a) * len, b.y + Math.sin(a) * len);
      ctx.stroke();
    }

    // Embers flung outward and slowing.
    const embers = 30 + b.vfx * 18;
    for (let i = 0; i < embers; i++) {
      const a = rng() * TAU;
      const speed = 0.4 + rng() * 0.8;
      const d = b.radius * speed * (1 - Math.pow(1 - f, 3));
      ctx.fillStyle = ['#fde047', '#f97316', '#c084fc', '#60a5fa', '#ffffff'][i % 5]!;
      ctx.globalAlpha = 1 - f;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 1.5 + rng() * 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private screen({ ctx, width, height, timeMs }: RenderView): void {
    const b = this.system.lastBlast;
    if (b) {
      const age = timeMs - b.atMs;
      const flashMs = 220 + 40 * b.vfx;
      if (age >= 0 && age < flashMs) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 250, 235, ${(0.25 + 0.1 * b.vfx) * (1 - age / flashMs)})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    if (this.system.level() <= 0) return;
    // Gauge, bottom center (above the boss bar area).
    const available = this.system.available;
    const ready = this.system.ready;
    const w = 150;
    const x = (width - w) / 2;
    const y = height - 70;
    ctx.save();
    ctx.globalAlpha = available ? 1 : 0.4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y, w, 6);
    const fill = this.system.charge > 0 ? this.system.charge : this.system.recharge;
    ctx.fillStyle = ready ? `hsl(${(timeMs / 6) % 360}, 90%, 65%)` : '#c084fc';
    ctx.fillRect(x, y, w * fill, 6);
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const label =
      !available ? '💥 SUPERNOVA · needs Infinity + Singularity on'
      : this.system.charge > 0 ? '💥 COLLAPSING…'
      : ready ? '💥 SUPERNOVA READY · press N'
      : '💥 recharging';
    ctx.fillText(label, width / 2, y - 6);
    ctx.restore();
  }
}
