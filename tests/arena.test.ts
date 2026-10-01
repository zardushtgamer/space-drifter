import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig';
import type { Camera } from '../src/core/Camera';
import { EventBus } from '../src/core/EventBus';
import type { EventMap } from '../src/core/events';
import { GameStateMachine } from '../src/core/GameStateMachine';
import { RunStats } from '../src/core/RunStats';
import { SaveData } from '../src/core/SaveData';
import type { Viewport } from '../src/core/Viewport';
import { Bot } from '../src/entities/Bot';
import { EntityRegistry } from '../src/entities/EntityRegistry';
import { EntityFactory } from '../src/factories/EntityFactory';
import { PhysicsWorld } from '../src/physics/PhysicsWorld';
import { ARENA, ArenaSystem } from '../src/systems/ArenaSystem';
import { CombatSystem } from '../src/systems/CombatSystem';

const { Body } = Matter;
const STEP = 1000 / 60;

function setup() {
  const bus = new EventBus<EventMap>();
  const state = new GameStateMachine();
  state.transition('playing');
  const clock = { now: () => 0 };
  const camera = { shake: () => {}, snap: () => {} } as unknown as Camera;
  const viewport = { width: 800, height: 600 } as unknown as Viewport;
  const stats = new RunStats();
  const save = new SaveData(null);
  const physics = new PhysicsWorld();
  const registry = new EntityRegistry();
  const factory = new EntityFactory(physics, registry, bus, gameConfig);
  const player = factory.createPlayer({ x: 0, y: 0 });
  const combat = new CombatSystem(physics, registry, player, state, bus, camera, stats, clock, gameConfig);
  const arena = new ArenaSystem(
    registry, factory, physics, player, combat, bus, camera, viewport, stats, clock, gameConfig, save, () => 1,
  );
  combat.onPlayerDeath = () => arena.playerKOd();
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      combat.update(STEP);
      arena.update(STEP);
      physics.step(STEP);
    }
  };
  return { bus, state, player, physics, registry, combat, arena, step };
}

describe('Multiplayer (Bots) arena', () => {
  it('spawns a full lobby of bots', () => {
    const { arena } = setup();
    arena.start();
    expect(arena.bots.size).toBe(ARENA.bots);
    expect(arena.standings()).toHaveLength(ARENA.bots + 1);
  });

  it('a hard ram by you damages a bot, and a KO is credited to you', () => {
    const { arena, player, step } = setup();
    arena.start();
    const bot = [...arena.bots][0]!;
    // Freeze the bot's AI so it doesn't dodge, and put it right in front of you.
    bot.nextLaunchMs = Infinity;
    Body.setPosition(bot.body, { x: 60, y: 0 });
    Body.setVelocity(bot.body, { x: 0, y: 0 });
    bot.health.damage(bot.health.maxHp - 1);
    Body.setPosition(player.body, { x: 0, y: 0 });
    Body.setVelocity(player.body, { x: 14, y: 0 });
    for (let i = 0; i < 20 && !bot.dead; i++) step();
    expect(bot.dead).toBe(true);
    expect(arena.you.kos).toBe(1);
    expect(bot.profile.deaths).toBe(1);
  });

  it('respawns you instead of ending the game', () => {
    const { arena, combat, player, state } = setup();
    arena.start();
    combat.killPlayer();
    expect(state.is('playing')).toBe(true);
    expect(player.health.hp).toBe(player.health.maxHp);
    expect(arena.you.deaths).toBe(1);
  });

  it('respawns KO’d bots after the delay', () => {
    const { arena, step } = setup();
    arena.start();
    const bot = [...arena.bots][0]!;
    bot.health.damage(1000);
    // Trigger the KO through the arena's own handling.
    (arena as unknown as { koBot(b: Bot): void }).koBot(bot);
    expect(arena.bots.size).toBe(ARENA.bots - 1);
    step(Math.ceil(ARENA.respawnMs / STEP) + 2);
    expect(arena.bots.size).toBe(ARENA.bots);
    expect([...arena.bots].some((b) => b.profile === bot.profile)).toBe(true);
  });

  it('ends the match at the KO target and reports your placement', () => {
    const { arena, step } = setup();
    let result: Parameters<ArenaSystem['onEnd']>[0] | null = null;
    arena.onEnd = (r) => (result = r);
    arena.start();
    arena.you.kos = ARENA.koTarget;
    step();
    expect(arena.active).toBe(false);
    expect(result).not.toBeNull();
    expect(result!.place).toBe(1);
    expect(result!.coins).toBeGreaterThan(0);
  });
});
