/**
 * Kill effects: short particle bursts played where an enemy dies. Purely
 * visual (render-time, not physics), shared by the game and shop previews.
 * Velocities are px per 60 Hz frame; everything scales by real elapsed time.
 */

import { MATH_SYMBOLS } from '../config/cosmetics';
import { drawCube } from './tesseract';

type Kind = 'dot' | 'shard' | 'square' | 'spark' | 'ring' | 'bolt' | 'ghost' | 'feather' | 'bubble' | 'cube' | 'text';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ms remaining, and total. */
  life: number;
  maxLife: number;
  /** ms before it appears. */
  delay: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  gravity: number;
  drag: number;
  /** For text particles. */
  text?: string;
  /** For bolts: polyline offsets from (x, y). */
  points?: Array<[number, number]>;
  /** For vortex dots: orbit around (cx, cy). */
  orbit?: { cx: number; cy: number; radius: number; angle: number; spin: number };
}

const TAU = Math.PI * 2;
const FRAME = 1000 / 60;

type Spawner = (fx: KillFxEngine, x: number, y: number, color: string, size: number, rnd: () => number) => void;

function base(p: Partial<Particle> & Pick<Particle, 'kind' | 'x' | 'y' | 'life' | 'size' | 'color'>): Particle {
  return {
    vx: 0,
    vy: 0,
    delay: 0,
    rot: 0,
    vrot: 0,
    gravity: 0,
    drag: 1,
    ...p,
    maxLife: p.life,
  };
}

function radial(rnd: () => number, min: number, max: number): [number, number] {
  const a = rnd() * TAU;
  const s = min + rnd() * (max - min);
  return [Math.cos(a) * s, Math.sin(a) * s];
}

