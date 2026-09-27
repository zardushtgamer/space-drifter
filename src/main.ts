import './styles.css';
import { gameConfig } from './config/gameConfig';
import { PerformanceClock } from './core/Clock';
import { EventBus } from './core/EventBus';
import type { EventMap } from './core/events';
import { Game } from './core/Game';
import { GameStateMachine } from './core/GameStateMachine';
import { Viewport } from './core/Viewport';
import { EntityRegistry } from './entities/EntityRegistry';
import { EntityFactory } from './factories/EntityFactory';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { CanvasRenderer } from './rendering/CanvasRenderer';
import { DragIndicatorDrawer } from './rendering/drawers/DragIndicatorDrawer';
import { DrawerRegistry } from './rendering/drawers/DrawerRegistry';
import { PlayerDrawer } from './rendering/drawers/PlayerDrawer';
import { StarfieldDrawer } from './rendering/drawers/StarfieldDrawer';
import { InputSystem } from './systems/InputSystem';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas missing');
// testing given the current viewport size, we can set the canvas size to match it
const config = gameConfig;
const bus = new EventBus<EventMap>();
const state = new GameStateMachine();
const clock = new PerformanceClock();
const viewport = new Viewport(window);

const physics = new PhysicsWorld(config);
const registry = new EntityRegistry();
const factory = new EntityFactory(physics, registry, bus, config);

const player = factory.createPlayer({ x: viewport.width / 2, y: viewport.height / 2 });

const dragIndicator = new DragIndicatorDrawer(player, bus, config);
const drawers = new DrawerRegistry().register('player', new PlayerDrawer());
const renderer = new CanvasRenderer(canvas, registry, drawers, {
  background: [new StarfieldDrawer(config)],
  foreground: [dragIndicator],
}, config);

const systems = [new InputSystem(canvas, player, state, bus, config)];

const game = new Game({ physics, renderer, systems, state, viewport, clock, config });
game.start();

// Temporary until the start overlay lands in Phase 4.
state.transition('playing');
bus.emit('game:started');
