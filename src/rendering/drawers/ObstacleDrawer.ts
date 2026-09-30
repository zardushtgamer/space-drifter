import { DIMENSIONS, type DimensionState } from '../../config/dimensions';
import { PALETTE, type GameConfig } from '../../config/gameConfig';
import type { Entity } from '../../entities/Entity';
import { Obstacle } from '../../entities/Obstacle';
import { mulberry32 } from '../../core/random';
import type { LandmarkArt } from './LandmarkDrawer';
import { drawEffect } from '../effects';
import type { IDrawer, RenderView } from '../IRenderer';

/** Lumpy rocks, blinking spiked mines, bobbing health packs and planets. */
export class ObstacleDrawer implements IDrawer {
  constructor(
    private readonly config: GameConfig,
    private readonly dimension: DimensionState,
    private readonly landmarkArt?: LandmarkArt,
  ) {}

  /** Dimension hole: a tilted, spinning green/magenta vortex with a starry window to the other side. */
  private drawRift(ctx: CanvasRenderingContext2D, rift: Obstacle, r: number, timeMs: number): void {
    const dest = DIMENSIONS[rift.destination ?? 'andromeda'];
    const reach = r * this.config.rifts.pullRadiusScale;
    const glow = ctx.createRadialGradient(0, 0, r, 0, 0, reach);
    glow.addColorStop(0, 'rgba(52, 211, 153, 0.28)');
    glow.addColorStop(0.5, 'rgba(217, 70, 239, 0.12)');
    glow.addColorStop(1, 'rgba(217, 70, 239, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();

    const spin = timeMs / 500;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // Vortex arms, alternating colors.
    for (let arm = 0; arm < 8; arm++) {
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(232, 121, 249, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const k = s / 20;
        const a = spin + (arm / 8) * Math.PI * 2 + k * 2.6;
        const rr = r * (2.3 - k * 1.4);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.restore();

    // The window: the destination's colors seen through the hole.
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    core.addColorStop(0, dest.labelColor);
    core.addColorStop(1, dest.rockFill);
    ctx.save();
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 24;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 - spin * 0.5;
      const d = r * 0.8 * ((i * 0.37) % 1);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(timeMs / 200 + i);
      ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.5, 1.5);
    }
    ctx.restore();

    ctx.fillStyle = dest.labelColor;
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`DIMENSION HOLE → ${dest.name.toUpperCase()}`, 0, -r * 2.6);
  }