const SPAWNERS: Readonly<Record<string, Spawner>> = {
  'kfx-pop': (fx, x, y, color, size, rnd) => {
    fx.add(base({ kind: 'ring', x, y, life: 300, size: size * 2.5, color }));
    for (let i = 0; i < 14; i++) {
      const [vx, vy] = radial(rnd, 1.5, 3.5);
      fx.add(base({ kind: 'dot', x, y, vx, vy, life: 450, size: 2 + rnd() * 2, color, drag: 0.93 }));
    }
  },
  'kfx-shatter': (fx, x, y, color, size, rnd) => {
    for (let i = 0; i < 10; i++) {
      const [vx, vy] = radial(rnd, 2, 5);
      fx.add(base({
        kind: 'shard', x, y, vx, vy, life: 800, size: size * (0.35 + rnd() * 0.35), color,
        rot: rnd() * TAU, vrot: (rnd() - 0.5) * 0.4, drag: 0.94,
      }));
    }
    fx.add(base({ kind: 'ring', x, y, life: 220, size: size * 2, color: '#ffffff' }));
  },
  'kfx-confetti': (fx, x, y, _color, size, rnd) => {
    const colors = ['#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const [vx, vy] = radial(rnd, 1.5, 4.5);
      fx.add(base({
        kind: 'square', x, y, vx, vy: vy - 2, life: 1300, size: size * 0.18 + 2, color: colors[i % colors.length]!,
        rot: rnd() * TAU, vrot: (rnd() - 0.5) * 0.5, gravity: 0.09, drag: 0.96,
      }));
    }
  },
  'kfx-firework': (fx, x, y, _color, size, rnd) => {
    const hue = rnd() * 360;
    fx.add(base({ kind: 'ring', x, y, life: 350, size: size * 3.5, color: `hsl(${hue}, 100%, 75%)` }));
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * TAU;
      const s = 3 + rnd() * 2;
      fx.add(base({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1000, size: 2,
        color: `hsl(${(hue + (i % 3) * 40) % 360}, 100%, 65%)`, gravity: 0.04, drag: 0.96,
      }));
    }
  },
  'kfx-zap': (fx, x, y, _color, size, rnd) => {
    fx.add(base({ kind: 'dot', x, y, life: 180, size: size * 1.4, color: '#e0f2fe' }));
    for (let b = 0; b < 6; b++) {
      const a0 = rnd() * TAU;
      const points: Array<[number, number]> = [[0, 0]];
      for (let s = 1; s <= 6; s++) {
        const k = s / 6;
        const a = a0 + (rnd() - 0.5) * 0.8;
        const d = size * 3.5 * k;
        points.push([Math.cos(a) * d, Math.sin(a) * d]);
      }
      fx.add(base({ kind: 'bolt', x, y, life: 260, size: 2, color: '#7dd3fc', points }));
    }
  },
  'kfx-vortex': (fx, x, y, color, size, rnd) => {
    for (let i = 0; i < 26; i++) {
      fx.add(base({
        kind: 'dot', x, y, life: 520, size: 2 + rnd() * 1.5, color: i % 2 ? color : '#c4b5fd',
        orbit: { cx: x, cy: y, radius: size * (2.5 + rnd() * 1.5), angle: rnd() * TAU, spin: 0.25 + rnd() * 0.1 },
      }));
    }
    fx.add(base({ kind: 'ring', x, y, life: 260, size: size * 2.2, color: '#ffffff', delay: 480 }));
    fx.add(base({ kind: 'dot', x, y, life: 200, size: size * 0.8, color: '#ffffff', delay: 480 }));
  },
  'kfx-phoenix': (fx, x, y, _color, size, rnd) => {
    fx.add(base({ kind: 'ring', x, y, life: 400, size: size * 3, color: '#f97316' }));
    for (let i = 0; i < 26; i++) {
      const [vx, vy] = radial(rnd, 0.5, 2.5);
      fx.add(base({
        kind: 'dot', x, y, vx, vy, life: 700 + rnd() * 500, size: 2 + rnd() * 3,
        color: ['#fde047', '#f97316', '#dc2626'][i % 3]!, gravity: -0.06, drag: 0.95,
      }));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      fx.add(base({
        kind: 'feather', x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 800, size: size * 0.9,
        color: i % 2 ? '#fbbf24' : '#f97316', rot: a, vrot: 0.05, drag: 0.93,
      }));
    }
  },
  'kfx-pixel': (fx, x, y, color, size, rnd) => {
    const cell = Math.max(3, size / 3);
    for (let gx = -size; gx < size; gx += cell) {
      for (let gy = -size; gy < size; gy += cell) {
        if (gx * gx + gy * gy > size * size) continue;
        const pick = rnd();
        fx.add(base({
          kind: 'square', x: x + gx, y: y + gy,
          vx: gx * 0.04 + (rnd() - 0.5) * 0.6, vy: gy * 0.04 + (rnd() - 0.5) * 0.6,
          life: 500 + rnd() * 600, size: cell * 0.9,
          color: pick < 0.15 ? '#22d3ee' : pick < 0.3 ? '#f0f' : color, drag: 0.97, delay: rnd() * 150,
        }));
      }
    }
  },
  // --- Dimension collection ---
  'kfx-nebula': (fx, x, y, _color, size, rnd) => {
    // A soft pink-violet cloud blooming outward, sprinkled with twinkling stars.
    for (let i = 0; i < 18; i++) {
      const [vx, vy] = radial(rnd, 0.4, 1.6);
      fx.add(base({
        kind: 'dot', x, y, vx, vy, life: 1100, size: size * (0.25 + rnd() * 0.35),
        color: i % 2 ? 'rgba(232, 121, 249, 0.35)' : 'rgba(124, 58, 237, 0.35)', drag: 0.97,
      }));
    }
    for (let i = 0; i < 10; i++) {
      const [vx, vy] = radial(rnd, 1, 2.5);
      fx.add(base({ kind: 'dot', x, y, vx, vy, life: 900, size: 1.5, color: '#fff7ff', drag: 0.96, delay: rnd() * 200 }));
    }
  },
  'kfx-eruption': (fx, x, y, _color, size, rnd) => {
    // Molten blobs thrown up and falling back, over a glowing shock ring.
    fx.add(base({ kind: 'ring', x, y, life: 350, size: size * 2.6, color: '#fb923c' }));
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
      const s = 2.5 + rnd() * 3;
      fx.add(base({
        kind: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 900, size: 2 + rnd() * 3,
        color: ['#fde047', '#f97316', '#b91c1c'][i % 3]!, gravity: 0.14, drag: 0.98,
      }));
    }
  },
  'kfx-freeze': (fx, x, y, _color, size, rnd) => {
    // The enemy freezes solid, then shatters into ice.
    fx.add(base({ kind: 'dot', x, y, life: 220, size: size * 1.1, color: 'rgba(224, 247, 255, 0.85)' }));
    fx.add(base({ kind: 'ring', x, y, life: 400, size: size * 2.4, color: '#7dd3fc', delay: 150 }));
    for (let i = 0; i < 12; i++) {
      const [vx, vy] = radial(rnd, 2, 4.5);
      fx.add(base({
        kind: 'shard', x, y, vx, vy, life: 750, size: size * (0.3 + rnd() * 0.3), color: i % 2 ? '#e0f7ff' : '#7dd3fc',
        rot: rnd() * TAU, vrot: (rnd() - 0.5) * 0.3, drag: 0.94, delay: 150,
      }));
    }
  },
  'kfx-implode': (fx, x, y, _color, size, rnd) => {
    // Darkness collapses inward to a pinpoint, then a violet flash.
    for (let i = 0; i < 30; i++) {
      fx.add(base({
        kind: 'dot', x, y, life: 600, size: 2 + rnd() * 2, color: i % 3 ? '#4c1d95' : '#a78bfa',
        orbit: { cx: x, cy: y, radius: size * (3 + rnd() * 2), angle: rnd() * TAU, spin: -0.2 - rnd() * 0.1 },
      }));
    }
    fx.add(base({ kind: 'dot', x, y, life: 600, size: size * 0.7, color: '#000000' }));
    fx.add(base({ kind: 'ring', x, y, life: 300, size: size * 3, color: '#c4b5fd', delay: 560 }));
  },
  'kfx-haunt': (fx, x, y, _color, size, rnd) => {
    // A green spirit drifts off, trailing ectoplasm.
    fx.add(base({ kind: 'ghost', x, y, vy: -0.9, life: 1500, size: size * 1.1, color: '#a7f3d0' }));
    for (let i = 0; i < 12; i++) {
      const [vx, vy] = radial(rnd, 0.2, 1);
      fx.add(base({ kind: 'dot', x, y, vx, vy, life: 1000, size: 2 + rnd() * 2, color: '#34d399', drag: 0.97, gravity: 0.03 }));
    }
  },
  'kfx-crystallize': (fx, x, y, _color, size, rnd) => {
    // Turns to crystal and bursts into glinting gems.
    const colors = ['#f9a8d4', '#a5f3fc', '#fde68a'];
    for (let i = 0; i < 14; i++) {
      const [vx, vy] = radial(rnd, 1.5, 4);
      fx.add(base({
        kind: 'shard', x, y, vx, vy, life: 900, size: size * (0.3 + rnd() * 0.25), color: colors[i % 3]!,
        rot: rnd() * TAU, vrot: (rnd() - 0.5) * 0.25, drag: 0.95,
      }));
    }
    for (let i = 0; i < 8; i++) {
      const [vx, vy] = radial(rnd, 0.5, 2);
      fx.add(base({ kind: 'spark', x, y, vx, vy, life: 500, size: 1.5, color: '#ffffff', drag: 0.94, delay: rnd() * 250 }));
    }
  },
  'kfx-rubble': (fx, x, y, _color, size, rnd) => {
    // Crumbles into tumbling rocks and a puff of dust.
    for (let i = 0; i < 12; i++) {
      const [vx, vy] = radial(rnd, 1.5, 3.5);
      fx.add(base({
        kind: 'square', x, y, vx, vy: vy - 1.5, life: 1000, size: size * (0.2 + rnd() * 0.25),
        color: ['#8a6d58', '#6b5344', '#a8876b'][i % 3]!, rot: rnd() * TAU, vrot: (rnd() - 0.5) * 0.3,
        gravity: 0.15, drag: 0.98,
      }));
    }
    for (let i = 0; i < 10; i++) {
      const [vx, vy] = radial(rnd, 0.3, 1.2);
      fx.add(base({ kind: 'dot', x, y, vx, vy, life: 900, size: size * 0.35, color: 'rgba(214, 167, 122, 0.25)', drag: 0.97 }));
    }
  },
  'kfx-acid': (fx, x, y, _color, size, rnd) => {
    // A splash of corrosive goo, then bubbles fizzing up.
    for (let i = 0; i < 18; i++) {
      const [vx, vy] = radial(rnd, 1.5, 4);
      fx.add(base({
        kind: 'dot', x, y, vx, vy, life: 700, size: 2 + rnd() * 3, color: i % 2 ? '#84cc16' : '#d9f99d',
        gravity: 0.1, drag: 0.95,
      }));
    }
    for (let i = 0; i < 8; i++) {
      fx.add(base({
        kind: 'bubble', x: x + (rnd() - 0.5) * size, y, vx: (rnd() - 0.5) * 0.4, vy: -0.6 - rnd() * 0.6,
        life: 900, size: 2 + rnd() * 3, color: '#bef264', delay: 150 + rnd() * 300,
      }));
    }
  },
  'kfx-supernova': (fx, x, y, _color, size, rnd) => {
    // Blinding core, two shock rings, and a starburst of rays.
    fx.add(base({ kind: 'dot', x, y, life: 260, size: size * 1.6, color: '#fffbeb' }));
    fx.add(base({ kind: 'ring', x, y, life: 500, size: size * 4.5, color: '#fde047' }));
    fx.add(base({ kind: 'ring', x, y, life: 650, size: size * 6, color: '#f97316', delay: 120 }));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const s = 5 + rnd() * 3;
      fx.add(base({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 450, size: 2.5, color: '#fde047', drag: 0.93 }));
    }
  },
  'kfx-bubbles': (fx, x, y, _color, size, rnd) => {
    // A cluster of bubbles that wobble upward and pop.
    for (let i = 0; i < 16; i++) {
      fx.add(base({
        kind: 'bubble', x: x + (rnd() - 0.5) * size * 1.5, y: y + (rnd() - 0.5) * size,
        vx: (rnd() - 0.5) * 0.8, vy: -0.8 - rnd() * 1.2, life: 800 + rnd() * 600, size: 2 + rnd() * size * 0.3,
        color: i % 3 ? '#ccfbf1' : '#fda4af', drag: 0.99,
      }));
    }
    fx.add(base({ kind: 'ring', x, y, life: 300, size: size * 2, color: '#2dd4bf' }));
  },
  // --- Bundle exclusives ---
  'kfx-tesseract': (fx, x, y, _color, size, rnd) => {
    // Unfolds into eight spinning cubes (a tesseract's cells) flying apart.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      fx.add(base({
        kind: 'cube', x, y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 900, size: size * 0.8,
        color: i % 2 ? '#e879f9' : '#5ee7ff', rot: rnd() * TAU, vrot: 0.12, drag: 0.95,
      }));
    }
    fx.add(base({ kind: 'ring', x, y, life: 300, size: size * 2.5, color: '#5ee7ff' }));
  },
  'kfx-equation': (fx, x, y, _color, size, rnd) => {
    // Solved: symbols scatter in chalk, then "∎" (Q.E.D.) floats up.
    for (let i = 0; i < 10; i++) {
      const [vx, vy] = radial(rnd, 1, 2.5);
      fx.add(base({
        kind: 'text', x, y, vx, vy, life: 900, size: size * 0.9, color: ['#f8fafc', '#fde68a', '#93c5fd'][i % 3]!,
        text: MATH_SYMBOLS[Math.floor(rnd() * MATH_SYMBOLS.length)]!, rot: (rnd() - 0.5) * 0.6, drag: 0.95,
      }));
    }
    fx.add(base({ kind: 'text', x, y, vy: -0.7, life: 1200, size: size * 1.4, color: '#fde68a', text: '∎', delay: 200 }));
  },
  'kfx-soul': (fx, x, y, _color, size, rnd) => {
    fx.add(base({ kind: 'ghost', x, y, vy: -0.8, life: 1600, size: size * 1.1, color: '#e9d5ff', drag: 1 }));
    for (let i = 0; i < 14; i++) {
      const [vx, vy] = radial(rnd, 0.3, 1.5);
      fx.add(base({
        kind: 'dot', x, y, vx, vy: vy - 0.6, life: 900 + rnd() * 400, size: 1.5 + rnd() * 1.5,
        color: i % 2 ? '#c084fc' : '#f0abfc', drag: 0.97,
      }));
    }
  },
};

