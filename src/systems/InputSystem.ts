import Matter from 'matter-js';
import type { DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { GameStateMachine } from '../core/GameStateMachine';
import { computeLaunch, dragVector } from '../core/launchMath';
import type { Vec2 } from '../core/types';
import type { Player } from '../entities/Player';
import type { ISystem } from './ISystem';

const { Body } = Matter;

/** Pointer drag on the canvas -> launch impulse on the player. */
export class InputSystem implements ISystem {
  private pointerId: number | null = null;
  private from: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly player: Player,
    private readonly state: GameStateMachine,
    private readonly bus: EventBus<EventMap>,
    private readonly config: GameConfig,
    private readonly dimension?: DimensionState,
    /** Thrusters upgrade multiplier, read live. */
    private readonly launchPower: () => number = () => 1,
  ) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
  }

  /** Launch power / top-speed multiplier: the dimension's, times the Thrusters upgrade. */
  private get speedScale(): number {
    return (this.dimension?.theme.playerSpeedScale ?? 1) * this.launchPower();
  }

  /** In slow dimensions, cap the player's speed so nothing (gravity, bounces) flings it past the limit. */
  update(): void {
    if ((this.dimension?.theme.playerSpeedScale ?? 1) >= 1) return;
    const scale = this.speedScale;
    const max = this.config.launch.maxSpeed * scale;
    const v = this.player.body.velocity;
    const speed = Math.hypot(v.x, v.y);
    if (speed > max) Body.setVelocity(this.player.body, { x: (v.x / speed) * max, y: (v.y / speed) * max });
  }

  private onDown = (e: PointerEvent): void => {
    if (this.pointerId !== null || !this.state.is('playing')) return;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.from = this.toLocal(e);
    this.bus.emit('drag:start', { from: this.from });
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const d = dragVector(this.from, this.toLocal(e), this.config.launch.maxDrag);
    this.bus.emit('drag:update', { from: this.from, to: { x: this.from.x + d.x, y: this.from.y + d.y } });
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    if (this.state.is('playing')) {
      const body = this.player.body;
      const l = this.config.launch;
      const scale = this.speedScale;
      const { velocity, force } = computeLaunch(Body.getVelocity(body), this.from, this.toLocal(e), {
        maxDrag: l.maxDrag,
        forceScale: l.forceScale * scale,
        maxSpeed: l.maxSpeed * scale,
      });
      if (force > 0) {
        Body.setVelocity(body, velocity);
        this.bus.emit('player:launched', { force });
      }
    }
    this.endDrag(e);
  };

  private onCancel = (e: PointerEvent): void => {
    if (e.pointerId === this.pointerId) this.endDrag(e);
  };

  private endDrag(e: PointerEvent): void {
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.pointerId = null;
    this.bus.emit('drag:end');
  }

  private toLocal(e: PointerEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.pointerId = null;
  }
}
