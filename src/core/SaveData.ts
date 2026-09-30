import { BALLS, DEFAULT_BALL, DEFAULT_EFFECT, DEFAULT_TRAIL, EFFECTS, TRAILS } from '../config/cosmetics';
import { computeModifiers, upgradePrice, type Modifiers, type UpgradeDef, type UpgradeId } from '../config/upgrades';

export type Slot = 'ball' | 'trail' | 'effect';

export interface SaveState {
  coins: number;
  owned: string[];
  ball: string;
  trail: string;
  effect: string;
  /** Permanent unlocks, e.g. 'andromeda'. */
  unlocked: string[];
  /** Upgrade id -> level bought. */
  upgrades: Partial<Record<UpgradeId, number>>;
  /** Lifetime counters for achievements (kills, gems, ...). */
  counters: Record<string, number>;
}

/** Minimal Storage subset, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'space-drift:save:v1';
const FREE = [...BALLS, ...TRAILS, ...EFFECTS].filter((c) => c.price === 0).map((c) => c.id);

/** Coins, owned cosmetics and the equipped loadout, persisted to storage. */
export class SaveData {
  private state: SaveState;
  /** Extra coin multiplier for the current run only (e.g. the Greed perk). Not saved. */
  runCoinBoost: () => number = () => 1;

  constructor(private readonly store: KeyValueStore | null) {
    this.state = {
      coins: 0,
      owned: [...FREE],
      ball: DEFAULT_BALL,
      trail: DEFAULT_TRAIL,
      effect: DEFAULT_EFFECT,
      unlocked: [],
      upgrades: {},
      counters: {},
    };
    try {
      const raw = store?.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveState>;
        this.state = {
          coins: Math.max(0, Math.floor(Number(parsed.coins) || 0)),
          owned: [...new Set([...FREE, ...(parsed.owned ?? [])])],
          ball: parsed.ball ?? DEFAULT_BALL,
          trail: parsed.trail ?? DEFAULT_TRAIL,
          effect: parsed.effect ?? DEFAULT_EFFECT,
          unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
          upgrades: typeof parsed.upgrades === 'object' && parsed.upgrades ? parsed.upgrades : {},
          counters: typeof parsed.counters === 'object' && parsed.counters ? parsed.counters : {},
        };
      }
    } catch {
      // Corrupt or blocked storage: start fresh.
    }
  }

  get coins(): number {
    return this.state.coins;
  }

  get ball(): string {
    return this.state.ball;
  }

  get trail(): string {
    return this.state.trail;
  }

  get effect(): string {
    return this.state.effect;
  }

  owns(id: string): boolean {
    return this.state.owned.includes(id);
  }

  isUnlocked(id: string): boolean {
    return this.state.unlocked.includes(id);
  }

  /** Returns true if this call newly unlocked it. */
  unlock(id: string): boolean {
    if (this.isUnlocked(id)) return false;
    this.state.unlocked.push(id);
    this.save();
    return true;
  }

  /** Earns coins, boosted by the Lucky Charm upgrade. Returns the coins actually added. */
  addCoins(amount: number): number {
    const gained = Math.max(0, Math.floor(amount * this.modifiers().coinMultiplier * this.runCoinBoost()));
    this.state.coins += gained;
    this.save();
    return gained;
  }

  /** Adds coins with no multipliers (achievement rewards). */
  grantCoins(amount: number): void {
    this.state.coins += Math.max(0, Math.floor(amount));
    this.save();
  }

  counter(key: string): number {
    return this.state.counters[key] ?? 0;
  }

  addToCounter(key: string, amount: number): void {
    if (amount <= 0) return;
    this.state.counters[key] = this.counter(key) + amount;
    this.save();
  }

  /** Number of owned cosmetic items (balls, trails, effects). */
  get ownedCount(): number {
    return this.state.owned.filter((id) => !id.startsWith('dim-')).length;
  }

  upgradeLevel(id: UpgradeId): number {
    return Math.max(0, Math.floor(this.state.upgrades[id] ?? 0));
  }

  /** Buys the next level of an upgrade. Returns false if maxed or too expensive. */
  buyUpgrade(def: UpgradeDef): boolean {
    const level = this.upgradeLevel(def.id);
    const price = upgradePrice(def, level);
    if (level >= def.maxLevel || this.state.coins < price) return false;
    this.state.coins -= price;
    this.state.upgrades[def.id] = level + 1;
    this.save();
    return true;
  }

  modifiers(): Modifiers {
    return computeModifiers((id) => this.upgradeLevel(id));
  }

  /** Returns false if already owned or too expensive. */
  buy(id: string, price: number): boolean {
    if (this.owns(id) || this.state.coins < price) return false;
    this.state.coins -= price;
    this.state.owned.push(id);
    this.save();
    return true;
  }

  equip(slot: Slot, id: string): boolean {
    if (!this.owns(id)) return false;
    this.state[slot] = id;
    this.save();
    return true;
  }

  private save(): void {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // Storage full or blocked: progress just won't persist.
    }
  }
}