/** Ids with a spawner (used by tests to catch catalog drift). */
export const KILL_FX_IDS = Object.keys(SPAWNERS);

export class KillFxEngine {
  private readonly particles: Particle[] = [];
  private readonly maxParticles = 1500;

  add(p: Particle): void {
    if (this.particles.length < this.maxParticles) this.particles.push(p);
  }

  get count(): number {
    return this.particles.length;
  }

  spawn(id: string, x: number, y: number, color: string, size: number, random: () => number = Math.random): void {
    (SPAWNERS[id] ?? SPAWNERS['kfx-pop']!)(this, x, y, color, size, random);
  }

  update(dtMs: number): void {
    const k = dtMs / FRAME;
    let w = 0;
    for (const p of this.particles) {
      if (p.delay > 0) {
        p.delay -= dtMs;
        this.particles[w++] = p;
        continue;
      }
      p.life -= dtMs;
      if (p.life <= 0) continue;
      if (p.orbit) {
        // Spiral inward as life runs out.
        const o = p.orbit;
        o.angle += o.spin * k;
        const r = o.radius * (p.life / p.maxLife);
        p.x = o.cx + Math.cos(o.angle) * r;
        p.y = o.cy + Math.sin(o.angle) * r;
      } else {
        p.vy += p.gravity * k;
        const drag = Math.pow(p.drag, k);
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.rot += p.vrot * k;
      }
      this.particles[w++] = p;
    }
    this.particles.length = w;
  }

