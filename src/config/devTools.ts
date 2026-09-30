/** Free debug overlays, toggled in the shop's DEV TOOLS section. */

export type DevToolId = 'hitboxes' | 'velocity' | 'fields' | 'stats';

export interface DevToolDef {
  readonly id: DevToolId;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
}

export const DEV_TOOLS: readonly DevToolDef[] = [
  { id: 'hitboxes', name: 'Hitboxes', icon: '🟩', description: 'Outline every physics body exactly as it collides' },
  { id: 'velocity', name: 'Velocity Vectors', icon: '➡️', description: 'Speed and direction of everything moving' },
  { id: 'fields', name: 'Gravity Fields', icon: '🌀', description: 'Pull and push ranges of planets, black holes, gas giants…' },
  { id: 'stats', name: 'Debug Stats', icon: '📊', description: 'FPS, body count, position, velocity, time scale' },
];

export function devFlag(id: DevToolId): string {
  return `dev-${id}`;
}
