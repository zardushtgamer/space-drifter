import type { EntityRegistry } from '../entities/EntityRegistry';
import type { ISystem } from './ISystem';

/** Runs per-entity AI (enemies, bosses). */
export class EntityUpdateSystem implements ISystem {
  constructor(private readonly registry: EntityRegistry) {}

  update(dtMs: number): void {
    // Copy: updates may spawn entities (e.g. boss bullets are not entities, but be safe).
    for (const e of [...this.registry.all()]) if (!e.dead) e.update?.(dtMs);
  }

  dispose(): void {}
}
