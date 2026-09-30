/**
 * Wireframe hypercube (tesseract) and cube drawing. The tesseract is rotated in
 * 4D (XW and ZW planes, plus a little XY), then projected 4D → 3D → 2D with
 * perspective, which is what makes it appear to turn itself inside out.
 */

type V4 = [number, number, number, number];

/** 16 vertices at (±1, ±1, ±1, ±1). */
const VERTS4: readonly V4[] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);

/** 32 edges: vertex pairs differing in exactly one coordinate (one bit). */
const EDGES4: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) {
    const j = i ^ (1 << b);
    if (i < j) out.push([i, j]);
  }
  return out;
})();

function rotate(v: V4, a: number, b: number, angle: number): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = v[a]!;
  const y = v[b]!;
  v[a] = x * c - y * s;
  v[b] = x * s + y * c;
}

export interface WireStyle {
  /** Edges of the "outer" cell (w > 0 before rotation). */
  readonly outer: string;
  /** Edges of the "inner" cell and the connecting edges. */
  readonly inner: string;
  readonly lineWidth: number;
  readonly glow?: string;
  readonly alpha?: number;
}

/** Draws a tesseract centered at (x, y), roughly `size` px in radius, at time `t` ms. */
export function drawTesseract(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  style: WireStyle,
  speed = 1,
): void {
  const a1 = (t / 2200) * speed;
  const a2 = (t / 3100) * speed;
  const a3 = (t / 5000) * speed;
  const projected = VERTS4.map((v0) => {
    const v: V4 = [v0[0], v0[1], v0[2], v0[3]];
    rotate(v, 0, 3, a1); // XW
    rotate(v, 2, 3, a2); // ZW
    rotate(v, 0, 1, a3); // XY
    rotate(v, 1, 2, 0.5); // fixed tilt so it reads as 3D
    // 4D → 3D perspective, then 3D → 2D.
    const k4 = 2.2 / (3 - v[3]);
    const px = v[0] * k4;
    const py = v[1] * k4;
    const pz = v[2] * k4;
    const k3 = 2.2 / (3.4 - pz);
    return { x: x + px * k3 * size * 0.62, y: y + py * k3 * size * 0.62, depth: pz };
  });

  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.lineWidth = style.lineWidth;
  ctx.lineCap = 'round';
  if (style.glow) {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = style.lineWidth * 5;
  }
  for (const [i, j] of EDGES4) {
    const a = projected[i]!;
    const b = projected[j]!;
    // Outer cell: both ends at w = +1; everything else reads as inner/connecting.
    const outer = VERTS4[i]![3] > 0 && VERTS4[j]![3] > 0;
    ctx.strokeStyle = outer ? style.outer : style.inner;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Vertex sparks.
  ctx.fillStyle = style.outer;
  for (const p of projected) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, style.lineWidth * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Plain rotating 3D wireframe cube (for the cube trail). */
export function drawCube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  alpha: number,
): void {
  const verts = Array.from({ length: 8 }, (_, i) => {
    let vx = i & 1 ? 1 : -1;
    let vy = i & 2 ? 1 : -1;
    let vz = i & 4 ? 1 : -1;
    // Rotate about Y then X.
    const cy = Math.cos(angle);
    const sy = Math.sin(angle);
    [vx, vz] = [vx * cy - vz * sy, vx * sy + vz * cy];
    const cx = Math.cos(angle * 0.7);
    const sx = Math.sin(angle * 0.7);
    [vy, vz] = [vy * cx - vz * sx, vy * sx + vz * cx];
    const k = 2.4 / (3.4 - vz);
    return { x: x + vx * k * size * 0.5, y: y + vy * k * size * 0.5 };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) for (let b = 0; b < 3; b++) {
    const j = i ^ (1 << b);
    if (i >= j) continue;
    ctx.moveTo(verts[i]!.x, verts[i]!.y);
    ctx.lineTo(verts[j]!.x, verts[j]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Exposed for tests. */
export const TESSERACT = { vertices: VERTS4.length, edges: EDGES4.length };