  /** TON 618: vast lensing halo, blazing accretion disk, black horizon and photon ring. */
  private drawTon618(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const reach = r * this.config.ton618.reachScale;
    const halo = ctx.createRadialGradient(0, 0, r, 0, 0, reach);
    halo.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    halo.addColorStop(0.25, 'rgba(60, 20, 90, 0.35)');
    halo.addColorStop(1, 'rgba(20, 5, 40, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();

    // Accretion disk: a tilted, rotating ring of hot gas.
    const spin = t / 2500;
    ctx.save();
    ctx.scale(1, 0.38);
    ctx.globalCompositeOperation = 'lighter';
    const disk = ctx.createRadialGradient(0, 0, r * 1.05, 0, 0, r * 2.6);
    disk.addColorStop(0, 'rgba(255, 250, 230, 0.95)');
    disk.addColorStop(0.2, 'rgba(255, 180, 70, 0.8)');
    disk.addColorStop(0.55, 'rgba(220, 70, 40, 0.45)');
    disk.addColorStop(1, 'rgba(120, 30, 90, 0)');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      const a = spin * (1 + (i % 3) * 0.3) + i * 0.61;
      const rr = r * (1.15 + ((i * 0.37) % 1) * 1.3);
      ctx.strokeStyle = `rgba(255, ${170 + (i % 4) * 20}, 90, 0.35)`;
      ctx.beginPath();
      ctx.arc(0, 0, rr, a, a + 0.6);
      ctx.stroke();
    }
    ctx.restore();

    // Event horizon.
    ctx.save();
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 60;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Photon ring, and the disk's far side lensed up over the top.
    ctx.save();
    ctx.strokeStyle = `rgba(255, 230, 180, ${0.8 + 0.2 * Math.sin(t / 300)})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ffd08a';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = r * 0.12;
    ctx.strokeStyle = 'rgba(255, 170, 70, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 1.25, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    // Near side of the disk crossing in front of the horizon.
    ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = 'rgba(255, 210, 130, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.1, r * 0.34, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffd08a';
    ctx.font = '700 28px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TON 618', 0, -r * 1.55);
  }

  private drawHazard(ctx: CanvasRenderingContext2D, o: Obstacle, r: number, t: number): void {
    switch (o.type) {
      case 'lava':
      case 'acid': {
        // Bubbling pool: molten orange, or corrosive green.
        const acid = o.type === 'acid';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, acid ? 'rgba(236, 252, 120, 0.85)' : 'rgba(255, 220, 100, 0.85)');
        g.addColorStop(0.5, acid ? 'rgba(132, 204, 22, 0.6)' : 'rgba(255, 90, 20, 0.6)');
        g.addColorStop(1, acid ? 'rgba(40, 90, 10, 0)' : 'rgba(140, 20, 10, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const rr = r * (0.92 + 0.08 * Math.sin(t / 300 + i * 1.7));
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.fill();
        ctx.fillStyle = acid ? 'rgba(236, 252, 203, 0.8)' : 'rgba(255, 240, 180, 0.8)';
        for (let i = 0; i < 6; i++) {
          const phase = (t / 1200 + i / 6) % 1;
          const a = i * 2.1 + o.hue;
          const d = r * 0.6 * ((i * 0.43) % 1);
          ctx.globalAlpha = 1 - phase;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + phase * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'current': {
        // Flowing water: a soft teal patch with chevrons streaming in its direction.
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, 'rgba(45, 212, 191, 0.22)');
        g.addColorStop(1, 'rgba(45, 212, 191, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.rotate((o.hue * Math.PI) / 180);
        ctx.strokeStyle = 'rgba(204, 251, 241, 0.55)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const step = 36;
        const shift = (t / 12) % step;
        for (let x = -r - step + shift; x < r; x += step) {
          for (let y = -r; y < r; y += 44) {
            ctx.beginPath();
            ctx.moveTo(x - 7, y - 9);
            ctx.lineTo(x + 3, y);
            ctx.lineTo(x - 7, y + 9);
            ctx.stroke();
          }
        }
        ctx.restore();
        break;
      }
      case 'frost': {
        // Icy mist with drifting flakes.
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, 'rgba(220, 245, 255, 0.35)');
        g.addColorStop(1, 'rgba(125, 211, 252, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 247, 255, 0.8)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4 + t / 4000;
          const d = r * 0.8 * ((i * 0.31 + 0.2) % 1);
          const x = Math.cos(a) * d;
          const y = Math.sin(a) * d;
          ctx.beginPath();
          for (let k = 0; k < 3; k++) {
            const b = (k / 3) * Math.PI + t / 2000;
            ctx.moveTo(x - Math.cos(b) * 4, y - Math.sin(b) * 4);
            ctx.lineTo(x + Math.cos(b) * 4, y + Math.sin(b) * 4);
          }
          ctx.stroke();
        }
        break;
      }
      case 'repulsor': {
        // Violet core with rings rippling outward.
        const reach = r * this.config.hazards.repulsor.pushRadiusScale;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const k = (t / 1800 + i / 3) % 1;
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(0, 0, r + (reach - r) * k, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#1e1033';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      }
      case 'boost': {
        // Glowing gate with chevrons.
        ctx.rotate(o.hue);
        ctx.shadowColor = '#6ee7b7';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = `rgba(110, 231, 183, ${0.7 + 0.3 * Math.sin(t / 150)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
          const x = i * r * 0.35 + ((t / 25) % (r * 0.35));
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.15, -r * 0.3);
          ctx.lineTo(x + r * 0.1, 0);
          ctx.lineTo(x - r * 0.15, r * 0.3);
          ctx.stroke();
        }
        break;
      }
      case 'crystal': {
        // Cluster of sharp shards.
        ctx.rotate(o.hue);
        ctx.shadowColor = '#f9a8d4';
        ctx.shadowBlur = 14;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const len = r * (0.9 + 0.35 * (o.shape[i] ?? 1));
          const w = r * 0.32;
          ctx.fillStyle = i % 2 === 0 ? '#f9a8d4' : '#a5f3fc';
          ctx.beginPath();
          ctx.moveTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
          ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          ctx.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Obstacle, r: number, timeMs: number): void {
    const h = planet.hue;
    const reach = r * this.config.planets.pullRadiusScale;

    // Gravity field: faint glow plus ripples flowing inward.
    const field = ctx.createRadialGradient(0, 0, r, 0, 0, reach);
    field.addColorStop(0, `hsla(${h}, 80%, 60%, 0.14)`);
    field.addColorStop(1, `hsla(${h}, 80%, 60%, 0)`);
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const t = 1 - ((timeMs / 2400 + i / 3) % 1);
      ctx.strokeStyle = `hsla(${h}, 80%, 70%, ${0.25 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r + (reach - r) * t, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tilt = (planet.shape[0] ?? 1) - 0.9;
    if (planet.ringed) this.ring(ctx, r, h, tilt, 'back');

    // Body: lit from the top-left, with a couple of bands.
    const body = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
    body.addColorStop(0, `hsl(${h}, 70%, 68%)`);
    body.addColorStop(0.6, `hsl(${h}, 55%, 42%)`);
    body.addColorStop(1, `hsl(${h}, 60%, 18%)`);
    ctx.shadowColor = `hsl(${h}, 80%, 60%)`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = `hsla(${(h + 30) % 360}, 60%, 75%, 0.13)`;
    for (let i = 1; i < 4; i++) {
      const y = -r + (2 * r * i) / 4 + ((planet.shape[i] ?? 1) - 0.9) * r;
      ctx.fillRect(-r, y, 2 * r, r * 0.14);
    }
    ctx.restore();

    if (planet.ringed) this.ring(ctx, r, h, tilt, 'front');
  }

  /** Darkened, swirling field out to the edge of its pull, then the accretion-disk art. */
  private drawBlackHole(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
    const reach = r * this.config.blackHoles.pullRadiusScale;
    const dark = ctx.createRadialGradient(0, 0, r, 0, 0, reach);
    dark.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    dark.addColorStop(0.5, 'rgba(30, 8, 60, 0.35)');
    dark.addColorStop(1, 'rgba(30, 8, 60, 0)');
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();

    // Spiral streams of light being dragged in.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.5;
    for (let arm = 0; arm < 5; arm++) {
      ctx.strokeStyle = `rgba(167, 139, 250, 0.22)`;
      ctx.beginPath();
      for (let s = 0; s <= 40; s++) {
        const k = s / 40;
        const a = timeMs / 700 + (arm / 5) * Math.PI * 2 + k * 5;
        const rr = reach * (1 - k) + r * 1.4 * k;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.restore();

    drawEffect(ctx, 'blackhole', 0, 0, r, timeMs, 'under');
    drawEffect(ctx, 'blackhole', 0, 0, r, timeMs, 'over');
  }

  /** Marks a black hole whose wormhole is linked to a partner. */
  private drawLinkRing(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
    ctx.save();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = `rgba(103, 232, 249, ${0.6 + 0.3 * Math.sin(timeMs / 250)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = timeMs / 30;
    ctx.beginPath();
    ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a5f3fc';
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⇄ WORMHOLE LINKED', 0, -r * 3 - 10);
    ctx.restore();
  }

  /** Tilted ring drawn in two halves so the planet sits inside it. */
  private ring(ctx: CanvasRenderingContext2D, r: number, h: number, tilt: number, half: 'back' | 'front'): void {
    ctx.save();
    ctx.rotate(tilt * 3);
    ctx.strokeStyle = `hsla(${(h + 180) % 360}, 60%, 75%, 0.7)`;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    if (half === 'back') ctx.ellipse(0, 0, r * 1.7, r * 0.4, 0, Math.PI, Math.PI * 2);
    else ctx.ellipse(0, 0, r * 1.7, r * 0.4, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  /** A 100 ly gas giant: gravity halo, drifting wavy cloud bands, a great storm, and sometimes rings. */
  private drawGasGiant(ctx: CanvasRenderingContext2D, g: Obstacle, r: number, t: number): void {
    const h = g.hue;
    const reach = r * this.config.gasGiant.reachScale;
    const halo = ctx.createRadialGradient(0, 0, r, 0, 0, reach);
    halo.addColorStop(0, `hsla(${h}, 70%, 60%, 0.22)`);
    halo.addColorStop(1, `hsla(${h}, 70%, 60%, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();

    const tilt = ((g.shape[0] ?? 1) - 0.9) * 2;
    if (g.ringed) this.gasRing(ctx, r, h, tilt, 'back');

    // Base sphere, lit from the upper left.
    const base = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    base.addColorStop(0, `hsl(${h}, 60%, 70%)`);
    base.addColorStop(0.7, `hsl(${h}, 55%, 45%)`);
    base.addColorStop(1, `hsl(${h}, 60%, 22%)`);
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Cloud bands.
    ctx.save();
    ctx.clip();
    ctx.rotate(tilt * 0.3);
    const bands = 16;
    const bandH = (2 * r) / bands;
    for (let i = 0; i < bands; i++) {
      const y0 = -r + i * bandH;
      const light = i % 2 === 0 ? 72 : 38;
      const hue = (h + ((g.shape[i % 9] ?? 1) - 0.9) * 120) % 360;
      ctx.fillStyle = `hsla(${hue}, 55%, ${light}%, 0.35)`;
      ctx.beginPath();
      const drift = t / (60 + i * 7);
      for (let x = -r; x <= r; x += r / 20) {
        ctx.lineTo(x, y0 + Math.sin(x / (r * 0.12) + drift + i) * bandH * 0.25);
      }
      for (let x = r; x >= -r; x -= r / 20) {
        ctx.lineTo(x, y0 + bandH + Math.sin(x / (r * 0.1) + drift * 1.3 + i * 2) * bandH * 0.25);
      }
      ctx.closePath();
      ctx.fill();
    }
    // The great storm.
    const sx = r * 0.3;
    const sy = r * 0.25;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t / 20000);
    const storm = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.22);
    storm.addColorStop(0, `hsla(${(h + 20) % 360}, 80%, 55%, 0.9)`);
    storm.addColorStop(0.6, `hsla(${(h + 10) % 360}, 70%, 40%, 0.6)`);
    storm.addColorStop(1, `hsla(${h}, 60%, 40%, 0)`);
    ctx.fillStyle = storm;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${h}, 50%, 85%, 0.35)`;
    ctx.lineWidth = r * 0.01;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.07 * k, r * 0.04 * k, 0, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    if (g.ringed) this.gasRing(ctx, r, h, tilt, 'front');

    ctx.fillStyle = `hsl(${h}, 80%, 80%)`;
    ctx.font = `700 ${Math.round(r * 0.06)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('GAS GIANT', 0, -r - r * 0.08);
  }

  private gasRing(ctx: CanvasRenderingContext2D, r: number, h: number, tilt: number, half: 'back' | 'front'): void {
    ctx.save();
    ctx.rotate(tilt);
    for (const [scale, alpha, width] of [
      [1.55, 0.45, 0.1],
      [1.8, 0.3, 0.06],
    ] as const) {
      ctx.strokeStyle = `hsla(${(h + 40) % 360}, 50%, 75%, ${alpha})`;
      ctx.lineWidth = r * width;
      ctx.beginPath();
      if (half === 'back') ctx.ellipse(0, 0, r * scale, r * scale * 0.25, 0, Math.PI, Math.PI * 2);
      else ctx.ellipse(0, 0, r * scale, r * scale * 0.25, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A spinning, bobbing coin gem. */
  private drawGem(ctx: CanvasRenderingContext2D, gem: Obstacle, r: number, t: number): void {
    const bob = 1 + 0.12 * Math.sin(t / 200 + gem.id);
    ctx.scale(Math.cos(t / 400 + gem.id) * bob, bob);
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7c2';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(r * 0.35, 0);
    ctx.lineTo(0, r * 0.2);
    ctx.lineTo(-r * 0.35, 0);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * A slab of cave rock, drawn slightly oversized with rounded corners and no
   * outline so neighboring slabs melt into one continuous rock face.
   */
  private drawCaveWall(ctx: CanvasRenderingContext2D, wall: Obstacle): void {
    const { min, max } = wall.body.bounds;
    const o = this.config.caves.drawOverlap;
    const w = max.x - min.x + o * 2;
    const h = max.y - min.y + o * 2;
    const theme = this.dimension.theme;
    ctx.fillStyle = theme.rockFill;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(22, w / 2, h / 2));
    ctx.fill();

    // Mineral speckles, stable per slab.
    const rng = mulberry32(wall.id);
    const count = Math.min(40, Math.floor((w * h) / 2500));
    ctx.fillStyle = theme.rockStroke;
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = 0.15 + rng() * 0.3;
      ctx.beginPath();
      ctx.arc(-w / 2 + o + rng() * (w - 2 * o), -h / 2 + o + rng() * (h - 2 * o), 1 + rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  draw({ ctx, timeMs }: RenderView, entity: Entity): void {
    if (!(entity instanceof Obstacle)) return;
    const { position: p, angle, circleRadius: r = 0 } = entity.body;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (entity.type === 'cavewall') {
      this.drawCaveWall(ctx, entity);
      ctx.restore();
      return;
    }
    if (entity.type === 'landmark') {
      this.landmarkArt?.draw(ctx, entity, timeMs);
      ctx.restore();
      return;
    }
    if (entity.type === 'gasgiant') {
      this.drawGasGiant(ctx, entity, r, timeMs);
      ctx.restore();
      return;
    }
    if (entity.type === 'gem') {
      this.drawGem(ctx, entity, r, timeMs);
      ctx.restore();
      return;
    }

    if (entity.type === 'rock') {
      ctx.rotate(angle);
      ctx.beginPath();
      const n = entity.shape.length;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (entity.shape[i] ?? 1);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = this.dimension.theme.rockFill;
      ctx.fill();
      ctx.strokeStyle = this.dimension.theme.rockStroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (entity.type === 'planet') {
      this.drawPlanet(ctx, entity, r, timeMs);
    } else if (entity.type === 'ton618') {
      this.drawTon618(ctx, r, timeMs);
    } else if (entity.type === 'rift') {
      this.drawRift(ctx, entity, r, timeMs);
    } else if (
      entity.type === 'lava' || entity.type === 'acid' || entity.type === 'current' || entity.type === 'frost' || entity.type === 'repulsor' ||
      entity.type === 'boost' || entity.type === 'crystal'
    ) {
      this.drawHazard(ctx, entity, r, timeMs);
    } else if (entity.type === 'blackhole') {
      this.drawBlackHole(ctx, r, timeMs);
      if (entity.link) this.drawLinkRing(ctx, r, timeMs);
    } else if (entity.type === 'health') {
      const bob = 1 + 0.12 * Math.sin(timeMs / 220 + entity.id);
      ctx.scale(bob, bob);
      ctx.shadowColor = PALETTE.good;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.good;
      ctx.lineWidth = 2;
      ctx.stroke();
      const arm = r * 0.6;
      const t = r * 0.22;
      ctx.fillStyle = PALETTE.good;
      ctx.fillRect(-arm, -t, arm * 2, t * 2);
      ctx.fillRect(-t, -arm, t * 2, arm * 2);
    } else {
      const blink = 0.5 + 0.5 * Math.sin(timeMs / 180 + entity.id);
      ctx.rotate(timeMs / 2000);
      ctx.strokeStyle = PALETTE.mine;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
        ctx.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4);
      }
      ctx.stroke();
      ctx.shadowColor = PALETTE.mine;
      ctx.shadowBlur = 10 + blink * 16;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.mine;
      ctx.fill();
    }
    ctx.restore();
  }
}
