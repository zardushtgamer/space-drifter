import Matter from 'matter-js';
import { BALLS, resolveColor } from '../config/cosmetics';
import type { GameConfig } from '../config/gameConfig';
import type { Camera } from '../core/Camera';
import type { IClock } from '../core/Clock';
import type { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import type { RunStats } from '../core/RunStats';
import type { SaveData } from '../core/SaveData';
import type { Vec2 } from '../core/types';
import type { Viewport } from '../core/Viewport';
import { Bot, type BotProfile } from '../entities/Bot';
import type { Entity } from '../entities/Entity';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { Player } from '../entities/Player';
import type { EntityFactory } from '../factories/EntityFactory';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { CombatSystem } from './CombatSystem';
import type { ISystem } from './ISystem';

const { Body } = Matter;

const BOT_NAMES = [
  'NovaRider', 'xX_Drift_Xx', 'Quasar', 'PulsarPete', 'Gravitas', 'Comet_K',
  'VoidWalker', 'Starbyte', 'Nebulon', 'OrbitQueen', 'Meteorix', 'Ion_Storm',
];

export const ARENA = {
  bots: 5,
  matchMs: 180_000,
  koTarget: 15,
  respawnMs: 2500,
  /** Invulnerability after (re)spawning. */
  spawnShieldMs: 2000,
  /** Bots farther than this from you are brought back. */
  leashDistance: 2600,
  /** Same ramming rules as against enemies. */
  rammingPairCooldownMs: 300,
  /** Coins: per KO, plus a placement bonus. */
  coinsPerKo: 30,
  placementCoins: [300, 150, 75] as const,
  /** XP for each KO you score. */
  xpPerKo: 40,
} as const;

export interface Standing {
  name: string;
  color: string;
  kos: number;
  deaths: number;
  isPlayer: boolean;
}

export interface ArenaResult {
  standings: Standing[];
  place: number;
  coins: number;
}

/**
 * Multiplayer (Bots): a free-for-all where you and several AI pilots launch
 * and ram each other. Whoever hits harder along the line of impact deals
 * damage. Everyone respawns; most KOs when time runs out (or first to the
 * target) wins.
 */
export class ArenaSystem implements ISystem {
  active = false;
  private timeMs = 0;
  readonly bots = new Set<Bot>();
  private readonly respawns: Array<{ profile: BotProfile; atMs: number }> = [];
  you: BotProfile = { name: 'You', skin: BALLS[0]!, color: '#5ee7ff', kos: 0, deaths: 0 };
  private yourLastHitBy: Bot | null = null;
  private yourLastHitAtMs = -Infinity;
  private readonly pairCooldown = new Map<string, number>();
  /** Recent KO messages (render-clock time). */
  readonly feed: Array<{ text: string; atMs: number }> = [];
  /** Called once when the match ends. */
  onEnd: (result: ArenaResult) => void = () => {};

  constructor(
    private readonly registry: EntityRegistry,
    private readonly factory: EntityFactory,
    physics: PhysicsWorld,
    private readonly player: Player,
    private readonly combat: CombatSystem,
    private readonly bus: EventBus<EventMap>,
    private readonly camera: Camera,
    private readonly viewport: Viewport,
    private readonly stats: RunStats,
    private readonly clock: IClock,
    private readonly config: GameConfig,
    private readonly save: SaveData,
    /** Your ramming damage multiplier (Ram Spikes upgrade, Razor Hull perk). */
    private readonly yourRamDamage: () => number,
    private readonly random: () => number = Math.random,
  ) {
    physics.onCollision('collisionStart', (pairs) => {
      if (!this.active) return;
      for (const pair of pairs) this.clash(pair, physics);
    });
  }

  get timeLeftMs(): number {
    return Math.max(0, ARENA.matchMs - this.timeMs);
  }

  start(): void {
    this.active = true;
    this.timeMs = 0;
    const names = [...BOT_NAMES].sort(() => this.random() - 0.5);
    const skins = BALLS.filter((b) => b.price > 0);
    const yourBall = BALLS.find((b) => b.id === this.save.ball) ?? BALLS[0]!;
    this.you = { name: 'You', skin: yourBall, color: yourBall.ring ?? resolveColor(yourBall.fill, 0), kos: 0, deaths: 0 };
    for (let i = 0; i < ARENA.bots; i++) {
      const skin = skins[Math.floor(this.random() * skins.length)]!;
      const color = skin.ring ?? resolveColor(skin.fill, 0);
      this.spawn({ name: names[i]!, skin, color, kos: 0, deaths: 0 });
    }
    this.combat.grantInvulnerability(ARENA.spawnShieldMs);
    this.stats.banner = { text: `⚔️ FREE-FOR-ALL · FIRST TO ${ARENA.koTarget}`, untilMs: this.clock.now() + 2500 };
  }

  update(dtMs: number): void {
    if (!this.active) return;
    this.timeMs += dtMs;

    for (let i = this.respawns.length - 1; i >= 0; i--) {
      if (this.timeMs < this.respawns[i]!.atMs) continue;
      this.spawn(this.respawns[i]!.profile);
      this.respawns.splice(i, 1);
    }
    for (const bot of [...this.bots]) {
      this.leash(bot);
      this.think(bot);
      bot.trail.push({ x: bot.body.position.x, y: bot.body.position.y });
      if (bot.trail.length > 18) bot.trail.shift();
    }

    const leader = Math.max(this.you.kos, ...[...this.bots].map((b) => b.profile.kos), ...this.respawns.map((r) => r.profile.kos));
    if (this.timeMs >= ARENA.matchMs || leader >= ARENA.koTarget) this.finish();
  }

  // --- AI -------------------------------------------------------------------

  /** Pick a target, lead it, launch; sometimes dodge an incoming charge instead. */
  private think(bot: Bot): void {
    const fighters: Entity[] = [this.player, ...this.bots];
    if (this.timeMs >= bot.retargetAtMs || !fighters.some((f) => f.id === bot.targetId)) {
      bot.retargetAtMs = this.timeMs + 1500 + this.random() * 1500;
      let best: Entity | null = null;
      let bestScore = Infinity;
      for (const f of fighters) {
        if (f === bot) continue;
        // Bots like picking on you a bit more than on each other.
        const d = this.dist(bot.body.position, f.body.position) * (f === this.player ? 0.7 : 1);
        const score = d * (0.8 + this.random() * 0.4);
        if (score < bestScore) {
          bestScore = score;
          best = f;
        }
      }
      bot.targetId = best?.id ?? null;
    }
    if (this.timeMs < bot.nextLaunchMs) return;
    bot.nextLaunchMs = this.timeMs + 600 + this.random() * 900;

    const target = fighters.find((f) => f.id === bot.targetId);
    if (!target) return;
    const p = bot.body.position;
    const v = bot.body.velocity;
    let dir: Vec2;

    const threat = this.incomingThreat(bot, fighters);
    if (threat && this.random() < 0.35) {
      // Dodge: launch at right angles to the attacker's approach.
      const tx = threat.x - p.x;
      const ty = threat.y - p.y;
      const side = this.random() < 0.5 ? 1 : -1;
      dir = this.unit({ x: -ty * side, y: tx * side });
    } else {
      // Lead the target by roughly how long it takes to get there.
      const t = target.body.position;
      const tv = target.body.velocity;
      const lead = Math.min(40, this.dist(p, t) / 14);
      dir = this.unit({ x: t.x + tv.x * lead - p.x, y: t.y + tv.y * lead - p.y });
      // A little aim wobble so they're beatable.
      const wobble = (this.random() - 0.5) * 0.3;
      dir = { x: dir.x * Math.cos(wobble) - dir.y * Math.sin(wobble), y: dir.x * Math.sin(wobble) + dir.y * Math.cos(wobble) };
    }
    const power = 9 + this.random() * 6;
    const max = this.config.launch.maxSpeed;
    let nx = v.x * 0.5 + dir.x * power;
    let ny = v.y * 0.5 + dir.y * power;
    const s = Math.hypot(nx, ny);
    if (s > max) {
      nx = (nx / s) * max;
      ny = (ny / s) * max;
    }
    Body.setVelocity(bot.body, { x: nx, y: ny });
  }

  /** The position of anyone charging at this bot fast and close, if any. */
  private incomingThreat(bot: Bot, fighters: readonly Entity[]): Vec2 | null {
    const p = bot.body.position;
    for (const f of fighters) {
      if (f === bot) continue;
      const q = f.body.position;
      const d = this.dist(p, q);
      if (d > 280) continue;
      const u = this.unit({ x: p.x - q.x, y: p.y - q.y });
      const closing = f.body.velocity.x * u.x + f.body.velocity.y * u.y;
      if (closing > 8) return q;
    }
    return null;
  }

  // --- Combat ---------------------------------------------------------------

  /** Ram resolution between any two fighters (you or bots). */
  private clash(pair: Matter.Pair, physics: PhysicsWorld): void {
    const a = this.registry.get(pair.bodyA);
    const b = this.registry.get(pair.bodyB);
    if (!a || !b || !this.isFighter(a) || !this.isFighter(b)) return;
    const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
    if (this.timeMs < (this.pairCooldown.get(key) ?? -Infinity)) return;
    this.pairCooldown.set(key, this.timeMs + ARENA.rammingPairCooldownMs);

    const n = this.unit({ x: b.body.position.x - a.body.position.x, y: b.body.position.y - a.body.position.y });
    const va = physics.velocityBeforeStep(a.body);
    const vb = physics.velocityBeforeStep(b.body);
    // Each side's speed into the other along the line of impact.
    const aInto = va.x * n.x + va.y * n.y;
    const bInto = -(vb.x * n.x + vb.y * n.y);
    const aDmg = this.ramDamage(aInto) * (a === this.player ? this.yourRamDamage() : 1);
    const bDmg = this.ramDamage(bInto) * (b === this.player ? this.yourRamDamage() : 1);
    if (aDmg > 0) this.hit(b, a, aDmg);
    if (bDmg > 0) this.hit(a, b, bDmg);
  }

  private ramDamage(speed: number): number {
    const c = this.config.combat;
    if (speed < c.rammingSpeedThreshold) return 0;
    return Math.min(c.rammingMaxDamage, Math.max(c.rammingMinDamage, (speed - c.rammingSpeedThreshold) / c.rammingDamageDivisor));
  }

  private hit(victim: Entity, attacker: Entity, dmg: number): void {
    if (victim === this.player) {
      if (attacker instanceof Bot) {
        this.yourLastHitBy = attacker;
        this.yourLastHitAtMs = this.timeMs;
      }
      this.combat.hurtPlayer(dmg);
      return;
    }
    if (!(victim instanceof Bot) || victim.dead) return;
    victim.health.damage(dmg);
    victim.hitAtMs = this.clock.now();
    victim.lastHitBy = attacker;
    victim.lastHitAtMs = this.timeMs;
    if (attacker === this.player) this.camera.shake(this.config.effects.shakeMs * 0.6, this.config.effects.shakeMagnitude * 0.5);
    if (victim.health.isDead()) this.koBot(victim);
  }

  private koBot(bot: Bot): void {
    bot.dead = true;
    this.bots.delete(bot);
    bot.profile.deaths++;
    const killer = this.timeMs - bot.lastHitAtMs < 3000 ? bot.lastHitBy : null;
    const killerName = killer === this.player ? 'You' : killer instanceof Bot ? killer.profile.name : null;
    if (killer === this.player) {
      this.you.kos++;
      this.stats.score += 100;
    } else if (killer instanceof Bot) {
      killer.profile.kos++;
    }
    this.pushFeed(killerName ? `${killerName} KO'd ${bot.profile.name}` : `${bot.profile.name} crashed out`);
    // Kill effect (and XP when it was yours).
    this.bus.emit('enemy:killed', {
      id: bot.id,
      score: killer === this.player ? ARENA.xpPerKo : 0,
      x: bot.body.position.x,
      y: bot.body.position.y,
      color: bot.profile.color,
      radius: bot.body.circleRadius ?? 17,
    });
    // WorldSystem's sweep removes dead entities; respawn later.
    this.respawns.push({ profile: bot.profile, atMs: this.timeMs + ARENA.respawnMs });
  }

  /** Arena death: respawn instead of game over. Returns true (handled). */
  playerKOd(): boolean {
    if (!this.active) return false;
    this.you.deaths++;
    const killer = this.timeMs - this.yourLastHitAtMs < 3000 ? this.yourLastHitBy : null;
    if (killer && this.bots.has(killer)) killer.profile.kos++;
    this.pushFeed(killer ? `${killer.profile.name} KO'd You` : 'You crashed out');
    this.yourLastHitBy = null;

    const to = this.spawnPoint(this.player.body.position, 900);
    Body.setPosition(this.player.body, to);
    Body.setVelocity(this.player.body, { x: 0, y: 0 });
    this.camera.snap(to);
    this.player.health.heal(this.player.health.maxHp);
    this.combat.grantInvulnerability(ARENA.spawnShieldMs);
    this.stats.banner = {
      text: killer ? `KO'D BY ${killer.profile.name.toUpperCase()} · RESPAWNING` : 'RESPAWNING',
      untilMs: this.clock.now() + 1800,
    };
    return true;
  }

  // --- Lifecycle --------------------------------------------------------------

  private spawn(profile: BotProfile): void {
    const at = this.spawnPoint(this.player.body.position, Math.hypot(this.viewport.width, this.viewport.height) / 2 + 150);
    const bot = this.factory.createBot(at, profile);
    bot.nextLaunchMs = this.timeMs + 400 + this.random() * 800;
    this.bots.add(bot);
  }

  /** Bots never drift too far from the action. */
  private leash(bot: Bot): void {
    if (this.dist(bot.body.position, this.player.body.position) <= ARENA.leashDistance) return;
    Body.setPosition(bot.body, this.spawnPoint(this.player.body.position, 900));
    Body.setVelocity(bot.body, { x: 0, y: 0 });
    bot.trail.length = 0;
  }

  private spawnPoint(around: Vec2, dist: number): Vec2 {
    const a = this.random() * Math.PI * 2;
    return { x: around.x + Math.cos(a) * dist, y: around.y + Math.sin(a) * dist };
  }

  standings(): Standing[] {
    const all = [
      { ...this.you, isPlayer: true },
      ...[...this.bots].map((b) => ({ ...b.profile, isPlayer: false })),
      ...this.respawns.map((r) => ({ ...r.profile, isPlayer: false })),
    ];
    return all
      .map(({ name, color, kos, deaths, isPlayer }) => ({ name, color, kos, deaths, isPlayer }))
      .sort((x, y) => y.kos - x.kos || x.deaths - y.deaths || (x.isPlayer ? -1 : 1));
  }

  private finish(): void {
    this.active = false;
    const standings = this.standings();
    const place = standings.findIndex((s) => s.isPlayer) + 1;
    const coins = this.save.addCoins(this.you.kos * ARENA.coinsPerKo + (ARENA.placementCoins[place - 1] ?? 0));
    for (const bot of this.bots) bot.dead = true;
    this.bots.clear();
    this.respawns.length = 0;
    this.onEnd({ standings, place, coins });
  }

  private pushFeed(text: string): void {
    this.feed.unshift({ text, atMs: this.clock.now() });
    if (this.feed.length > 5) this.feed.pop();
  }

  private isFighter(e: Entity): boolean {
    return e === this.player || (e instanceof Bot && !e.dead);
  }

  private dist(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private unit(v: Vec2): Vec2 {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  }

  dispose(): void {}
}
