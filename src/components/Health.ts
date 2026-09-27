import type { IDamageable } from '../core/types';

export type HealthChange = (hp: number, maxHp: number) => void;

export class Health implements IDamageable {
  private current: number;

  constructor(
    readonly maxHp: number,
    private readonly onChange?: HealthChange,
  ) {
    if (!(maxHp > 0)) throw new Error('maxHp must be positive');
    this.current = maxHp;
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
