import { describe, expect, it } from 'vitest';
import { SaveData, type KeyValueStore } from '../src/core/SaveData';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('SaveData', () => {
  it('starts with free cosmetics equipped and no coins', () => {
    const s = new SaveData(memoryStore());
    expect(s.coins).toBe(0);
    expect(s.owns(s.ball)).toBe(true);
    expect(s.owns(s.trail)).toBe(true);
  });

  it('buys only when affordable and not owned', () => {
    const s = new SaveData(memoryStore());
    expect(s.buy('ember', 60)).toBe(false);
    s.addCoins(100);
    expect(s.buy('ember', 60)).toBe(true);
    expect(s.coins).toBe(40);
    expect(s.buy('ember', 60)).toBe(false);
  });

  it('only equips owned items', () => {
    const s = new SaveData(memoryStore());
    expect(s.equip('ball', 'gold')).toBe(false);
    s.addCoins(300);
    s.buy('gold', 250);
    expect(s.equip('ball', 'gold')).toBe(true);
    expect(s.ball).toBe('gold');
  });

  it('persists across instances', () => {
    const store = memoryStore();
    const a = new SaveData(store);
    a.addCoins(90);
    a.buy('toxic', 90);
    a.equip('ball', 'toxic');
    const b = new SaveData(store);
    expect(b.coins).toBe(0);
    expect(b.owns('toxic')).toBe(true);
    expect(b.ball).toBe('toxic');
  });

  it('persists unlocks and reports only the first unlock', () => {
    const store = memoryStore();
    const a = new SaveData(store);
    expect(a.isUnlocked('andromeda')).toBe(false);
    expect(a.unlock('andromeda')).toBe(true);
    expect(a.unlock('andromeda')).toBe(false);
    expect(new SaveData(store).isUnlocked('andromeda')).toBe(true);
  });

  it('survives corrupt or missing storage', () => {
    const store = memoryStore();
    store.data.set('space-drift:save:v1', '{not json');
    expect(new SaveData(store).coins).toBe(0);
    expect(() => new SaveData(null).addCoins(5)).not.toThrow();
  });
});
