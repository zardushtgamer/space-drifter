import './styles.css';
import { DIMENSION_IDS, DIMENSIONS, DimensionState, dimensionPassId, type DimensionId } from './config/dimensions';
import { CaveLightDrawer } from './rendering/drawers/CaveLightDrawer';
import { LandmarkArt, LandmarkPointerDrawer } from './rendering/drawers/LandmarkDrawer';
import { LandmarkSystem } from './systems/LandmarkSystem';
import { RegenSystem } from './systems/RegenSystem';
import { RunLevels } from './core/RunLevels';
import { combineModifiers } from './config/upgrades';
import { AmbientSystem } from './systems/AmbientSystem';
import { AmbientDrawer } from './rendering/drawers/AmbientDrawer';
import { GasGiantSystem } from './systems/GasGiantSystem';
import { SingularitySystem } from './systems/SingularitySystem';
import { TrajectoryPredictor } from './systems/TrajectoryPredictor';
import { RadarDrawer } from './rendering/drawers/RadarDrawer';
import { DebugDrawer } from './rendering/drawers/DebugDrawer';
import { KillFxDrawer } from './rendering/drawers/KillFxDrawer';
import { AchievementSystem } from './systems/AchievementSystem';
import { showAchievements, showAchievementToast } from './ui/achievements';
import { GasGiantDrawer } from './rendering/drawers/GasGiantDrawer';
import { gameConfig } from './config/gameConfig';
import { Camera } from './core/Camera';
import { PerformanceClock } from './core/Clock';
import { EventBus } from './core/EventBus';
import type { EventMap } from './core/events';
import { Game } from './core/Game';
import { GameStateMachine } from './core/GameStateMachine';
import { RunStats } from './core/RunStats';
import { SaveData } from './core/SaveData';
import { Viewport } from './core/Viewport';
import { EntityRegistry } from './entities/EntityRegistry';
import { EntityFactory } from './factories/EntityFactory';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { CanvasRenderer } from './rendering/CanvasRenderer';
import { BossDrawer } from './rendering/drawers/BossDrawer';
import { DragIndicatorDrawer } from './rendering/drawers/DragIndicatorDrawer';
import { DrawerRegistry } from './rendering/drawers/DrawerRegistry';
import { EnemyDrawer } from './rendering/drawers/EnemyDrawer';
import { HudDrawer } from './rendering/drawers/HudDrawer';
import { ObstacleDrawer } from './rendering/drawers/ObstacleDrawer';
import { PlayerDrawer } from './rendering/drawers/PlayerDrawer';
import { ProjectileDrawer } from './rendering/drawers/ProjectileDrawer';
import { StarfieldDrawer } from './rendering/drawers/StarfieldDrawer';
import { CombatSystem } from './systems/CombatSystem';
import { DistanceRewardSystem } from './systems/DistanceRewardSystem';
import { EntityUpdateSystem } from './systems/EntityUpdateSystem';
import { GravitySystem } from './systems/GravitySystem';
import { Wormhole } from './systems/Wormhole';
import { Ton618System } from './systems/Ton618System';
import { Ton618Drawer } from './rendering/drawers/Ton618Drawer';
import { TimeScale } from './core/TimeScale';
import { SpacetimeDrawer } from './rendering/drawers/SpacetimeDrawer';
import { InputSystem } from './systems/InputSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { WorldSystem } from './systems/WorldSystem';
import {
  consumeAutostart,
  setAchievementsOpener,
  showGameOver,
  showLevelUp,
  showPauseMenu,
  showStartMenu,
  type PauseMenu,
} from './ui/menus';
import { Shop } from './ui/Shop';

function storageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas missing');
const ui = document.querySelector<HTMLDivElement>('#ui');
if (!ui) throw new Error('#ui missing');

const config = gameConfig;
const bus = new EventBus<EventMap>();
const state = new GameStateMachine();
const clock = new PerformanceClock();
const viewport = new Viewport(window);
const camera = new Camera(viewport, clock);
const stats = new RunStats();
const save = new SaveData(storageOrNull());
const shop = new Shop(ui, save);

const physics = new PhysicsWorld();
const registry = new EntityRegistry();
const factory = new EntityFactory(physics, registry, bus, config);

// Per-run XP and perks. Kills, bosses and round clears level you up.
const levels = new RunLevels(bus, { perBossLevel: 250, perRound: 15 });
save.runCoinBoost = () => levels.modifiers().coinMultiplier;

// Shop upgrades and run perks, read live so purchases and level-ups apply at once.
// Upgrade max HP is fixed at spawn; the Vitality perk raises it directly.
const mods = () => combineModifiers(save.modifiers(), levels.modifiers());

