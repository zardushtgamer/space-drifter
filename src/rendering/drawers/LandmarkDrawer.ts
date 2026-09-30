import { LANDMARK_TUNING as T, landmarkFor } from '../../config/landmarks';
import type { DimensionState } from '../../config/dimensions';
import type { GameConfig } from '../../config/gameConfig';
import type { Obstacle } from '../../entities/Obstacle';
import type { LandmarkSystem } from '../../systems/LandmarkSystem';
import type { WorldSystem } from '../../systems/WorldSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const TAU = Math.PI * 2;
const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Art for each landmark. Called by ObstacleDrawer with the context already at the landmark's center. */
export class LandmarkArt {
  constructor(private readonly system: LandmarkSystem) {}

  draw(ctx: CanvasRenderingContext2D, o: Obstacle, t: number): void {
    const def = o.landmark;
    if (!def) return;
    const r = def.radius;
    switch (def.id) {
      case 'sun':
        this.sun(ctx, r, t);
        break;
      case 'stargate':
        this.stargate(ctx, r, t);
        break;
      case 'volcano':
        this.volcano(ctx, r, t);
        break;
      case 'titan':
        this.titan(ctx, r, t);
        break;
      case 'lighthouse':
        this.lighthouse(ctx, r, t);
        break;
      case 'spire':
        this.spire(ctx, r, t);
        break;
      case 'grotto':
        this.grotto(ctx, r, t);
        break;
      case 'bloom':
        this.bloom(ctx, r, t);
        break;
      case 'array':
        this.array(ctx, r, t);
        break;
      case 'palace':
        this.palace(ctx, r, t);
        break;
    }
    ctx.fillStyle = def.color;
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(def.name.toUpperCase(), 0, -r - (def.id === 'lighthouse' ? 60 : 40));
  }

