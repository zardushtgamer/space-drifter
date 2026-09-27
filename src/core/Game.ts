import type { GameConfig } from '../config/gameConfig';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { IRenderer } from '../rendering/IRenderer';
import type { ISystem } from '../systems/ISystem';
import type { IClock } from './Clock';
import type { GameStateMachine } from './GameStateMachine';
import type { IDisposable } from './types';
import type { Viewport } from './Viewport';

export interface GameDeps {
  physics: PhysicsWorld;
  renderer: IRenderer;
  systems: readonly ISystem[];
  state: GameStateMachine;
  viewport: Viewport;
  clock: IClock;
  config: GameConfig;
}

/** Fixed-timestep physics + systems, rendering on requestAnimationFrame. */
export class Game implements IDisposable {
  private rafId: number | null = null;
  private lastMs = 0;
  private accumulatorMs = 0;
  private offResize: (() => void) | null = null;

  constructor(private readonly deps: GameDeps) {}

  start(): void {
    const { physics, renderer, viewport, clock } = this.deps;
    this.offResize = viewport.onResize((w, h) => {
      physics.setBounds(w, h);
      renderer.resize(w, h);
    });
    this.lastMs = clock.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private frame = (): void => {
    const { physics, renderer, systems, state, clock, config } = this.deps;
    const { stepMs, maxStepsPerFrame } = config.physics;
    const now = clock.now();
    this.accumulatorMs += now - this.lastMs;
    this.lastMs = now;

    let steps = 0;
    while (this.accumulatorMs >= stepMs && steps < maxStepsPerFrame) {
      if (state.is('playing')) {
        for (const s of systems) s.update(stepMs);
        physics.step(stepMs);
      }
      this.accumulatorMs -= stepMs;
      steps++;
    }
    // Drop backlog after a stall (e.g. tab in background) instead of fast-forwarding.
    if (steps === maxStepsPerFrame) this.accumulatorMs = 0;

    renderer.render(now);
    this.rafId = requestAnimationFrame(this.frame);
  };

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.offResize?.();
    this.offResize = null;
    for (const s of this.deps.systems) s.dispose();
  }
}
