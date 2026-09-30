import type { IDamageable } from '../core/types';

export type HealthChange = (hp: number, maxHp: number) => void;

export class Health implements IDamageable {
  private current: number;
  private max: number;

  constructor(
    maxHp: number,
    private readonly onChange?: HealthChange,
  ) {
    if (!(maxHp > 0)) throw new Error('maxHp must be positive');
    this.max = maxHp;
    this.current = maxHp;
  }

  get maxHp(): number {
    return this.max;
  }

  /** Raises (or lowers) max HP; current HP is clamped to it. */
  setMaxHp(value: number): void {
    if (!(value > 0)) throw new Error('maxHp must be positive');
    this.max = value;
    this.set(this.current);
  }

  get hp(): number {
    return this.current;
  }

  damage(amount: number): void {
    this.set(this.current - Math.max(0, amount));
  }

  heal(amount: number): void {
    this.set(this.current + Math.max(0, amount));
  }

  isDead(): boolean {
    return this.current <= 0;
  }

  private set(value: number): void {
    const next = Math.min(this.maxHp, Math.max(0, value));
    if (next === this.current) return;
    this.current = next;
    this.onChange?.(next, this.maxHp);
  }
}
