import Matter from 'matter-js';
import { pickOtherDimension, type DimensionId, type DimensionState } from '../config/dimensions';
import type { GameConfig } from '../config/gameConfig';
import type { Camera } from '../core/Camera';
import type { IClock } from '../core/Clock';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import { gasGiantPosition, landmarkFor } from '../config/landmarks';
import { isCaveWall } from '../core/caveNoise';
import { chunkSeed, mulberry32 } from '../core/random';
import { bossLevel, bruteChance, isBossRound, maxAlive, spawnIntervalMs, waveSize } from '../core/rounds';
import type { RunStats } from '../core/RunStats';
import type { Vec2 } from '../core/types';
import type { Viewport } from '../core/Viewport';
import type { Boss } from '../entities/Boss';
import { Enemy, type EnemyType } from '../entities/Enemy';
import type { EntityRegistry } from '../entities/EntityRegistry';
import { Obstacle, type ObstacleType } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import type { EntityFactory } from '../factories/EntityFactory';
import type { CombatSystem } from './CombatSystem';
import type { ISystem } from './ISystem';
import type { ProjectileSystem } from './ProjectileSystem';

const { Body } = Matter;

/**
 * Makes the field infinite: streams obstacle chunks around the player,
 * runs the rounds (enemy waves, with a lone boss every 10th round) and
 * sweeps dead entities.
 */
export class WorldSystem implements ISystem {
  private readonly chunks = new Map<string, Obstacle[]>();
  private readonly enemies = new Set<Enemy>();
  private boss: Boss | null = null;
  private phase: 'intermission' | 'wave' | 'boss' = 'intermission';
  /** Enemy rounds and bosses. Off in Multiplayer (Bots). */
  wavesEnabled = true;
  private phaseTimerMs: number;
  /** Enemies of the current wave not yet spawned. */
  private toSpawn = 0;
  private spawnTimerMs = 0;
  private lastChunkKey: string | null = null;
  private ton: Obstacle | null = null;
  private readonly landmarks = new Map<DimensionId, Obstacle>();
  private readonly gasGiants = new Map<DimensionId, Obstacle>();
  /** Per dimension: pinned (linked) black holes, and the chunks they came from. */
  private readonly pinned = new Map<DimensionId, { chunks: Set<string>; obstacles: Obstacle[] }>();

  constructor(
    private readonly factory: EntityFactory,
    private readonly registry: EntityRegistry,
    private readonly player: Player,
    private readonly camera: Camera,
    private readonly viewport: Viewport,
    private readonly combat: CombatSystem,
    private readonly projectiles: ProjectileSystem,
    private readonly bus: EventBus<EventMap>,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly config: GameConfig,
    private readonly dimension: DimensionState,
    /** Whether dimension holes may spawn (Andromeda unlocked). */
    private readonly riftsEnabled: () => boolean,
    /** Dimensions a rift may lead to (excludes ones not yet bought). */
    private readonly allowedDimensions: () => readonly DimensionId[],
    private readonly random: () => number = Math.random,
  ) {
    this.phaseTimerMs = config.rounds.intermissionMs;
    this.ensureLandmark();
    this.ensureGasGiant();
    this.streamChunks();
  }

  /** The current dimension's landmark (not TON 618, see `ton618`). */
  get landmark(): Obstacle | null {
    return this.landmarks.get(this.dimension.current) ?? null;
  }

  /** Creates this dimension's landmark (and its gems) on first visit; pinned so it persists. */
  private ensureLandmark(): void {
    const def = landmarkFor(this.dimension.current);
    if (!def || this.landmarks.has(def.dimension)) return;
    const lm = this.factory.createLandmark(def);
    this.pin(lm);
    this.landmarks.set(def.dimension, lm);
    if (!def.gems) return;
    const rng = mulberry32(chunkSeed(this.config.world.seed, def.position.x, def.position.y));
    const g = def.gems;
    for (let i = 0; i < g.count; i++) {
      const a = (i / g.count) * Math.PI * 2 + rng() * 0.4;
      const d = g.minDistance + rng() * (g.maxDistance - g.minDistance);
      const pos = { x: def.position.x + Math.cos(a) * d, y: def.position.y + Math.sin(a) * d };
      this.pin(this.factory.createGem(pos, g.coins, lm.chunkKey, rng));
    }
  }

  /** Whether a point is inside the current landmark's or gas giant's reserved space. */
  private inLandmarkSpace(x: number, y: number, pad: number): boolean {
    const def = landmarkFor(this.dimension.current);
    if (def && Math.hypot(x - def.position.x, y - def.position.y) < def.clearRadius + pad) return true;
    const g = gasGiantPosition(this.dimension.current, this.config.gasGiant.distance);
    return Math.hypot(x - g.x, y - g.y) < this.config.gasGiant.radius * 1.05 + pad;
  }