// The field is infinite and centered on the origin.
const player = factory.createPlayer({ x: 0, y: 0 }, save.modifiers().maxHpBonus);
camera.snap(player.body.position);

const combat = new CombatSystem(physics, registry, player, state, bus, camera, stats, clock, config, mods);
const projectiles = new ProjectileSystem(player, combat.hurtPlayer, config);
const dimension = new DimensionState();
const ANDROMEDA = 'andromeda';
const world = new WorldSystem(
  factory, registry, player, camera, viewport, combat, projectiles, bus, stats, clock, config,
  dimension, () => dimensionsOpen(), () => DIMENSION_IDS.filter(dimensionOwned),
);
/** Rifts and travel are open when config says they're free, or once unlocked. */
function dimensionsOpen(): boolean {
  return config.rifts.free || save.isUnlocked(ANDROMEDA);
}
/** Paid dimensions (e.g. Rock Caverns) must be bought in the shop first. */
function dimensionOwned(id: DimensionId): boolean {
  return !DIMENSIONS[id].price || save.owns(dimensionPassId(id));
}
const timeScale = new TimeScale();
const wormhole = new Wormhole(player, camera, combat, projectiles, factory, world, stats, clock, config, dimension);
const gravity = new GravitySystem(registry, player, wormhole, timeScale, config);
const ton618 = new Ton618System(world, registry, player, combat, gravity, timeScale, stats, clock, config);
const landmarks = new LandmarkSystem(
  world, registry, player, combat, projectiles, save, stats, clock, config.obstacles.healthPackHeal,
  () => mods().pickupReach,
);
const ambient = new AmbientSystem(registry, player, dimension, config);
const gasGiant = new GasGiantSystem(world, registry, player, combat, config);
const singularity = new SingularitySystem(
  registry, player, combat, projectiles, () => save.upgradeLevel('singularity'), () => stats.swallowed++,
);
const achievements = new AchievementSystem(
  save, stats, levels, dimension, () => gasGiant.depth, bus, (def) => showAchievementToast(ui, def),
  () => Math.hypot(player.body.velocity.x, player.body.velocity.y) / config.player.machSpeed,
);
setAchievementsOpener((onClose) => showAchievements(ui, save, achievements.context(), onClose));

// Simulates your drift for the Afterimage trail's look-ahead ghosts.
const predictor = new TrajectoryPredictor(gravity, gasGiant, ton618, landmarks, ambient, dimension, config);

const dragIndicator = new DragIndicatorDrawer(player, bus, config);
const drawers = new DrawerRegistry()
  .register('player', new PlayerDrawer(config, save, singularity, predictor))
  .register('enemy', new EnemyDrawer(config))
  .register('boss', new BossDrawer(config))
  .register('obstacle', new ObstacleDrawer(config, dimension, new LandmarkArt(landmarks)));
const renderer = new CanvasRenderer(
  canvas,
  registry,
  drawers,
  {
    background: [new StarfieldDrawer(config, dimension), new AmbientDrawer(dimension, ambient, 'background')],
    world: [
      new ProjectileDrawer(projectiles, config),
      new KillFxDrawer(bus, save),
      new DebugDrawer('world', save, registry, physics, player, dimension, timeScale, config),
    ],
    foreground: [
      new CaveLightDrawer(player, dimension, config),
      new AmbientDrawer(dimension, ambient, 'foreground'),
      new SpacetimeDrawer(gravity, wormhole, config),
      new Ton618Drawer(world, ton618, config),
      new LandmarkPointerDrawer(world, dimension, config),
      new GasGiantDrawer(world, gasGiant, config),
      new RadarDrawer(registry, player, world, () => save.upgradeLevel('radar'), config),
      new DebugDrawer('hud', save, registry, physics, player, dimension, timeScale, config),
      dragIndicator, new HudDrawer(player, world, stats, save, config, dimension, levels)],
  },
  camera,
  config,
);

const systems = [
  // Thrusters upgrade × the Solar Array's overdrive.
  new InputSystem(canvas, player, state, bus, config, dimension, () => mods().launchPower * landmarks.launchBoost),
  new RegenSystem(player, () => mods().regenPerSec),
  new EntityUpdateSystem(registry),
  gravity,
  // After gravity, so its deeper time dilation wins.
  ton618,
  landmarks,
  ambient,
  gasGiant,
  // Before projectiles, so bullets are swallowed before they can hit.
  singularity,
  projectiles,
  combat,
  world,
  new DistanceRewardSystem(stats, save, dimension, config),
  achievements,
];

