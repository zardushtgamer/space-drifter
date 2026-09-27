import type { EntityKind } from '../../entities/Entity';
import type { IDrawer } from '../IRenderer';

/** Strategy lookup: entity kind -> drawer. */
export class DrawerRegistry {
  private readonly drawers = new Map<EntityKind, IDrawer>();

  register(kind: EntityKind, drawer: IDrawer): this {
    this.drawers.set(kind, drawer);
    return this;
  }

  get(kind: EntityKind): IDrawer | undefined {
    return this.drawers.get(kind);
  }
}