  /** Draws in whatever coordinate space the context is in (world or preview). */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      if (p.delay > 0) continue;
      const f = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, f * 1.2));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      switch (p.kind) {
        case 'dot':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        case 'ring':
          ctx.lineWidth = 3 * f + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - f) + 2, 0, TAU);
          ctx.stroke();
          break;
        case 'spark':
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
          break;
        case 'shard':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(p.size, 0);
          ctx.lineTo(-p.size * 0.6, p.size * 0.5);
          ctx.lineTo(-p.size * 0.4, -p.size * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        case 'square':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (p.vrot ? 0.6 : 1));
          ctx.restore();
          break;
        case 'bolt':
          ctx.lineWidth = 2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          for (const [dx, dy] of p.points ?? []) ctx.lineTo(p.x + dx, p.y + dy);
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        case 'feather':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.3, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        case 'bubble':
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin((p.maxLife - p.life) / 120 + p.size) * 2, p.y, p.size, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha *= 0.6;
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, TAU);
          ctx.fill();
          break;
        case 'cube':
          drawCube(ctx, p.x, p.y, p.size, p.rot, p.color, ctx.globalAlpha);
          break;
        case 'text':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.font = `600 ${Math.round(p.size)}px "Space Grotesk", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text ?? '', 0, 0);
          ctx.restore();
          break;
        case 'ghost': {
          // A wispy soul: round head, wavy tail, two eyes.
          const s = p.size;
          const sway = Math.sin((p.maxLife - p.life) / 150) * s * 0.3;
          ctx.save();
          ctx.translate(p.x + sway, p.y);
          ctx.globalAlpha *= 0.8;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.6, Math.PI, 0);
          ctx.lineTo(s * 0.6, s * 0.7);
          for (let i = 3; i >= 0; i--) ctx.lineTo(-s * 0.6 + i * s * 0.4, s * (i % 2 ? 0.95 : 0.7));
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#2e1065';
          ctx.beginPath();
          ctx.arc(-s * 0.2, -s * 0.05, s * 0.09, 0, TAU);
          ctx.arc(s * 0.2, -s * 0.05, s * 0.09, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
    ctx.restore();
  }
}
