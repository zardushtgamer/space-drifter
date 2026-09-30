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
  enemy: '#ffb020',
  brute: '#c084fc',
  mine: '#ff3b3b',
  bullet: '#ffd6e0',
} as const;

const STEP_MS = 1000 / 60;

export const gameConfig = {
  physics: {
    stepMs: STEP_MS,
    /** Max catch-up steps per animation frame (prevents spiral of death). */
    maxStepsPerFrame: 5,
  },

  /** Matter collision categories (bit flags), one per kind. */
  collision: {
    player: 0x0001,
    boss: 0x0002,
    obstacle: 0x0004,
    enemy: 0x0008,
  },

  render: {
    maxDevicePixelRatio: 2,
    /** Extra px around the screen before an entity is culled from drawing. */
    cullMargin: 400,
  },

  camera: {
    /** Fraction of the gap to the player closed per step. */
    followLerp: 0.12,
  },

  player: {
    radius: 17,
    frictionAir: 0.001,
    restitution: 0.8,
    friction: 0,
    frictionStatic: 0,
    density: 0.001,
    maxHp: 100,
    /** Invulnerability after taking a hit. */
    hurtCooldownMs: 450,
    /** Speed of Mach 1, px/step. Base top speed (15) is about Mach 1.9. */
    machSpeed: 8,
  },

  launch: {
    /** Max drag length in CSS px. */
    maxDrag: 230,
    /** px/step of velocity added per px of drag. */
    forceScale: 0.06,
    /** px/step. */
    maxSpeed: 15,
  },

  /** Infinite field, generated in square chunks around the player. */
  world: {
    chunkSize: 700,
    /** Chunks within this Chebyshev distance of the player's chunk are loaded. */
    loadRadius: 3,
    /** Chunks beyond this distance are unloaded (hysteresis vs loadRadius). */
    unloadRadius: 4,
    seed: 1337,
  },

  obstacles: {
    minPerChunk: 2,
    maxPerChunk: 5,
    minRadius: 20,
    maxRadius: 42,
    density: 0.002,
    frictionAir: 0.04,
    restitution: 0.6,
    friction: 0.05,
    /** Extra spacing between obstacles when spawning. */
    spawnGap: 12,
    /** Radius around the world origin kept free for the player spawn. */
    centerClearRadius: 220,
    /** Never pop an obstacle in closer than this to the player. */
    playerClearRadius: 500,
    maxSpawnAttempts: 20,
    /** Chance an obstacle is a mine instead of a rock. */
    mineChance: 0.18,
    mineRadius: 14,
    mineDamage: 18,
    /** px/step the player is knocked away from an exploding mine. */
    mineKnockback: 9,
    /** Chance a chunk contains a health pack. */
    healthPackChance: 0.3,
    healthPackRadius: 15,
    healthPackHeal: 50,
  },

  /** Harmless static planets whose gravity pulls the player in when close. */
  planets: {
    /** Chance a chunk contains a planet. */
    chance: 0.14,
    minRadius: 55,
    maxRadius: 105,
    /** Gravity reaches this multiple of the planet radius. */
    pullRadiusScale: 3.6,
    /** px/step of velocity added per step at the surface; fades to 0 at the edge. */
    pullStrength: 0.32,
    restitution: 0.85,
  },

  /** Rare black holes: huge pull, time dilation, and a wormhole at the center. */
  blackHoles: {
    /** Chance a chunk contains a black hole. */
    chance: 0.035,
    /** Event horizon radius. */
    radius: 38,
    pullRadiusScale: 10,
    /** px/step per step at the horizon, fading to 0 at the edge of reach. */
    pullStrength: 0.6,
    /** Enemies get pulled too, at this fraction of the player's pull. */
    enemyPullFactor: 0.6,
    /** Crossing this fraction of the horizon radius triggers the wormhole. */
    swallowScale: 0.8,
    warpMinDistance: 6000,
    warpMaxDistance: 12000,
    /** px/step the player is flung out of the exit. */
    exitSpeed: 11,
    /** Exit point distance from the partner's center, as a fraction of its pull reach. */
    exitReachFraction: 0.6,
    /** Wormholes ignore the player this long after a jump, so it can escape the exit. */
    reentryCooldownMs: 1500,
    invulnMs: 1800,
    warpFxMs: 1400,
    /** Game speed at the horizon (1 = normal); scales linearly across the reach. */
    minTimeScale: 0.4,
  },

  /** Rock Caverns: solid rock walls generated from noise, meshed into rectangles per chunk. */
  caves: {
    largeScale: 340,
    smallScale: 110,
    threshold: 0.52,
    /** Wall grid cell size, px (must divide world.chunkSize). */
    cellSize: 50,
    /** Walls are drawn this much larger than their bodies so neighbors blend. */
    drawOverlap: 8,
    restitution: 0.7,
    /** Enemy spawn tries before giving up on finding open space. */
    spawnAttempts: 16,
    /** Strength of the bright wash over the whole screen (0..1). */
    brightness: 0.35,
    /** Extra-bright glow radius around the player, px. */
    lightRadius: 420,
  },

  /** A colossal gas giant in every dimension: fly in and you'll have to fight your way back out. */
  gasGiant: {
    /** 50 ly radius = 100 ly across. */
    radius: 5000,
    /** Distance of its center from the origin (direction differs per dimension). */
    distance: 20_000,
    /** Gravity reaches this multiple of the radius. */
    reachScale: 1.5,
    /** Pull outside the atmosphere at its surface, px/step per step (fades to 0 at reach). */
    outerPull: 0.2,
    /** Pull inside the atmosphere: base at the cloud tops, plus extra toward the core. */
    innerPull: 0.12,
    corePullExtra: 0.2,
    /** Thick gas: velocity multiplier per step inside the atmosphere. */
    drag: 0.992,
    /** Crushing pressure near the center. */
    coreRadius: 900,
    coreDamage: 8,
    /** Enemies feel this fraction of the pull. */
    enemyPullFactor: 0.5,
  },

  /** TON 618: the supermassive black hole at the center of The Void. */
  ton618: {
    /** Event horizon radius. Crossing it is fatal. */
    radius: 450,
    /** Gravity reaches this multiple of the radius. */
    reachScale: 8,
    /** Player/enemy pull (px/step per step) at the horizon, fading to 0 at the edge of reach. */
    pullStrength: 0.9,
    /** Obstacles (even planets) drift in at this speed range, px/step: slow at the edge, fast near the horizon. */
    obstacleMinSpeed: 0.4,
    obstacleMaxSpeed: 7,
    /** Time dilation kicks in within this multiple of the radius. */
    dilationScale: 2.2,
    /** Game speed at the horizon. */
    minTimeScale: 0.45,
    /** Keep freshly generated obstacles out of this multiple of the radius. */
    clearScale: 1.6,
  },

  /** Dimension holes: portals between the Milky Way and Andromeda. */
  rifts: {
    /** When true, every area is open from the start (no unlock needed). */
    free: true,
    /** Otherwise, clearing this round unlocks the other areas (saved across runs). */
    unlockRound: 15,
    /** Once unlocked, chance a spawned black hole is a dimension hole instead. */
    chanceOfBlackHole: 0.35,
    radius: 42,
    pullRadiusScale: 8,
    pullStrength: 0.5,
    swallowScale: 0.8,
  },

  enemies: {
    /** Spawn ring distance from the player, beyond the screen edge. */
    spawnPadding: 140,
    /** Enemies farther than this are moved back to just off-screen. */
    leashDistance: 2600,
  },

  /** Round structure: every `bossEvery`th round is a boss alone; the rest are enemy waves. */
  rounds: {
    bossEvery: 10,
    /** Enemies in wave round n = base + n * perRound. */
    baseEnemies: 4,
    enemiesPerRound: 2,
    /** Most enemies alive at once. */
    baseMaxAlive: 4,
    maxAlivePerRound: 1,
    maxAliveCap: 24,
    /** Delay between spawns within a wave. */
    baseSpawnIntervalMs: 1100,
    spawnIntervalPerRoundMs: 30,
    minSpawnIntervalMs: 350,
    /** Brute chance per round, capped. */
    bruteChancePerRound: 0.03,
    bruteMaxChance: 0.45,
    /** Pause between rounds. */
    intermissionMs: 2500,
    bannerMs: 2200,
  },

  enemyTypes: {
    chaser: {
      radius: 13,
      density: 0.0015,
      frictionAir: 0.01,
      restitution: 0.7,
      maxHp: 8,
      /** px/step gained per step while homing. */
      accel: 0.12,
      maxSpeed: 4.6,
      contactDamage: 7,
      score: 10,
    },
    brute: {
      radius: 24,
      density: 0.003,
      frictionAir: 0.02,
      restitution: 0.5,
      maxHp: 30,
      accel: 0.06,
      maxSpeed: 2.6,
      contactDamage: 14,
      score: 35,
    },
    /** Ember Nebula: stalks, winds up, then charges. */
    dasher: {
      radius: 15,
      density: 0.0018,
      frictionAir: 0.01,
      restitution: 0.6,
      maxHp: 14,
      accel: 0.08,
      maxSpeed: 2.4,
      contactDamage: 12,
      score: 25,
      stalkMs: 1600,
      windupMs: 450,
      dashMs: 550,
      /** px/step during the charge. */
      dashSpeed: 11,
    },
    /** Frost Expanse: shatters into swarmers when destroyed. */
    splitter: {
      radius: 21,
      density: 0.002,
      frictionAir: 0.015,
      restitution: 0.6,
      maxHp: 18,
      accel: 0.07,
      maxSpeed: 3,
      contactDamage: 10,
      score: 30,
      shards: 2,
    },
    /** The Void: keeps its distance and snipes. */
    sniper: {
      radius: 14,
      density: 0.0015,
      frictionAir: 0.03,
      restitution: 0.6,
      maxHp: 10,
      accel: 0.1,
      maxSpeed: 3.4,
      contactDamage: 6,
      score: 30,
      preferredDistance: 380,
      fireIntervalMs: 1900,
      /** Bullet speed multiplier. */
      bulletSpeed: 1.5,
    },
    /** Spectral Veil: blinks to a new spot near the player every few seconds. */
    phantom: {
      radius: 15,
      density: 0.0015,
      frictionAir: 0.01,
      restitution: 0.6,
      maxHp: 12,
      accel: 0.11,
      maxSpeed: 4,
      contactDamage: 9,
      score: 25,
      blinkIntervalMs: 2800,
      blinkMinDistance: 140,
      blinkMaxDistance: 240,
    },
    /** Toxic Bloom: slow and swollen; bursts into a ring of acid when destroyed. */
    bloater: {
      radius: 26,
      density: 0.003,
      frictionAir: 0.03,
      restitution: 0.4,
      maxHp: 24,
      accel: 0.04,
      maxSpeed: 1.8,
      contactDamage: 12,
      score: 35,
      burstCount: 10,
      /** Bullet speed multiplier for the death burst. */
      burstSpeed: 0.75,
    },
    /** Solar Storm: circles the player at a distance and takes shots. */
    orbiter: {
      radius: 13,
      density: 0.0015,
      frictionAir: 0.02,
      restitution: 0.6,
      maxHp: 10,
      accel: 0.22,
      maxSpeed: 5,
      contactDamage: 8,
      score: 25,
      orbitRadius: 260,
      fireIntervalMs: 2300,
      bulletSpeed: 1.2,
    },
    /** Nebula Reef: drifts, then propels itself in sudden pulses. */
    jelly: {
      radius: 18,
      density: 0.0015,
      frictionAir: 0.035,
      restitution: 0.7,
      maxHp: 14,
      accel: 0,
      maxSpeed: 7,
      contactDamage: 11,
      score: 25,
      pulseIntervalMs: 1300,
      pulseSpeed: 6.5,
    },
    /** Crystal Hive (and splitter shards): tiny, fast and fragile. */
    swarmer: {
      radius: 9,
      density: 0.001,
      frictionAir: 0.008,
      restitution: 0.8,
      maxHp: 4,
      accel: 0.18,
      maxSpeed: 5.6,
      contactDamage: 5,
      score: 6,
      /** Crystal Hive spawns swarmers in groups of this size. */
      groupSize: 3,
    },
  },

  /** Area-specific obstacles. Zones are non-solid; the rest are solid and static. */
  hazards: {
    /** Ember Nebula: burns while you're inside. */
    lava: { minRadius: 60, maxRadius: 100, damage: 6 },
    /** Frost Expanse: thick cold that drags you to a crawl. */
    frost: { minRadius: 80, maxRadius: 130, dragPerStep: 0.955 },
    /** The Void: anti-gravity, pushes you away. */
    repulsor: { radius: 26, pushRadiusScale: 7, pushStrength: 0.45 },
    /** Spectral Veil: fly through for a burst of speed. */
    boost: { radius: 34, speedMultiplier: 1.7, minSpeed: 13, maxSpeed: 22 },
    /** Crystal Hive: jagged crystals that hurt on contact. */
    crystal: { minRadius: 22, maxRadius: 38, damage: 10 },
    /** Toxic Bloom: corrosive pools — burn like lava and slow you a little. */
    acid: { minRadius: 55, maxRadius: 95, damage: 5, dragPerStep: 0.985 },
    /** Nebula Reef: a flowing current that carries you (and enemies) along. */
    current: { minRadius: 100, maxRadius: 150, push: 0.28 },
  },

  /** Area-wide mechanics for the newer dimensions. */
  ambient: {
    /** Toxic Bloom: acid pools drift like gas clouds, px/step. */
    acidDriftSpeed: 0.5,
    /** Solar Storm: constant push, px/step per step, on the player and enemies. */
    solarWindStrength: 0.045,
    /** How often the wind picks a new direction. */
    solarWindChangeMs: 9000,
    /** How fast the wind turns toward its new direction, radians/step. */
    solarWindTurnRate: 0.01,
  },

  boss: {
    radius: 46,
    density: 0.003,
    frictionAir: 0.02,
    restitution: 0.6,
    maxHp: 160,
    /** Extra max HP fraction per boss level above 1. */
    hpPerLevel: 0.6,
    /** px/step gained per step while homing. */
    homingAccel: 0.08,
    /** Perpendicular weave, px/step per step. */
    weaveAccel: 0.06,
    /** Weave oscillation frequency, cycles per second. */
    weaveHz: 0.4,
    /** px/step. */
    maxSpeed: 3.2,
    contactDamage: 16,
    fireIntervalMs: 2600,
    minFireIntervalMs: 1100,
    fireIntervalPerLevelMs: 250,
    /** Shotgun blast aimed at the player. */
    pelletsPerShot: 6,
    pelletsPerLevel: 1,
    /** Total spread of the blast, degrees. */
    spreadDeg: 40,
    /** Extra degrees of spread per level. */
    spreadPerLevelDeg: 4,
    /** Pellet speed varies by up to this fraction either way. */
    pelletSpeedJitter: 0.2,
    score: 500,
    bannerMs: 2200,
  },

  projectiles: {
    radius: 6,
    /** px/step. */
    speed: 5.2,
    lifeMs: 5000,
    damage: 8,
  },

  combat: {
    /** Relative speed (px/step) needed for the player to hurt an enemy. */
    rammingSpeedThreshold: 6,
    /** damage = clamp((relSpeed - threshold) / divisor, min, max) */
    rammingDamageDivisor: 0.5,
    rammingMinDamage: 4,
    rammingMaxDamage: 22,
    rammingCooldownMs: 350,
    /** HP restored per kill. */
    healPerKill: 4,
    healPerBoss: 60,
  },

  /** Coins earned at the end of a run, spent in the shop. */
  economy: {
    scorePerCoin: 10,
    coinsPerBoss: 25,
    /** World px per light-year shown on the HUD. */
    pxPerLy: 100,
    /** Coins paid live for each new light-year reached from home. */
    coinsPerLy: 5,
  },

  effects: {
    hitFlashMs: 120,
    shakeMs: 220,
    shakeMagnitude: 8,
    glowBlur: 24,
    starCount: 220,
    starMaxRadius: 1.4,
    twinkleHz: 0.6,
    aimDash: [8, 8] as const,
    aimLineWidth: 2,
    aimAlpha: 0.85,
    dragOriginRadius: 6,
    dragOriginAlpha: 0.35,
    /** Player trail length in frames. */
    trailLength: 26,
  },
} as const;

export type GameConfig = typeof gameConfig;

export function pxPerSecToStep(pxPerSec: number): number {
  return pxPerSec * (STEP_MS / 1000);
}
