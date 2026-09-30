import { resolveColor, type BallPattern, type BallSkin } from '../config/cosmetics';
import { mulberry32 } from '../core/random';

/** Draws a ball skin; shared by the game and the shop previews. */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: BallSkin,
  x: number,
  y: number,
  r: number,
  timeMs: number,
  glowBlur: number,
  flash = false,
): void {
  const color = resolveColor(ball.fill, timeMs);
  ctx.save();
  ctx.shadowColor = ball.ring ?? color;
  ctx.shadowBlur = glowBlur;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = flash ? '#ffffff' : color;
  ctx.fill();
  if (ball.pattern && !flash) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.clip();
    drawPattern(ctx, ball.pattern.kind, ball.pattern.color, x, y, r, timeMs);
    ctx.restore();
  }
  if (ball.ring) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = ball.ring;
    ctx.stroke();
  }
  ctx.restore();
}

/** Surface pattern inside an already-clipped ball. Patterns slowly spin so the ball feels like it's rolling. */
function drawPattern(
  ctx: CanvasRenderingContext2D,
  kind: BallPattern,
  color: string,
  x: number,
  y: number,
  r: number,
  t: number,
): void {
  ctx.translate(x, y);
  ctx.fillStyle = color;
  switch (kind) {
    case 'stripes': {
      ctx.rotate(0.5);
      const shift = ((t / 40) % (r * 0.9)) - r * 0.9;
      for (let sx = -r * 2 + shift; sx < r * 2; sx += r * 0.9) ctx.fillRect(sx, -r, r * 0.35, r * 2);
      break;
    }
    case 'spots': {
      ctx.rotate(t / 3000);
      const spots: Array<[number, number, number]> = [
        [-0.35, -0.3, 0.38],
        [0.4, 0.1, 0.3],
        [-0.1, 0.5, 0.22],
        [0.25, -0.55, 0.18],
      ];
      for (const [sx, sy, sr] of spots) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'swirl': {
      ctx.rotate(t / 800);
      ctx.strokeStyle = color;
      ctx.lineWidth = r * 0.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let s = 0; s <= 30; s++) {
        const k = s / 30;
        const a = k * Math.PI * 3;
        ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
      }
      ctx.stroke();
      break;
    }
    case 'core': {
      const pulse = 0.45 + 0.1 * Math.sin(t / 180);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse * 1.6);
      g.addColorStop(0, color);
      g.addColorStop(0.5, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      break;
    }
    case 'eight': {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.font = `700 ${Math.round(r * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('8', 0, r * 0.05);
      break;
    }
  }
}

/**
 * Animated ball decorations (think profile-picture frames). Each effect is
 * drawn in two passes around the ball: 'under' before it, 'over' after it.
 */
export type EffectLayer = 'under' | 'over';

type EffectFn = (ctx: CanvasRenderingContext2D, r: number, t: number, layer: EffectLayer) => void;

const TAU = Math.PI * 2;

/** Jagged flame ring in three additive passes (outer, mid, core RGB), with a dark inner band. */
const makeFlame = (colors: readonly [string, string, string], band: string): EffectFn => (ctx, r, t, layer) => {
  if (layer !== 'under') return;
  const passes = [
    { color: colors[0], amp: 0.75, n: 34, speed: 1 },
    { color: colors[1], amp: 0.48, n: 40, speed: 1.4 },
    { color: colors[2], amp: 0.24, n: 46, speed: 1.9 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of passes) {
    const outer = r * (1.15 + p.amp);
    const g = ctx.createRadialGradient(0, 0, r, 0, 0, outer);
    g.addColorStop(0, `rgba(${p.color}, 0.95)`);
    g.addColorStop(1, `rgba(${p.color}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= p.n; i++) {
      const a = (i / p.n) * TAU;
      const flick =
        0.5 + 0.5 * Math.sin(t * 0.011 * p.speed + i * 1.9) * Math.sin(t * 0.006 * p.speed + i * 0.73);
      const rr = r * (1.08 + p.amp * flick * (i % 2 === 0 ? 1 : 0.55));
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Dark band hugging the ball, like the frame's inner edge.
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.14, 0, TAU);
  ctx.fill();
};

const flame = makeFlame(['29, 78, 216', '34, 211, 238', '224, 242, 254'], '#0b1020');
const inferno = makeFlame(['185, 28, 28', '249, 115, 22', '254, 240, 138'], '#1a0805');

/** Andromeda: two spiral arms of stars wheeling around the ball. */
const galaxy: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'under') return;
  const glow = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2.6);
  glow.addColorStop(0, 'rgba(232, 121, 249, 0.35)');
  glow.addColorStop(1, 'rgba(124, 58, 237, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.6, 0, TAU);
  ctx.fill();
  const colors = ['#ffffff', '#f0abfc', '#c4b5fd'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 26; i++) {
      const k = i / 26;
      const a = t / 1400 + arm * Math.PI + k * 4.2;
      const rr = r * (1.15 + k * 1.4);
      ctx.globalAlpha = 1 - k * 0.8;
      ctx.fillStyle = colors[i % 3]!;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.75, 1.8 - k, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
};

/** Frost Expanse: ice shards orbiting through a cold mist. */
const frostbite: EffectFn = (ctx, r, t, layer) => {
  if (layer === 'under') {
    const mist = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2);
    mist.addColorStop(0, 'rgba(186, 230, 253, 0.4)');
    mist.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.shadowColor = '#7dd3fc';
  ctx.shadowBlur = 10;
  for (let i = 0; i < 6; i++) {
    const a = -t / 1100 + (i / 6) * TAU;
    const d = r * (1.55 + 0.1 * Math.sin(t / 300 + i));
    ctx.save();
    ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? '#e0f7ff' : '#7dd3fc';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, 0);
    ctx.lineTo(0, r * 0.1);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(0, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

/** The Void: dark tentacles writhing out from behind the ball. */
const tendrils: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'under') return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 12;
  for (let i = 0; i < 7; i++) {
    const base = (i / 7) * TAU + t / 3000;
    ctx.beginPath();
    for (let s = 0; s <= 12; s++) {
      const k = s / 12;
      const wiggle = Math.sin(t / 250 + i * 1.3 + k * 5) * 0.35 * k;
      const rr = r * (0.9 + k * 1.5);
      ctx.lineTo(Math.cos(base + wiggle) * rr, Math.sin(base + wiggle) * rr);
    }
    ctx.strokeStyle = i % 2 === 0 ? '#1e1033' : '#4c1d95';
    ctx.lineWidth = r * 0.28;
    ctx.stroke();
  }
  ctx.restore();
};

/** Spectral Veil: ghostly wisps chasing each other around the ball. */
const spirits: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'over') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let w = 0; w < 3; w++) {
    const head = t / 600 + (w / 3) * TAU;
    for (let s = 0; s < 10; s++) {
      const a = head - s * 0.12;
      const rr = r * (1.6 + 0.25 * Math.sin(t / 400 + w * 2 + s * 0.2));
      ctx.globalAlpha = (1 - s / 10) * 0.7;
      ctx.fillStyle = s === 0 ? '#ecfdf5' : '#34d399';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.18 * (1 - s / 12), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
};

/** Crystal Hive: a slowly turning crown of pointed crystals. */
const crystals: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'over') return;
  const colors = ['#f9a8d4', '#a5f3fc', '#fde68a'];
  ctx.save();
  ctx.shadowColor = '#f9a8d4';
  ctx.shadowBlur = 12;
  for (let i = 0; i < 7; i++) {
    const a = t / 2500 + (i / 7) * TAU;
    const pulse = 1 + 0.12 * Math.sin(t / 250 + i);
    const inner = r * 1.2;
    const outer = r * (1.75 + 0.2 * (i % 2)) * pulse;
    const w = 0.16;
    ctx.fillStyle = colors[i % 3]!;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - w) * inner, Math.sin(a - w) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + w) * inner, Math.sin(a + w) * inner);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