  /** The current dimension's gas giant. */
  get gasGiant(): Obstacle | null {
    return this.gasGiants.get(this.dimension.current) ?? null;
  }

  private ensureGasGiant(): void {
    const id = this.dimension.current;
    if (this.gasGiants.has(id)) return;
    const theme = this.dimension.theme;
    const rng = mulberry32(theme.seedSalt ^ 0x6a5);
    const [h0, h1] = theme.planetHue;
    const giant = this.factory.createGasGiant(
      gasGiantPosition(id, this.config.gasGiant.distance),
      (h0 + rng() * (h1 - h0)) % 360,
      rng,
    );
    this.pin(giant);
    this.gasGiants.set(id, giant);
  }

  /**
   * Keeps an obstacle for the rest of the run (used for linked black holes): it
   * is taken out of chunk streaming, and its chunk won't spawn a duplicate on reload.
   */
  pin(obstacle: Obstacle): void {
    const list = this.chunks.get(obstacle.chunkKey);
    const i = list?.indexOf(obstacle) ?? -1;
    if (list && i >= 0) list.splice(i, 1);
    const p = this.pinnedFor(this.dimension.current);
    p.chunks.add(obstacle.chunkKey);
    if (!p.obstacles.includes(obstacle)) p.obstacles.push(obstacle);
  }

  /**
   * Moves the player to another dimension in place: the whole field is
   * regenerated with that dimension's seed and look. Linked black holes are
   * stashed and brought back when the player returns.
   */
  switchDimension(to: DimensionId): void {
    const from = this.dimension.current;
    if (to === from) return;
    for (const obstacles of this.chunks.values()) for (const o of obstacles) this.factory.destroy(o);
    this.chunks.clear();
    for (const o of this.pinnedFor(from).obstacles) this.factory.destroy(o);
    this.dimension.current = to;
    for (const o of this.pinnedFor(to).obstacles) this.factory.restore(o);
    if (to === 'void') this.arriveInVoid();
    this.ensureLandmark();
    this.ensureGasGiant();
    this.lastChunkKey = null;
    this.streamChunks();
  }

  /** TON 618, while the player is in The Void. */
  get ton618(): Obstacle | null {
    return this.dimension.current === 'void' ? this.ton : null;
  }

  /** Creates TON 618 at the Void's center on first visit, and never drops the player inside its pull. */
  private arriveInVoid(): void {
    const t = this.config.ton618;
    if (!this.ton) {
      this.ton = this.factory.createObstacle({ x: 0, y: 0 }, t.radius, 'ton618', 'ton618', this.random);
      this.pin(this.ton);
    }
    const p = this.player.body.position;
    const d = Math.hypot(p.x, p.y);
    const safe = t.radius * t.reachScale * 1.05;
    if (d < safe) {
      const k = d === 0 ? 1 : safe / d;
      const to = d === 0 ? { x: safe, y: 0 } : { x: p.x * k, y: p.y * k };
      Body.setPosition(this.player.body, to);
      Body.setVelocity(this.player.body, { x: 0, y: 0 });
      this.camera.snap(to);
    }
  }

  private pinnedFor(id: DimensionId): { chunks: Set<string>; obstacles: Obstacle[] } {
    let p = this.pinned.get(id);
    if (!p) {
      p = { chunks: new Set(), obstacles: [] };
      this.pinned.set(id, p);
    }
    return p;
  }

  get currentBoss(): Boss | null {
    return this.boss;
  }

  update(dtMs: number): void {
    const p = this.player.body.position;
    this.stats.elapsedMs += dtMs;
    this.stats.farthest = Math.max(this.stats.farthest, Math.hypot(p.x, p.y));
    this.camera.follow(p, this.config.camera.followLerp);

    this.sweep();
    this.streamChunks();
    this.leash();
    if (this.wavesEnabled) this.updateRound(dtMs);
  }

  // --- chunks -------------------------------------------------------------