  private glowDisc(ctx: CanvasRenderingContext2D, r: number, stops: readonly [number, string][]): void {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [k, c] of stops) g.addColorStop(k, c);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }

  private sun(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    this.glowDisc(ctx, r * T.sun.pullScale, [
      [0, 'rgba(255, 200, 80, 0.35)'],
      [0.3, 'rgba(255, 140, 40, 0.12)'],
      [1, 'rgba(255, 120, 20, 0)'],
    ]);
    // Corona flares.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + t / 5000;
      const len = r * (0.25 + 0.2 * Math.sin(t / 400 + i * 1.7));
      ctx.strokeStyle = 'rgba(255, 170, 60, 0.45)';
      ctx.lineWidth = r * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + len), Math.sin(a) * (r + len));
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#ffb020';
    ctx.shadowBlur = 80;
    this.glowDisc(ctx, r, [
      [0, '#fffbe6'],
      [0.6, '#ffd166'],
      [1, '#ff8a00'],
    ]);
    ctx.restore();
    // Burn zone edge.
    ctx.strokeStyle = `rgba(255, 90, 40, ${0.3 + 0.2 * Math.sin(t / 200)})`;
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * T.sun.burnScale, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private stargate(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const charge = this.system.stargateCharge;
    const ready = charge >= 1;
    // Event surface.
    this.glowDisc(ctx, r * 0.95, [
      [0, ready ? 'rgba(240, 171, 252, 0.7)' : 'rgba(120, 80, 140, 0.25)'],
      [0.7, ready ? 'rgba(124, 58, 237, 0.4)' : 'rgba(60, 30, 80, 0.15)'],
      [1, 'rgba(60, 20, 90, 0)'],
    ]);
    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const k = (t / 1500 + i / 3) % 1;
        ctx.strokeStyle = `rgba(255, 220, 255, ${0.5 * (1 - k)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9 * (1 - k), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Ring with rotating chevrons; the charge fills around it.
    ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = '#3b1f4d';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#f0abfc';
    ctx.shadowColor = '#f0abfc';
    ctx.shadowBlur = 20;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t / 3000;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(r, 0);
      ctx.fillStyle = ready || i / 9 < charge ? '#fde7ff' : '#6b4a7a';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private volcano(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    this.glowDisc(ctx, r * T.volcano.burnScale * 1.3, [
      [0.6, 'rgba(255, 90, 20, 0.35)'],
      [1, 'rgba(255, 60, 10, 0)'],
    ]);
    ctx.save();
    ctx.shadowColor = '#ff5a1f';
    ctx.shadowBlur = 40;
    this.glowDisc(ctx, r, [
      [0, '#5a2418'],
      [0.8, '#3a140c'],
      [1, '#1f0a06'],
    ]);
    ctx.restore();
    // Glowing lava cracks.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = `rgba(255, 140, 40, ${0.7 + 0.3 * Math.sin(t / 250)})`;
    ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let s = 1; s <= 4; s++) {
        const rr = (r * s) / 4;
        const w = Math.sin(i * 3 + s * 1.9) * 0.35;
        ctx.lineTo(Math.cos(a + w) * rr, Math.sin(a + w) * rr);
      }
      ctx.stroke();
    }
    // Crater.
    this.glowDisc(ctx, r * 0.3, [
      [0, '#fff3b0'],
      [0.5, '#ff8a00'],
      [1, 'rgba(200, 40, 10, 0.2)'],
    ]);
    ctx.restore();
  }

  private titan(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const aura = r * T.titan.auraScale;
    this.glowDisc(ctx, aura, [
      [0, 'rgba(186, 230, 253, 0.3)'],
      [0.5, 'rgba(125, 211, 252, 0.12)'],
      [1, 'rgba(125, 211, 252, 0)'],
    ]);
    ctx.strokeStyle = 'rgba(224, 247, 255, 0.35)';
    ctx.setLineDash([6, 12]);
    ctx.lineDashOffset = t / 60;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, aura, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.shadowColor = '#7dd3fc';
    ctx.shadowBlur = 50;
    this.glowDisc(ctx, r, [
      [0, '#f0fbff'],
      [0.6, '#a5e3fb'],
      [1, '#3b82c4'],
    ]);
    ctx.restore();
    // Ice facets.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      ctx.lineTo(Math.cos(a + 0.5) * r * 0.85, Math.sin(a + 0.5) * r * 0.85);
      ctx.stroke();
    }
  }

  private lighthouse(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const l = T.lighthouse;
    const base = this.system.beamAngle(l.turnRadPerSec);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < l.beams; i++) {
      const a = base + (i / l.beams) * TAU;
      const g = ctx.createLinearGradient(0, 0, Math.cos(a) * l.length, Math.sin(a) * l.length);
      g.addColorStop(0, 'rgba(209, 250, 229, 0.55)');
      g.addColorStop(1, 'rgba(110, 231, 183, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.05) * l.length, Math.sin(a - 0.05) * l.length);
      ctx.lineTo(Math.cos(a + 0.05) * l.length, Math.sin(a + 0.05) * l.length);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Tower seen from above: stone base, glowing lamp.
    ctx.fillStyle = '#1f3b35';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8ff5d0';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#6ee7b7';
    ctx.shadowBlur = 40;
    this.glowDisc(ctx, r * 0.55, [
      [0, '#ffffff'],
      [1, `rgba(110, 231, 183, ${0.7 + 0.3 * Math.sin(t / 300)})`],
    ]);
    ctx.restore();
  }

  private spire(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const s = T.spire;
    const base = this.system.beamAngle(s.turnRadPerSec);
    const colors = ['#f9a8d4', '#a5f3fc', '#fde68a'];
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < s.beams; i++) {
      const a = base + (i / s.beams) * TAU;
      const x = Math.cos(a) * s.length;
      const y = Math.sin(a) * s.length;
      ctx.shadowColor = colors[i % 3]!;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = colors[i % 3]!;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = s.width * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s.width * 0.5;
      ctx.stroke();
    }
    ctx.restore();
    // The spire: a faceted star crystal.
    ctx.save();
    ctx.rotate(-t / 3000);
    ctx.shadowColor = '#f9a8d4';
    ctx.shadowBlur = 30;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.fillStyle = colors[i % 3]!;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.4) * r * 0.6, Math.sin(a - 0.4) * r * 0.6);
      ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
      ctx.lineTo(Math.cos(a + 0.4) * r * 0.6, Math.sin(a + 0.4) * r * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Giant flower: petals fold shut (thorny) and spread open around a glowing nectar core. */
  private bloom(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const open = this.system.bloomOpen;
    const phase = this.system.bloomPhase;
    // Petals ease open at the start of the open phase and close at the start of the closed phase.
    const ease = (k: number) => Math.min(1, k * 4);
    const spread = open ? ease(phase) : 1 - ease(phase);
    this.glowDisc(ctx, r * 2.2, [
      [0, `rgba(163, 230, 53, ${0.15 + 0.25 * spread})`],
      [1, 'rgba(163, 230, 53, 0)'],
    ]);
    const petals = 8;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * TAU + layer * (Math.PI / petals) + t / 8000;
        const len = r * (0.55 + 0.6 * spread) * (layer === 0 ? 1 : 0.8);
        const width = r * (0.18 + 0.2 * spread);
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = layer === 0 ? '#4d7c0f' : '#a3e635';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -width, len, 0);
        ctx.quadraticCurveTo(len * 0.5, width, 0, 0);
        ctx.fill();
        if (!open) {
          // Thorns along closed petals.
          ctx.fillStyle = '#d9f99d';
          for (let k = 1; k <= 3; k++) {
            const x = (len * k) / 4;
            ctx.beginPath();
            ctx.moveTo(x, -width * 0.5);
            ctx.lineTo(x + 6, -width * 0.5 - 10);
            ctx.lineTo(x + 10, -width * 0.5);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    // Nectar core.
    ctx.save();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = open ? 40 : 5;
    this.glowDisc(ctx, T.bloom.coreRadius * (0.6 + 0.4 * spread), [
      [0, open ? '#fffbeb' : '#65a30d'],
      [0.6, open ? '#fde047' : '#3f6212'],
      [1, open ? 'rgba(163, 230, 53, 0.6)' : '#1a2e05'],
    ]);
    ctx.restore();
    ctx.fillStyle = open ? '#fde047' : '#d9f99d';
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'OPEN — FLY IN!' : 'CLOSED', 0, r + 34);
  }

  /** Small star with orbiting solar panels and a charge ring. */
  private array(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const a = T.array;
    const charge = this.system.arrayCharge;
    const overdrive = this.system.overdriveLeftMs > 0;
    // Charging field.
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -t / 40;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, a.chargeRadius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // Orbit path and panels, beaming energy inward.
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, a.panelOrbit, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < a.panels; i++) {
      const ang = t / 3000 + (i / a.panels) * TAU;
      const px = Math.cos(ang) * a.panelOrbit;
      const py = Math.sin(ang) * a.panelOrbit;
      ctx.strokeStyle = `rgba(253, 224, 71, ${0.2 + 0.4 * charge})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      ctx.stroke();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-12, -34, 24, 68);
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(-12, k * 13);
        ctx.lineTo(12, k * 13);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Star.
    ctx.save();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = overdrive ? 90 : 50;
    this.glowDisc(ctx, r, [
      [0, '#ffffff'],
      [0.5, '#fde047'],
      [1, '#f97316'],
    ]);
    ctx.restore();
    // Charge meter.
    ctx.strokeStyle = overdrive ? '#ffffff' : '#fde047';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r + 22, -Math.PI / 2, -Math.PI / 2 + TAU * (overdrive ? 1 : charge));
    ctx.stroke();
  }

  /** Branching coral ring around a shell throne holding the pearl. */
  private palace(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    const p = T.palace;
    // Safe-zone bubble.
    this.glowDisc(ctx, p.safeRadius, [
      [0.7, 'rgba(45, 212, 191, 0.05)'],
      [0.97, 'rgba(45, 212, 191, 0.18)'],
      [1, 'rgba(45, 212, 191, 0)'],
    ]);
    // Coral branches around the edge.
    const colors = ['#fb7185', '#fda4af', '#f472b6', '#fb923c'];
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const bx = Math.cos(a) * p.safeRadius * 0.92;
      const by = Math.sin(a) * p.safeRadius * 0.92;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + Math.PI);
      ctx.strokeStyle = colors[i % colors.length]!;
      const sway = Math.sin(t / 900 + i) * 0.1;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(70, 0);
      ctx.stroke();
      ctx.lineWidth = 6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(35, 0);
        ctx.lineTo(70, s * (26 + sway * 40));
        ctx.moveTo(55, 0);
        ctx.lineTo(90, s * (14 - sway * 30));
        ctx.stroke();
      }
      ctx.restore();
    }
    // Shell throne.
    ctx.fillStyle = '#fde2e4';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.28, r * 0.5, a + Math.PI / 2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    // Pearl.
    if (this.system.pearlReady) {
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 30 + 10 * Math.sin(t / 250);
      this.glowDisc(ctx, r * 0.55, [
        [0, '#ffffff'],
        [0.7, '#e0f2fe'],
        [1, '#a5b4fc'],
      ]);
      ctx.restore();
    }
  }

  private grotto(ctx: CanvasRenderingContext2D, r: number, t: number): void {
    // Golden idol on a pedestal.
    this.glowDisc(ctx, r * 3, [
      [0, 'rgba(255, 215, 120, 0.5)'],
      [1, 'rgba(255, 215, 120, 0)'],
    ]);
    ctx.fillStyle = '#8a6d58';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 30 + 10 * Math.sin(t / 300);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.35, 0, TAU);
    ctx.fill();
    ctx.fillRect(-r * 0.25, 0, r * 0.5, r * 0.5);
    ctx.restore();
    ctx.fillStyle = '#7a3e00';
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.25, r * 0.06, 0, TAU);
    ctx.arc(r * 0.12, -r * 0.25, r * 0.06, 0, TAU);
    ctx.fill();
  }
}

