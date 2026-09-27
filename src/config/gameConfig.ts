/**
 * Every tunable number in the game lives here.
 *
 * Units: Matter.js 0.20 measures velocity in px per base step (1000/60 ms),
 * independent of the delta passed to Engine.update. We step at exactly that
 * interval, so "px/step" below is exact. Use `pxPerSecToStep` to convert.
 */

export const PALETTE = {
  space: '#05070d',
  player: '#5ee7ff',
  boss: '#ff4d6d',
  rock: '#454b63',
  rockStroke: '#9aa0b8',
  good: '#4ade80',
} as const;

const STEP_MS = 1000 / 60;

export const gameConfig = {
  physics: {
    stepMs: STEP_MS,
    /** Max catch-up steps per animation frame (prevents spiral of death). */
    maxStepsPerFrame: 5,
    /** Thick walls prevent tunneling at MAX_SPEED. Raise if MAX_SPEED grows. */
    wallThickness: 200,
    wallRestitution: 0.75,
  },

  /** Matter collision categories (bit flags), one per kind. */
  collision: {
    player: 0x0001,
    boss: 0x0002,
    obstacle: 0x0004,
    wall: 0x0008,
  },

  render: {
    maxDevicePixelRatio: 2,
  },

  player: {
    radius: 17,
    frictionAir: 0.001,
    restitution: 0.8,
    friction: 0,
    frictionStatic: 0,
    density: 0.001,
    maxHp: 100,
  },

  launch: {
    /** Max drag length in CSS px. */
    maxDrag: 230,
    /** px/step of velocity added per px of drag. */
    forceScale: 0.075,
    /** px/step. Raising this risks tunneling through walls. */
    maxSpeed: 20,
  },

  boss: {
    radius: 46,
    density: 0.003,
    frictionAir: 0.02,
    restitution: 0.6,
    maxHp: 160,
    /** Homing force per unit mass, px/step^2. */
    homingAccel: 0.00045,
    /** Perpendicular weave force per unit mass, px/step^2. */
    weaveAccel: 0.0003,
    /** Weave oscillation frequency, cycles per second. */
    weaveHz: 0.4,
    /** px/step. */
    maxSpeed: 3.2,
  },

  obstacles: {
    count: 11,
    minRadius: 20,
    maxRadius: 42,
    density: 0.002,
    frictionAir: 0.04,
    restitution: 0.6,
    friction: 0.05,
    /** Extra spacing between obstacles when spawning. */
    spawnGap: 12,
    /** Radius around the center kept free for the player spawn. */
    centerClearRadius: 140,
    /** Margin from the screen edges when spawning. */
    edgeMargin: 30,
    maxSpawnAttempts: 400,
    /** Below this speed (px/step) an obstacle is snapped to rest. */
    settleSpeed: 0.02,
  },

  combat: {
    bossContactDamage: 9,
    bossContactCooldownMs: 450,
    /** Relative speed (px/step) needed for the player to hurt the boss. */
    rammingSpeedThreshold: 6,
    /** damage = clamp((relSpeed - threshold) / divisor, min, max) */
    rammingDamageDivisor: 0.5,
    rammingMinDamage: 4,
    rammingMaxDamage: 22,
    rammingCooldownMs: 350,
  },

  effects: {
    hitFlashMs: 120,
    shakeMs: 220,
    shakeMagnitude: 8,
    glowBlur: 24,
    starCount: 160,
    starMaxRadius: 1.4,
    twinkleHz: 0.6,
    aimDash: [8, 8] as const,
    aimLineWidth: 2,
    aimAlpha: 0.85,
    dragOriginRadius: 6,
    dragOriginAlpha: 0.35,
  },
} as const;

export type GameConfig = typeof gameConfig;

export function pxPerSecToStep(pxPerSec: number): number {
  return pxPerSec * (STEP_MS / 1000);
}
