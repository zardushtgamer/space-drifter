import type Matter from 'matter-js';
import type { Entity } from './Entity';

/** Body-id -> entity lookup, used to resolve collision pairs. */
export class EntityRegistry {
  private readonly byBodyId = new Map<number, Entity>();

  add(entity: Entity): void {
    this.byBodyId.set(entity.body.id, entity);
  }

  remove(entity: Entity): void {
    this.byBodyId.delete(entity.body.id);
  }

  get(body: Matter.Body): Entity | undefined {
    return this.byBodyId.get(body.id);
  }

  all(): IterableIterator<Entity> {
    return this.byBodyId.values();
  }

  get size(): number {
    return this.byBodyId.size;
  }

  clear(): void {
    this.byBodyId.clear();
  }
}