/** HUD arrow to the current dimension's landmark while it's off-screen. */
export class LandmarkPointerDrawer implements ILayerDrawer {
  constructor(
    private readonly world: WorldSystem,
    private readonly dimension: DimensionState,
    private readonly config: GameConfig,
  ) {}

  draw({ ctx, width, height, camera }: RenderView): void {
    const lm = this.world.landmark;
    const def = landmarkFor(this.dimension.current);
    if (!lm || !def) return;
    const sx = lm.body.position.x - camera.x;
    const sy = lm.body.position.y - camera.y;
    if (sx > -def.radius && sy > -def.radius && sx < width + def.radius && sy < height + def.radius) return;

    const cx = width / 2;
    const cy = height / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const pad = 44;
    const k = Math.min(Math.abs((cx - pad) / Math.cos(a)), Math.abs((cy - pad) / Math.sin(a)));
    ctx.save();
    ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const ly = Math.round(Math.hypot(sx - cx, sy - cy) / this.config.economy.pxPerLy);
    ctx.fillStyle = def.color;
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ox = -Math.cos(a) * 30;
    const oy = -Math.sin(a) * 22;
    ctx.fillText(`${def.name} · ${ly} ly`, ox, oy);
    ctx.font = `500 10px ${FONT}`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(def.tagline, ox, oy + 13);
    ctx.restore();
  }
}
