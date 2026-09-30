import Matter from 'matter-js';
import type { DimensionState } from '../../config/dimensions';
import { devFlag } from '../../config/devTools';
import type { GameConfig } from '../../config/gameConfig';
import type { SaveData } from '../../core/SaveData';
import type { TimeScale } from '../../core/TimeScale';
import { Boss } from '../../entities/Boss';
import { Enemy } from '../../entities/Enemy';
import type { Entity } from '../../entities/Entity';
import type { EntityRegistry } from '../../entities/EntityRegistry';
import { Obstacle } from '../../entities/Obstacle';
import type { Player } from '../../entities/Player';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const { Composite } = Matter;
const FONT = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

/**
 * Dev overlays (shop → DEV TOOLS): hitboxes, velocity vectors, gravity fields,
 * and a stats readout. 'world' draws over the scene in world space; 'hud' draws the stats.
 */
export class DebugDrawer implements ILayerDrawer {
  private lastFrameMs = 0;
  private fps = 60;

  constructor(
    private readonly layer: 'world' | 'hud',
    private readonly save: SaveData,
    private readonly registry: EntityRegistry,
    private readonly physics: PhysicsWorld,
    private readonly player: Player,
    private readonly dimension: DimensionState,
    private readonly timeScale: TimeScale,
    private readonly config: GameConfig,
  ) {}

  private on(id: 'hitboxes' | 'velocity' | 'fields' | 'stats'): boolean {
    return this.save.flag(devFlag(id));
  }

  draw(view: RenderView): void {
    if (this.layer === 'hud') {
      if (this.on('stats')) this.stats(view);
      return;
    }
    const hitboxes = this.on('hitboxes');
    const velocity = this.on('velocity');
    const fields = this.on('fields');
    if (!hitboxes && !velocity && !fields) return;

    const { ctx, camera, width, height } = view;
    const margin = 200;
    const visible = (e: Entity) => {
      const b = e.body.bounds;
      return (
        b.max.x > camera.x - margin &&
        b.min.x < camera.x + width + margin &&
        b.max.y > camera.y - margin &&
        b.min.y < camera.y + height + margin
      );
    };

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    for (const e of this.registry.all()) {
      if (fields) this.field(ctx, e);
      if (!visible(e)) continue;
      if (hitboxes) this.hitbox(ctx, e);
      if (velocity) this.vector(ctx, e);
    }
    ctx.restore();
  }

  /** The body's actual collision polygon. */
  private hitbox(ctx: CanvasRenderingContext2D, e: Entity): void {
    const body = e.body;
    const color =
      e === this.player ? '#5ee7ff'
      : e instanceof Boss ? '#ff4dff'
      : e instanceof Enemy ? '#ff4d6d'
      : body.isSensor ? '#60a5fa'
      : '#e5e7eb';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (body.isSensor) ctx.setLineDash([6, 5]);
    // Gas giants don't collide at all (mask 0): show them faintly.
    if (body.collisionFilter.mask === 0) ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (const v of body.vertices) ctx.lineTo(v.x, v.y);
    ctx.closePath();
    ctx.stroke();
    // Center point.
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillRect(body.position.x - 1.5, body.position.y - 1.5, 3, 3);
    ctx.restore();
  }

  /** Velocity × 8 as a line, labelled with speed for the player. */
  private vector(ctx: CanvasRenderingContext2D, e: Entity): void {
    const body = e.body;
    if (body.isStatic) return;
    const v = body.velocity;
    const speed = Math.hypot(v.x, v.y);
    if (speed < 0.05) return;
    const p = body.position;
    const k = 8;
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + v.x * k, p.y + v.y * k);
    ctx.stroke();
    const a = Math.atan2(v.y, v.x);
    ctx.translate(p.x + v.x * k, p.y + v.y * k);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (e === this.player) {
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.font = `11px ${FONT}`;
      ctx.fillText(`${speed.toFixed(2)} px/step`, p.x + 22, p.y - 22);
      ctx.restore();
    }
  }

  /** Reach rings for everything with gravity (red = pull, green = push). */
  private field(ctx: CanvasRenderingContext2D, e: Entity): void {
    if (!(e instanceof Obstacle)) return;
    const r = e.body.circleRadius ?? 0;
    const c = this.config;
    const reach =
      e.type === 'planet' ? r * c.planets.pullRadiusScale
      : e.type === 'blackhole' ? r * c.blackHoles.pullRadiusScale
      : e.type === 'rift' ? r * c.rifts.pullRadiusScale
      : e.type === 'repulsor' ? r * c.hazards.repulsor.pushRadiusScale
      : e.type === 'ton618' ? r * c.ton618.reachScale
      : e.type === 'gasgiant' ? r * c.gasGiant.reachScale
      : 0;
    if (reach <= 0) return;
    const p = e.body.position;
    ctx.save();
    ctx.strokeStyle = e.type === 'repulsor' ? 'rgba(74, 222, 128, 0.7)' : 'rgba(255, 77, 109, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `11px ${FONT}`;
    ctx.fillText(`${e.type} reach ${Math.round(reach)}px`, p.x + 6, p.y - reach - 6);
    ctx.restore();
  }

  private stats({ ctx, width, timeMs }: RenderView): void {
    const dt = timeMs - this.lastFrameMs;
    this.lastFrameMs = timeMs;
    if (dt > 0 && dt < 1000) this.fps += (1000 / dt - this.fps) * 0.05;

    const b = this.player.body;
    const v = b.velocity;
    const speed = Math.hypot(v.x, v.y);
    let enemies = 0;
    let obstacles = 0;
    let entities = 0;
    for (const e of this.registry.all()) {
      entities++;
      if (e instanceof Enemy || e instanceof Boss) enemies++;
      else if (e instanceof Obstacle) obstacles++;
    }
    const lines = [
      `FPS        ${this.fps.toFixed(0)}`,
      `bodies     ${Composite.allBodies(this.physics.engine.world).length}`,
      `entities   ${entities}  (enemies ${enemies}, obstacles ${obstacles})`,
      `pos        ${b.position.x.toFixed(0)}, ${b.position.y.toFixed(0)}`,
      `vel        ${v.x.toFixed(2)}, ${v.y.toFixed(2)}  |${speed.toFixed(2)}|`,
      `mach       ${(speed / this.config.player.machSpeed).toFixed(2)}`,
      `dimension  ${this.dimension.current}`,
      `timescale  ${this.timeScale.value.toFixed(2)}`,
    ];
    const w = 290;
    const x = width - w - 16;
    const y = 90;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x, y, w, lines.length * 15 + 12);
    ctx.fillStyle = '#4ade80';
    ctx.font = `11px ${FONT}`;
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 6 + i * 15));
    ctx.restore();
  }
}