const game = new Game({ physics, renderer, systems, state, viewport, clock, config, timeScale });
game.start();

bus.on('game:lost', () => {
  const { scorePerCoin, coinsPerBoss, pxPerLy } = config.economy;
  const endBonus = save.addCoins(Math.floor(stats.score / scorePerCoin) + stats.bossesDefeated * coinsPerBoss);
  pauseButton.classList.add('hidden');
  // Distance, gem and landmark coins were already paid during the run; show the run total.
  const runTotal = endBonus + stats.distanceCoins + stats.bonusCoins;
  showGameOver(ui, stats, Math.floor(stats.farthest / pxPerLy), runTotal, save, shop);
});

// --- pause ---------------------------------------------------------------
let pauseMenu: PauseMenu | null = null;
const resume = () => {
  pauseMenu?.close();
  pauseMenu = null;
  if (state.transition('playing')) pauseButton.classList.remove('hidden');
};
const pause = () => {
  if (!state.transition('paused')) return;
  pauseButton.classList.add('hidden');
  const destinations = DIMENSION_IDS.filter((id) => id !== dimension.current).map((id) => {
    const d = DIMENSIONS[id];
    const perks = [d.coinMultiplier > 1 ? `×${d.coinMultiplier} coins` : 'home'];
    if (d.special) perks.push(d.special.type + 's');
    if (d.hazard) perks.push(d.hazard.type);
    const locked = dimensionOwned(id) ? undefined : `Buy in the shop · ● ${d.price}`;
    return { id, name: d.name, color: d.labelColor, note: perks.join(' · '), locked };
  });
  pauseMenu = showPauseMenu(ui, save, shop, resume, {
    destinations,
    unlocked: dimensionsOpen(),
    lockedHint: `Clear round ${config.rifts.unlockRound} to unlock the other dimensions`,
    onTravel: (id) => {
      resume();
      wormhole.travelDimension(id as DimensionId);
    },
  });
};

// Clearing the unlock round opens Andromeda for good.
bus.on('round:cleared', ({ round }) => {
  if (config.rifts.free || round < config.rifts.unlockRound || !save.unlock(ANDROMEDA)) return;
  stats.banner = { text: 'DIMENSIONS UNLOCKED · DIMENSION HOLES OPEN', untilMs: clock.now() + 4000 };
});

const pauseButton = document.createElement('button');
pauseButton.className =
  'pointer-events-auto fixed left-1/2 top-3 hidden -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold hover:bg-white/20';
pauseButton.textContent = '❚❚ Pause';
pauseButton.addEventListener('click', pause);
ui.appendChild(pauseButton);

// --- level ups -------------------------------------------------------------
// The game pauses for each perk pick; several level-ups at once are offered back to back.
let choosingPerk = false;
const showNextLevelUp = () => {
  const choices = levels.rollChoices();
  if (choices.length === 0) {
    // Every perk is maxed: nothing to pick.
    levels.skip();
    if (levels.pending > 0) showNextLevelUp();
    else finishLevelUps();
    return;
  }
  showLevelUp(ui, levels.level - levels.pending + 1, choices, (id) => levels.stack(id), (id) => {
    levels.choose(id, player.health);
    if (levels.pending > 0) showNextLevelUp();
    else finishLevelUps();
  });
};
const finishLevelUps = () => {
  choosingPerk = false;
  resume();
};
bus.on('level:up', ({ level }) => {
  stats.level = level;
  if (choosingPerk || !state.is('playing')) return;
  state.transition('paused');
  pauseButton.classList.add('hidden');
  choosingPerk = true;
  showNextLevelUp();
});

window.addEventListener('keydown', (e) => {
  if (choosingPerk) return;
  if (e.key.toLowerCase() === 'b' && state.is('playing') && singularity.level() > 0) {
    singularity.active = !singularity.active;
    stats.banner = {
      text: singularity.active ? `SINGULARITY ON · LV ${singularity.level()}` : 'SINGULARITY OFF',
      untilMs: clock.now() + 1500,
    };
    return;
  }
  if (e.key !== 'Escape' && e.key.toLowerCase() !== 'p') return;
  if (state.is('playing')) pause();
  else if (state.is('paused')) resume();
});
// Auto-pause when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.is('playing') && !choosingPerk) pause();
});

const play = () => {
  state.transition('playing');
  pauseButton.classList.remove('hidden');
  bus.emit('game:started');
};
if (consumeAutostart()) play();
else showStartMenu(ui, save, shop, play);
