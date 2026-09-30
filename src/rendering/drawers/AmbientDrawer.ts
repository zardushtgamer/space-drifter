import type { DimensionState } from '../../config/dimensions';
import type { AmbientSystem } from '../../systems/AmbientSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Screen-space atmosphere for the newer dimensions. The 'background' layer
 * sits behind the world; 'foreground' adds weather over it plus a wind gauge.
 */
export class AmbientDrawer implements ILayerDrawer {
  constructor(
    private readonly dimension: DimensionState,
    private readonly ambient: AmbientSystem,
    private readonly layer: 'background' | 'foreground',
  ) {}

  draw(view: RenderView): void {
    const id = this.dimension.current;
    if (this.layer === 'background') {
      if (id === 'toxic') this.spores(view);
      else if (id === 'solar') this.sunRays(view);
      else if (id === 'reef') this.reefLight(view);
    } else if (id === 'solar') {
      this.windStreaks(view);
    }
  }

  /** Big soft spores sinking and swaying, with slight parallax. */
  private spores({ ctx, width, height, timeMs, camera }: RenderView): void {
    ctx.save();
    for (let i = 0; i < 45; i++) {
      const seed = (i * 0.618) % 1;
      const depth = 0.15 + seed * 0.35;
      const x = mod(seed * width * 3 - camera.x * depth + Math.sin(timeMs / 1500 + i) * 30, width);
      const y = mod(i * 97 + timeMs * (0.01 + depth * 0.03) - camera.y * depth, height);
      ctx.globalAlpha = 0.25 + depth;
      ctx.fillStyle = i % 4 === 0 ? '#ecfccb' : '#84cc16';
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + depth * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Broad god-rays fanning from off-screen, slowly sweeping. */
  private sunRays({ ctx, width, height, timeMs }: RenderView): void {
    const ox = width * 0.15;
    const oy = -height * 0.4;
    const len = Math.hypot(width, height) * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = 0.5 + i * 0.16 + Math.sin(timeMs / 4000 + i) * 0.04;
      const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(253, 224, 71, 0.16)');
      g.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - 0.035) * len, oy + Math.sin(a - 0.035) * len);
      ctx.lineTo(ox + Math.cos(a + 0.035) * len, oy + Math.sin(a + 0.035) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Rippling caustic light bands and bubbles drifting up. */
  private reefLight({ ctx, width, height, timeMs, camera }: RenderView): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.07)';
    ctx.lineWidth = 18;
    for (let band = 0; band < 6; band++) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 24) {
        const y = mod(band * (height / 6) - camera.y * 0.05, height) + Math.sin(x / 90 + timeMs / 700 + band) * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(204, 251, 241, 0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const seed = (i * 0.7548) % 1;
      const x = mod(seed * width * 5 - camera.x * 0.2 + Math.sin(timeMs / 600 + i) * 8, width);
      const y = mod(height - (timeMs * (0.03 + seed * 0.05) + i * 71) - camera.y * 0.2, height + 20);
      ctx.beginPath();
      ctx.arc(x, y, 2 + seed * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Streaks flying in the wind direction, plus a gauge showing where it's blowing. */
  private windStreaks({ ctx, width, height, timeMs }: RenderView): void {
    const a = this.ambient.windAngle;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const travel = timeMs * 0.9;
    for (let i = 0; i < 40; i++) {
      const seed = (i * 0.618) % 1;
      const x = mod(seed * width * 7 + dx * travel * (0.6 + seed), width);
      const y = mod(i * 53 + dy * travel * (0.6 + seed), height);
      const len = 20 + seed * 40;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx * len, y - dy * len);
      ctx.stroke();
    }

    // Gauge.
    const gx = width - 60;
    const gy = height - 60;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(gx, gy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(gx, gy);
    ctx.rotate(a);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SOLAR WIND', gx, gy + 42);
    ctx.restore();
  }
}