  private streamChunks(): void {
    const { chunkSize, loadRadius, unloadRadius } = this.config.world;
    const p = this.player.body.position;
    const cx = Math.floor(p.x / chunkSize);
    const cy = Math.floor(p.y / chunkSize);
    const key = `${cx},${cy}`;
    if (key === this.lastChunkKey) return;
    this.lastChunkKey = key;

    for (const [k, obstacles] of this.chunks) {
      const [kx = 0, ky = 0] = k.split(',').map(Number);
      if (Math.max(Math.abs(kx - cx), Math.abs(ky - cy)) <= unloadRadius) continue;
      for (const o of obstacles) this.factory.destroy(o);
      this.chunks.delete(k);
    }
    for (let dy = -loadRadius; dy <= loadRadius; dy++) {
      for (let dx = -loadRadius; dx <= loadRadius; dx++) {
        const k = `${cx + dx},${cy + dy}`;
        if (!this.chunks.has(k)) this.chunks.set(k, this.generateChunk(cx + dx, cy + dy, k));
      }
    }
  }

  private generateChunk(cx: number, cy: number, key: string): Obstacle[] {
    const o = this.config.obstacles;
    const size = this.config.world.chunkSize;
    const theme = this.dimension.theme;
    const rng = mulberry32(chunkSeed(this.config.world.seed ^ theme.seedSalt, cx, cy));
    const count = o.minPerChunk + Math.floor(rng() * (o.maxPerChunk - o.minPerChunk + 1));
    const player = this.player.body.position;
    const placed: Array<{ x: number; y: number; r: number }> = [];
    const out: Obstacle[] = [];

    const pl = this.config.planets;
    const bh = this.config.blackHoles;
    const rf = this.config.rifts;
    const types: ObstacleType[] = [];
    // Planets go first so the smaller obstacles fit around them.
    if (rng() < pl.chance * theme.planetChanceMul) types.push('planet');
    // Always roll both so the rest of the chunk's layout stays the same.
    const hole = rng() < bh.chance * theme.blackHoleChanceMul;
    const rift = rng() < rf.chanceOfBlackHole && this.riftsEnabled();
    const riftDestination = pickOtherDimension(theme.id, rng(), this.allowedDimensions());
    if (hole && !this.pinnedFor(theme.id).chunks.has(key)) types.push(rift ? 'rift' : 'blackhole');
    const hz = this.config.hazards;
    if (theme.hazard && rng() < theme.hazard.chance) types.push(theme.hazard.type);
    for (let i = 0; i < count; i++) types.push(rng() < o.mineChance ? 'mine' : 'rock');
    if (rng() < o.healthPackChance) types.push('health');

    const between = (min: number, max: number) => min + rng() * (max - min);
    // Nothing spawns inside TON 618 (it sits at the Void's origin).
    const tonClear = theme.id === 'void' ? this.config.ton618.radius * this.config.ton618.clearScale : 0;
    for (const type of types) {
      const r =
        type === 'mine' ? o.mineRadius
        : type === 'health' ? o.healthPackRadius
        : type === 'planet' ? between(pl.minRadius, pl.maxRadius)
        : type === 'blackhole' ? bh.radius
        : type === 'rift' ? rf.radius
        : type === 'lava' ? between(hz.lava.minRadius, hz.lava.maxRadius)
        : type === 'acid' ? between(hz.acid.minRadius, hz.acid.maxRadius)
        : type === 'current' ? between(hz.current.minRadius, hz.current.maxRadius)
        : type === 'frost' ? between(hz.frost.minRadius, hz.frost.maxRadius)
        : type === 'repulsor' ? hz.repulsor.radius
        : type === 'boost' ? hz.boost.radius
        : type === 'crystal' ? between(hz.crystal.minRadius, hz.crystal.maxRadius)
        : between(o.minRadius, o.maxRadius);
      // Keep the spawn point outside any gravity well.
      const clear =
        type === 'planet' ? o.centerClearRadius + r * pl.pullRadiusScale
        : type === 'blackhole' ? o.centerClearRadius + r * bh.pullRadiusScale
        : type === 'rift' ? o.centerClearRadius + r * rf.pullRadiusScale
        : type === 'repulsor' ? o.centerClearRadius + r * hz.repulsor.pushRadiusScale
        : o.centerClearRadius + r;
      for (let attempt = 0; attempt < o.maxSpawnAttempts; attempt++) {
        const x = cx * size + r + rng() * (size - 2 * r);
        const y = cy * size + r + rng() * (size - 2 * r);
        if (Math.hypot(x, y) < clear) continue;
        if (Math.hypot(x, y) < tonClear + r) continue;
        if (this.inLandmarkSpace(x, y, r)) continue;
        if (Math.hypot(x - player.x, y - player.y) < o.playerClearRadius) continue;
        if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + o.spawnGap)) continue;
        if (theme.caves && this.touchesRock(x, y, r)) continue;
        placed.push({ x, y, r });
        // The dimension's hue range only applies to planets; other obstacles use hue as a free angle.
        const hues = type === 'planet' ? theme.planetHue : ([0, 360] as const);
        const obstacle = this.factory.createObstacle({ x, y }, r, type, key, rng, hues);
        if (type === 'rift') obstacle.destination = riftDestination;
        out.push(obstacle);
        break;
      }
    }
    if (theme.caves) out.push(...this.generateCaveWalls(cx, cy, key));
    return out;
  }

  private caveSeed(): number {
    return this.config.world.seed ^ this.dimension.theme.seedSalt;
  }

  /** Whether cave rock (by the noise alone) overlaps a circle; used to keep things in open space. */
  private touchesRock(x: number, y: number, r: number): boolean {
    const seed = this.caveSeed();
    const shape = this.config.caves;
    if (isCaveWall(seed, x, y, shape)) return true;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (isCaveWall(seed, x + Math.cos(a) * r, y + Math.sin(a) * r, shape)) return true;
    }
    return false;
  }

  /**
   * Samples the cave noise on a grid and greedily merges solid cells into as
   * few rectangles as possible (fewer bodies = faster physics). Space around
   * the player and the origin is always carved open.
   */
  private generateCaveWalls(cx: number, cy: number, key: string): Obstacle[] {
    const c = this.config.caves;
    const size = this.config.world.chunkSize;
    const n = Math.round(size / c.cellSize);
    const seed = this.caveSeed();
    const x0 = cx * size;
    const y0 = cy * size;
    const player = this.player.body.position;
    const carve = this.config.obstacles.centerClearRadius;

    const solid: boolean[] = new Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + 0.5) * c.cellSize;
        const y = y0 + (j + 0.5) * c.cellSize;
        solid[j * n + i] =
          isCaveWall(seed, x, y, c) &&
          Math.hypot(x, y) > carve &&
          Math.hypot(x - player.x, y - player.y) > carve &&
          !this.inLandmarkSpace(x, y, 0);
      }
    }

    const out: Obstacle[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (!solid[j * n + i]) continue;
        // Grow right, then down while the whole row segment is solid.
        let w = 1;
        while (i + w < n && solid[j * n + i + w]) w++;
        let h = 1;
        grow: while (j + h < n) {
          for (let k = 0; k < w; k++) if (!solid[(j + h) * n + i + k]) break grow;
          h++;
        }
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) solid[(j + dy) * n + i + dx] = false;
        out.push(
          this.factory.createCaveWall(x0 + i * c.cellSize, y0 + j * c.cellSize, w * c.cellSize, h * c.cellSize, key),
        );
      }
    }
    return out;
  }

  // --- enemies & bosses ---------------------------------------------------

  /** Intermission -> wave (or boss) -> intermission for the next round. */
  private updateRound(dtMs: number): void {
    const r = this.config.rounds;
    const round = this.stats.round;

    if (this.phase === 'intermission') {
      if (round === 1 && !this.stats.banner) this.banner('ROUND 1');
      this.phaseTimerMs -= dtMs;
      if (this.phaseTimerMs > 0) return;
      if (isBossRound(round, r)) {
        const level = bossLevel(round, r);
        this.phase = 'boss';
        this.boss = this.factory.createBoss(this.offscreenPoint(this.config.boss.radius), level, this.player, this.projectiles.fire);
        this.banner(`ROUND ${round} · BOSS ${level}`);
        this.bus.emit('boss:spawned', { level });
      } else {
        this.phase = 'wave';
        this.toSpawn = waveSize(round, r);
        this.stats.enemiesLeft = this.toSpawn;
        this.spawnTimerMs = 0;
      }
      return;
    }

    if (this.phase === 'wave') {
      this.spawnTimerMs += dtMs;
      if (this.toSpawn > 0 && this.spawnTimerMs >= spawnIntervalMs(round, r) && this.enemies.size < maxAlive(round, r)) {
        this.spawnTimerMs = 0;
        this.toSpawn--;
        this.spawnWaveEnemy(round);
      }
      if (this.toSpawn === 0 && this.enemies.size === 0) this.nextRound(`ROUND ${round} CLEAR`);
      return;
    }

    // Boss phase: the round ends when the boss is swept (see sweep()).
    if (!this.boss) this.nextRound(`BOSS ${bossLevel(round, r)} DESTROYED`);
  }

  /** One wave slot: the area's special enemy (swarmers come in groups), else a chaser or brute. */
  private spawnWaveEnemy(round: number): void {
    const special = this.dimension.theme.special;
    let type: EnemyType = this.random() < bruteChance(round, this.config.rounds) ? 'brute' : 'chaser';
    if (special && this.random() < special.chance) type = special.type;

    const at = this.offscreenPoint(this.config.enemyTypes[type].radius);
    const group = type === 'swarmer' ? this.config.enemyTypes.swarmer.groupSize : 1;
    for (let i = 0; i < group; i++) {
      const pos = { x: at.x + (this.random() - 0.5) * 60, y: at.y + (this.random() - 0.5) * 60 };
      this.enemies.add(this.factory.createEnemy(pos, type, this.player, this.projectiles.fire));
    }
    // Extra group members count toward the round.
    this.stats.enemiesLeft += group - 1;
  }

  /** Splitters shatter into swarmers where they die; the shards join the round. */
  private shatter(splitter: Enemy): void {
    const n = this.config.enemyTypes.splitter.shards;
    const p = splitter.body.position;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.random();
      const pos = { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20 };
      const shard = this.factory.createEnemy(pos, 'swarmer', this.player);
      Body.setVelocity(shard.body, { x: Math.cos(a) * 4, y: Math.sin(a) * 4 });
      this.enemies.add(shard);
    }
    this.stats.enemiesLeft += n;
  }

  /** Bloaters pop into a ring of acid blobs. */
  private burst(bloater: Enemy): void {
    const b = this.config.enemyTypes.bloater;
    const p = bloater.body.position;
    const r = bloater.body.circleRadius ?? 0;
    for (let i = 0; i < b.burstCount; i++) {
      const a = (i / b.burstCount) * Math.PI * 2;
      const d = { x: Math.cos(a), y: Math.sin(a) };
      this.projectiles.fire({ x: p.x + d.x * r, y: p.y + d.y * r }, { x: d.x * b.burstSpeed, y: d.y * b.burstSpeed });
    }
  }

  private nextRound(clearText: string): void {
    this.stats.round++;
    this.stats.enemiesLeft = 0;
    this.phase = 'intermission';
    this.phaseTimerMs = this.config.rounds.intermissionMs;
    this.banner(`${clearText} — ROUND ${this.stats.round} NEXT`);
    this.bus.emit('round:cleared', { round: this.stats.round - 1 });
  }

  private banner(text: string): void {
    this.stats.banner = { text, untilMs: this.clock.now() + this.config.rounds.bannerMs };
  }

  /** Round enemies and bosses never give up: if outrun, they re-enter from off-screen. */
  private leash(): void {
    const far = this.config.enemies.leashDistance;
    const hunters = this.boss ? [...this.enemies, this.boss] : this.enemies;
    for (const h of hunters) {
      if (h.dead || this.distanceToPlayer(h.body.position) <= far) continue;
      Body.setPosition(h.body, this.offscreenPoint(h.body.circleRadius ?? 0));
      Body.setVelocity(h.body, { x: 0, y: 0 });
    }
  }

  private sweep(): void {
    for (const entity of [...this.registry.all()]) {
      if (!entity.dead) continue;

      this.factory.destroy(entity);
      this.combat.forget(entity);
      if (entity instanceof Enemy) {
        this.enemies.delete(entity);
        this.stats.enemiesLeft = Math.max(0, this.stats.enemiesLeft - 1);
        if (entity.type === 'splitter') this.shatter(entity);
        if (entity.type === 'bloater') this.burst(entity);
      } else if (entity === this.boss) {
        this.boss = null;
      } else if (entity instanceof Obstacle) {
        const list = this.chunks.get(entity.chunkKey);
        const i = list?.indexOf(entity) ?? -1;
        if (list && i >= 0) list.splice(i, 1);
        // Pinned things (e.g. collected gems) must not be restored on the next visit.
        for (const p of this.pinned.values()) {
          const j = p.obstacles.indexOf(entity);
          if (j >= 0) p.obstacles.splice(j, 1);
        }
      }
    }
  }

  /** A random point on a ring just outside the visible screen (in open space, inside caves). */
  private offscreenPoint(radius: number): Vec2 {
    const p = this.player.body.position;
    const dist = Math.hypot(this.viewport.width, this.viewport.height) / 2 + this.config.enemies.spawnPadding + radius;
    const tries = this.dimension.theme.caves ? this.config.caves.spawnAttempts : 1;
    let point: Vec2 = p;
    for (let i = 0; i < tries; i++) {
      const a = this.random() * Math.PI * 2;
      point = { x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist };
      if (!this.dimension.theme.caves || !this.touchesRock(point.x, point.y, radius)) break;
    }
    return point;
  }

  private distanceToPlayer(v: Vec2): number {
    const p = this.player.body.position;
    return Math.hypot(v.x - p.x, v.y - p.y);
  }

  dispose(): void {
    this.chunks.clear();
    this.enemies.clear();
    this.boss = null;
  }
}