/** Swirling accretion disk, infalling sparks, event horizon and a front photon ring. */
const blackhole: EffectFn = (ctx, r, t, layer) => {
  const spin = t / 900;
  if (layer === 'under') {
    const disk = ctx.createRadialGradient(0, 0, r * 1.05, 0, 0, r * 2.6);
    disk.addColorStop(0, 'rgba(255, 170, 60, 0.9)');
    disk.addColorStop(0.35, 'rgba(168, 85, 247, 0.55)');
    disk.addColorStop(1, 'rgba(76, 29, 149, 0)');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, TAU);
    ctx.fill();

    // Spiral arms.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= 24; s++) {
        const k = s / 24;
        const a = spin * 2 + (arm / 3) * TAU + k * 3;
        const rr = r * (2.4 - k * 1.3);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    // Sparks falling in.
    for (let i = 0; i < 16; i++) {
      const phase = (t / 1600 + i / 16) % 1;
      const a = i * 2.39 + phase * 5;
      const rr = r * (2.5 - phase * 1.4);
      ctx.fillStyle = `rgba(255, 237, 213, ${phase})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Event horizon.
    ctx.save();
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(254, 215, 170, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.1, r * 0.42, Math.sin(spin) * 0.12, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
};

/** Three little moons on a tilted orbit, passing behind and in front of the ball. */
const orbit: EffectFn = (ctx, r, t, layer) => {
  const tilt = -0.45;
  if (layer === 'under') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.1, r * 0.75, tilt, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  const colors = ['#fde68a', '#a5f3fc', '#f9a8d4'];
  for (let i = 0; i < 3; i++) {
    const a = t / 700 + (i / 3) * TAU;
    const behind = Math.sin(a) < 0;
    if (behind !== (layer === 'under')) continue;
    const ex = Math.cos(a) * r * 2.1;
    const ey = Math.sin(a) * r * 0.75;
    const x = ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const y = ex * Math.sin(tilt) + ey * Math.cos(tilt);
    ctx.save();
    ctx.shadowColor = colors[i]!;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors[i]!;
    ctx.globalAlpha = behind ? 0.6 : 1;
    ctx.beginPath();
    ctx.arc(x, y, r * (behind ? 0.2 : 0.26), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
};

/** Crackling lightning bolts that re-strike every few frames. */
const storm: EffectFn = (ctx, r, t, layer) => {
  if (layer === 'under') {
    const g = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2);
    g.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2, 0, TAU);
    ctx.fill();
    return;
  }
  const rng = mulberry32(Math.floor(t / 70));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 12;
  for (let b = 0; b < 3; b++) {
    const a0 = rng() * TAU;
    const pts: Array<[number, number]> = [];
    for (let s = 0; s <= 6; s++) {
      const k = s / 6;
      const a = a0 + (rng() - 0.5) * 0.9 * k;
      const rr = r * (1 + k * (0.9 + rng() * 0.5));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    for (const [w, c] of [[3.5, 'rgba(56, 189, 248, 0.8)'], [1.2, '#ffffff']] as const) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
};

/** Two counter-rotating golden rings with twinkling sparkles. */
const halo: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'over') return;
  ctx.save();
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -t / 25;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.45, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 9]);
  ctx.lineDashOffset = t / 35;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.75, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fffbeb';
  for (let i = 0; i < 4; i++) {
    const a = t / 1500 + (i / 4) * TAU;
    const s = r * 0.18 * (0.6 + 0.4 * Math.sin(t / 150 + i * 2));
    const x = Math.cos(a) * r * 1.75;
    const y = Math.sin(a) * r * 1.75;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.3, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.3, y);
    ctx.closePath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x, y + s * 0.3);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y - s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

/** Rock Caverns: a tilted ring of tumbling boulders, passing behind and in front of the ball. */
const debris: EffectFn = (ctx, r, t, layer) => {
  const tilt = 0.35;
  for (let i = 0; i < 9; i++) {
    const a = t / 1600 + (i / 9) * TAU;
    const behind = Math.sin(a) < 0;
    if (behind !== (layer === 'under')) continue;
    const ex = Math.cos(a) * r * 2;
    const ey = Math.sin(a) * r * 0.6;
    const x = ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const y = ex * Math.sin(tilt) + ey * Math.cos(tilt);
    const size = r * (0.16 + 0.1 * ((i * 0.53) % 1)) * (behind ? 0.8 : 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t / 500 + i);
    ctx.fillStyle = behind ? '#4a3f38' : i % 2 === 0 ? '#8a6d58' : '#a8876b';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const b = (k / 6) * TAU;
      const rr = size * (0.75 + 0.25 * (((i + 1) * (k + 3) * 0.37) % 1));
      ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

/** Toxic Bloom: glowing spores puffing outward and fading. */
const spores: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'under') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const phase = (t / 2200 + i / 18) % 1;
    const a = i * 2.39 + Math.sin(t / 1500 + i) * 0.3;
    const d = r * (1.1 + phase * 1.6);
    ctx.globalAlpha = (1 - phase) * 0.8;
    ctx.fillStyle = i % 3 === 0 ? '#ecfccb' : '#84cc16';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.08 + phase * 0.12), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

/** Solar Storm: a turning crown of sun rays. */
const corona: EffectFn = (ctx, r, t, layer) => {
  if (layer !== 'under') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2.2);
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.5)');
  glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = t / 2000 + (i / 12) * TAU;
    const len = r * (0.7 + 0.35 * Math.sin(t / 250 + i * 1.3));
    ctx.fillStyle = i % 2 === 0 ? 'rgba(253, 224, 71, 0.8)' : 'rgba(251, 146, 60, 0.7)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.12) * r * 1.05, Math.sin(a - 0.12) * r * 1.05);
    ctx.lineTo(Math.cos(a) * (r * 1.1 + len), Math.sin(a) * (r * 1.1 + len));
    ctx.lineTo(Math.cos(a + 0.12) * r * 1.05, Math.sin(a + 0.12) * r * 1.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

/** Nebula Reef: a little school of fish circling, passing behind and in front. */
const fishschool: EffectFn = (ctx, r, t, layer) => {
  const colors = ['#fda4af', '#2dd4bf', '#fde68a', '#fb7185', '#5eead4'];
  for (let i = 0; i < 5; i++) {
    const a = t / 900 + (i / 5) * TAU + Math.sin(t / 600 + i) * 0.15;
    const behind = Math.sin(a) < 0;
    if (behind !== (layer === 'under')) continue;
    const x = Math.cos(a) * r * 1.9;
    const y = Math.sin(a) * r * 0.8;
    const s = r * (behind ? 0.2 : 0.26);
    ctx.save();
    ctx.translate(x, y);
    // Face the direction of travel (counter-clockwise tangent).
    ctx.rotate(Math.atan2(Math.cos(a) * 0.8, -Math.sin(a) * 1.9));
    ctx.globalAlpha = behind ? 0.6 : 1;
    ctx.fillStyle = colors[i]!;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU);
    ctx.fill();
    const wag = Math.sin(t / 90 + i) * s * 0.3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.5, -s * 0.5 + wag);
    ctx.lineTo(-s * 1.5, s * 0.5 + wag);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

const EFFECT_FNS: Readonly<Record<string, EffectFn>> = {
  spores,
  corona,
  fishschool,
  debris,
  flame,
  blackhole,
  orbit,
  storm,
  halo,
  galaxy,
  inferno,
  frostbite,
  tendrils,
  spirits,
  crystals,
};

/** Effect ids with an animation (used by tests to catch catalog/renderer drift). */
export const EFFECT_IDS = Object.keys(EFFECT_FNS);

/** Draws one layer of an effect centered at (x, y) around a ball of radius r. */
export function drawEffect(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  r: number,
  timeMs: number,
  layer: EffectLayer,
): void {
  const fn = EFFECT_FNS[id];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  fn(ctx, r, timeMs, layer);
  ctx.restore();
}
