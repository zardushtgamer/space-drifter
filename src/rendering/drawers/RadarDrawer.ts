import type { GameConfig } from '../../config/gameConfig';
import { Boss } from '../../entities/Boss';
import { Enemy, type EnemyType } from '../../entities/Enemy';
import type { EntityRegistry } from '../../entities/EntityRegistry';
import { Obstacle } from '../../entities/Obstacle';
import type { Player } from '../../entities/Player';
import type { WorldSystem } from '../../systems/WorldSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

const ENEMY_COLORS: Readonly<Record<EnemyType, string>> = {
  chaser: '#ffb020',
  brute: '#c084fc',
  dasher: '#ff5a1f',
  splitter: '#7dd3fc',
  sniper: '#a78bfa',
  phantom: '#6ee7b7',
  swarmer: '#f9a8d4',
  bloater: '#84cc16',
  orbiter: '#fde047',
  jelly: '#fda4af',
};

/** Minimap range (world px from the player to the minimap's edge). */
const MINIMAP_RANGE = 3000;
const MINIMAP_RADIUS = 70;

/**
 * Radar upgrade. Level 1: an arrow on the screen edge toward every off-screen
 * enemy (bigger when closer; bosses pulse). Level 2: adds a sweeping minimap.
 */
export class RadarDrawer implements ILayerDrawer {
  constructor(
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly world: WorldSystem,
    private readonly level: () => number,
    private readonly config: GameConfig,
  ) {}

  draw(view: RenderView): void {
    const level = this.level();
    if (level <= 0) return;
    this.edgeArrows(view);
    if (level >= 2) this.minimap(view);
  }

  private edgeArrows({ ctx, width, height, timeMs, camera }: RenderView): void {
    const cx = width / 2;
    const cy = height / 2;
    const pad = 22;
    ctx.save();
    for (const e of this.registry.all()) {
      const isBoss = e instanceof Boss;
      if ((!(e instanceof Enemy) && !isBoss) || e.dead) continue;
      const sx = e.body.position.x - camera.x;
      const sy = e.body.position.y - camera.y;
      if (sx >= 0 && sy >= 0 && sx <= width && sy <= height) continue;

      const a = Math.atan2(sy - cy, sx - cx);
      const k = Math.min(Math.abs((cx - pad) / Math.cos(a)), Math.abs((cy - pad) / Math.sin(a)));
      const dist = Math.hypot(sx - cx, sy - cy);
      // Closer enemies get bigger, brighter arrows.
      const near = Math.max(0, Math.min(1, 1 - (dist - Math.max(width, height) / 2) / 2000));
      const size = isBoss ? 13 + 3 * Math.sin(timeMs / 120) : 5 + 5 * near;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
      ctx.rotate(a);
      ctx.globalAlpha = isBoss ? 1 : 0.35 + 0.65 * near;
      ctx.fillStyle = isBoss ? '#ff4d6d' : ENEMY_COLORS[(e as Enemy).type];
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, -size * 0.7);
      ctx.lineTo(-size * 0.7, size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private minimap({ ctx, height, timeMs }: RenderView): void {
    const mx = 16 + MINIMAP_RADIUS;
    const my = height - 16 - MINIMAP_RADIUS;
    const scale = MINIMAP_RADIUS / MINIMAP_RANGE;
    const p = this.player.body.position;
    const toMap = (x: number, y: number) => ({ x: mx + (x - p.x) * scale, y: my + (y - p.y) * scale });
    const inRange = (x: number, y: number) => Math.hypot(x - p.x, y - p.y) < MINIMAP_RANGE;

    ctx.save();
    // Dish.
    ctx.fillStyle = 'rgba(5, 20, 12, 0.75)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, MINIMAP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.clip();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
    ctx.lineWidth = 1;
    for (const r of [1 / 3, 2 / 3]) {
      ctx.beginPath();
      ctx.arc(mx, my, MINIMAP_RADIUS * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Sweep.
    const sweep = (timeMs / 1000) * Math.PI;
    const grad = ctx.createConicGradient(sweep - Math.PI / 3, mx, my);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0)');
    grad.addColorStop(1 / 6, 'rgba(74, 222, 128, 0.25)');
    grad.addColorStop(1 / 6 + 0.001, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(mx - MINIMAP_RADIUS, my - MINIMAP_RADIUS, MINIMAP_RADIUS * 2, MINIMAP_RADIUS * 2);

    // Gas giant: an arc of its edge if it's in range.
    const giant = this.world.gasGiant;
    if (giant) {
      const g = toMap(giant.body.position.x, giant.body.position.y);
      ctx.strokeStyle = `hsla(${giant.hue}, 70%, 60%, 0.8)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, this.config.gasGiant.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    const dot = (x: number, y: number, color: string, r: number) => {
      const m = toMap(x, y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const e of this.registry.all()) {
      const { x, y } = e.body.position;
      if (e.dead || !inRange(x, y)) continue;
      if (e instanceof Boss) dot(x, y, '#ff4d6d', 5);
      else if (e instanceof Enemy) dot(x, y, ENEMY_COLORS[e.type], 2.5);
      else if (e instanceof Obstacle && e.type === 'gem') dot(x, y, '#fde047', 1.8);
      else if (e instanceof Obstacle && e.type === 'landmark') {
        const m = toMap(x, y);
        ctx.fillStyle = e.landmark?.color ?? '#ffffff';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - 5);
        ctx.lineTo(m.x + 5, m.y);
        ctx.lineTo(m.x, m.y + 5);
        ctx.lineTo(m.x - 5, m.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // You, in the middle.
    ctx.fillStyle = '#5ee7ff';
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`RADAR · ${MINIMAP_RANGE / 100} ly`, mx, my - MINIMAP_RADIUS - 6);
    ctx.restore();
  }
}
