export interface Vec2 {
  x: number;
  y: number;
}

export interface IUpdatable {
  update(dtMs: number): void;
}

export interface IDisposable {
  dispose(): void;
}

export interface IDamageable {
  readonly hp: number;
  readonly maxHp: number;
  damage(amount: number): void;
  isDead(): boolean;
}
