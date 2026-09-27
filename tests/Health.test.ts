import { describe, expect, it, vi } from 'vitest';
import { Health } from '../src/components/Health';

describe('Health', () => {
  it('starts full', () => {
    const h = new Health(100);
    expect(h.hp).toBe(100);
    expect(h.isDead()).toBe(false);
  });

  it('damages, clamps at 0, and reports death', () => {
    const h = new Health(10);
    h.damage(4);
    expect(h.hp).toBe(6);
    h.damage(50);
    expect(h.hp).toBe(0);
    expect(h.isDead()).toBe(true);
  });

  it('heals up to max', () => {
    const h = new Health(10);
    h.damage(5);
    h.heal(100);
    expect(h.hp).toBe(10);
  });

  it('ignores negative amounts', () => {
    const h = new Health(10);
    h.damage(-5);
    h.heal(-5);
    expect(h.hp).toBe(10);
  });

  it('calls onChange only when hp actually changes', () => {
    const fn = vi.fn();
    const h = new Health(10, fn);
    h.heal(5);
    expect(fn).not.toHaveBeenCalled();
    h.damage(3);
    expect(fn).toHaveBeenCalledWith(7, 10);
    h.damage(100);
    h.damage(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects non-positive max', () => {
    expect(() => new Health(0)).toThrow();
  });
});
