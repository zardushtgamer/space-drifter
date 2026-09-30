import { DIMENSION_IDS, DIMENSIONS, dimensionPassId, type DimensionId } from '../config/dimensions';
import { BALLS, EFFECTS, findBall, TRAILS, type ShopItem, type BallSkin, type CosmeticColor, type TrailSkin } from '../config/cosmetics';
import { UPGRADES, upgradePrice, type UpgradeDef } from '../config/upgrades';
import type { SaveData, Slot } from '../core/SaveData';
import { drawBall, drawEffect } from '../rendering/effects';

const RAINBOW = 'linear-gradient(90deg,#ff4d4d,#ffd166,#4ade80,#5ee7ff,#8b5cf6,#e879f9)';

const cssColor = (c: CosmeticColor) => (c === 'rainbow' ? RAINBOW : c);

const BALL_PREVIEW_SIZE = 48;

/** Live canvas preview, so patterns and rainbow fills animate. */
function ballPreview(b: BallSkin): string {
  return `<canvas data-ball="${b.id}" style="width:${BALL_PREVIEW_SIZE}px;height:${BALL_PREVIEW_SIZE}px"></canvas>`;
}

function trailPreview(t: TrailSkin): string {
  if (t.style === 'none') return `<div class="h-2 w-20 rounded-full border border-dashed border-white/25"></div>`;
  if (t.style === 'afterimage') {
    const dot = (a: number) =>
      `<div style="width:18px;height:18px;border-radius:50%;background:rgba(96,165,250,${a});border:1.5px solid rgba(191,219,254,${a});box-shadow:0 0 8px rgba(59,130,246,${a})"></div>`;
    return `<div class="flex items-center gap-1">${dot(0.2)}${dot(0.4)}${dot(0.7)}${dot(1)}${dot(0.3)}</div>`;
  }
  const colors = t.colors === 'ball' ? ['#5ee7ff'] : t.colors;
  const bg =
    colors.length === 1 ? (colors[0] === 'rainbow' ? RAINBOW : `linear-gradient(90deg,transparent,${colors[0]})`)
    : `linear-gradient(90deg,transparent,${colors.map(cssColor).join(',')})`;
  const dotted = t.style === 'sparks' ? '-webkit-mask:radial-gradient(circle,#000 45%,transparent 50%) 0 0/8px 8px;mask:radial-gradient(circle,#000 45%,transparent 50%) 0 0/8px 8px;' : '';
  return `<div style="height:${t.style === 'sparks' ? 8 : 10}px;width:80px;border-radius:999px;background:${bg};${dotted}"></div>`;
}

const PREVIEW_SIZE = 80;
const PREVIEW_BALL = 14;

function effectPreview(id: string): string {
  return `<canvas data-effect="${id}" style="width:${PREVIEW_SIZE}px;height:${PREVIEW_SIZE}px"></canvas>`;
}

/** Modal shop for buying and equipping balls, trails and effects. */
export class Shop {
  private root: HTMLDivElement | null = null;
  private rafId: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly save: SaveData,
  ) {}

  open(onClose?: () => void): void {
    this.close();
    const root = document.createElement('div');
    root.className =
      'pointer-events-auto fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-space/90 px-4 py-8';
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!btn) return;
      const { action, slot, id, price } = btn.dataset;
      if (action === 'close') {
        this.close();
        onClose?.();
        return;
      }
      if (action === 'buy-upgrade' && id) {
        const def = UPGRADES.find((u) => u.id === id);
        if (def) this.save.buyUpgrade(def);
        this.render();
        return;
      }
      if (action === 'buy-dimension' && id) {
        this.save.buy(id, Number(price));
        this.render();
        return;
      }
      if (!slot || !id) return;
      if (action === 'buy' && this.save.buy(id, Number(price))) this.save.equip(slot as Slot, id);
      if (action === 'equip') this.save.equip(slot as Slot, id);
      this.render();
    });
    this.root = root;
    this.container.appendChild(root);
    this.render();
  }

  close(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.root?.remove();
    this.root = null;
  }

  private render(): void {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="w-full max-w-2xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-3xl font-bold">Shop</h2>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-white/10 px-4 py-1.5 font-bold text-yellow-300">● ${this.save.coins}</span>
            <button data-action="close" class="rounded-full bg-white/10 px-4 py-1.5 hover:bg-white/20">Done</button>
          </div>
        </div>
        <h3 class="mb-1 text-sm font-medium tracking-widest text-white/60">UPGRADES</h3>
        <p class="mb-3 text-xs text-white/40">Permanent. Take effect immediately (extra max HP from your next ship).</p>
        <div class="mb-8 grid gap-3 sm:grid-cols-2">
          ${UPGRADES.map((u) => this.upgradeCard(u)).join('')}
        </div>
        <h3 class="mb-3 text-sm font-medium tracking-widest text-white/60">DIMENSIONS</h3>
        <div class="mb-8 grid gap-3">
          ${DIMENSION_IDS.filter((d) => DIMENSIONS[d].price).map((d) => this.dimensionCard(d)).join('')}
        </div>
        <h3 class="mb-3 text-sm font-medium tracking-widest text-white/60">BALLS</h3>
        <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          ${BALLS.map((b) => this.card('ball', b, ballPreview(b))).join('')}
        </div>
        <h3 class="mb-3 text-sm font-medium tracking-widest text-white/60">TRAILS</h3>
        <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          ${TRAILS.map((t) => this.card('trail', t, trailPreview(t))).join('')}
        </div>
        <h3 class="mb-3 text-sm font-medium tracking-widest text-white/60">EFFECTS</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          ${EFFECTS.map((f) => this.card('effect', f, effectPreview(f.id))).join('')}
        </div>
      </div>`;
    this.startPreviews();
  }

  /** Animates every ball and effect preview canvas while the shop is open. */
  private startPreviews(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const canvases = [...(this.root?.querySelectorAll<HTMLCanvasElement>('canvas[data-effect]') ?? [])];
    const balls = [...(this.root?.querySelectorAll<HTMLCanvasElement>('canvas[data-ball]') ?? [])];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of canvases) {
      c.width = PREVIEW_SIZE * dpr;
      c.height = PREVIEW_SIZE * dpr;
    }
    for (const c of balls) {
      c.width = BALL_PREVIEW_SIZE * dpr;
      c.height = BALL_PREVIEW_SIZE * dpr;
    }
    const tick = (now: number) => {
      const ball = findBall(this.save.ball);
      for (const c of balls) {
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        const mid = BALL_PREVIEW_SIZE / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, BALL_PREVIEW_SIZE, BALL_PREVIEW_SIZE);
        drawBall(ctx, findBall(c.dataset.ball ?? ''), mid, mid, 16, now, 12);
      }
      for (const c of canvases) {
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        const id = c.dataset.effect ?? '';
        const mid = PREVIEW_SIZE / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        drawEffect(ctx, id, mid, mid, PREVIEW_BALL, now, 'under');
        drawBall(ctx, ball, mid, mid, PREVIEW_BALL, now, 12);
        drawEffect(ctx, id, mid, mid, PREVIEW_BALL, now, 'over');
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private upgradeCard(u: UpgradeDef): string {
    const level = this.save.upgradeLevel(u.id);
    const maxed = level >= u.maxLevel;
    const price = upgradePrice(u, level);
    const affordable = this.save.coins >= price;
    const pips = Array.from(
      { length: u.maxLevel },
      (_, i) => `<span class="inline-block h-2 w-5 rounded-full ${i < level ? 'bg-good' : 'bg-white/15'}"></span>`,
    ).join('');
    const button = maxed
      ? `<div class="rounded-lg bg-good/20 px-3 py-1.5 text-sm text-good">MAX</div>`
      : `<button data-action="buy-upgrade" data-id="${u.id}" ${affordable ? '' : 'disabled'}
           class="rounded-lg px-4 py-1.5 font-bold ${affordable ? 'bg-yellow-300 text-space hover:bg-yellow-200' : 'bg-white/5 text-white/30'}">● ${price}</button>`;
    return `
      <div class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div class="text-2xl">${u.icon}</div>
        <div class="flex-1">
          <div class="font-medium">${u.name} <span class="text-xs text-white/50">Lv ${level}/${u.maxLevel}</span></div>
          <div class="text-xs text-white/60">${u.perLevel} per level</div>
          <div class="mt-1 flex gap-1">${pips}</div>
        </div>
        ${button}
      </div>`;
  }

  /** A paid area: buy once to unlock travel there and let dimension holes lead to it. */
  private dimensionCard(id: DimensionId): string {
    const d = DIMENSIONS[id];
    const price = d.price ?? 0;
    const pass = dimensionPassId(id);
    const owned = this.save.owns(pass);
    const affordable = this.save.coins >= price;
    const perks = [`×${d.coinMultiplier} coins`];
    if (d.caves) perks.push('rock caves & darkness');
    if (d.special) perks.push(`${d.special.type}s`);
    if (d.hazard) perks.push(`${d.hazard.type} hazards`);
    const button = owned
      ? `<div class="rounded-lg bg-good/20 px-4 py-1.5 text-good">Unlocked · travel from the pause menu</div>`
      : `<button data-action="buy-dimension" data-id="${pass}" data-price="${price}" ${affordable ? '' : 'disabled'}
           class="rounded-lg px-5 py-1.5 font-bold ${affordable ? 'bg-yellow-300 text-space hover:bg-yellow-200' : 'bg-white/5 text-white/30'}">● ${price}</button>`;
    const bg = d.nebula ? `radial-gradient(circle at 20% 30%, ${d.nebula[0]}, transparent 70%), ${d.rockFill}` : d.rockFill;
    return `
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style="border-color:${d.labelColor};background:${bg}">
        <div>
          <div class="text-lg font-bold" style="color:${d.labelColor}">🌀 ${d.name}</div>
          <div class="text-sm text-white/70">${perks.join(' · ')}</div>
        </div>
        ${button}
      </div>`;
  }

  private card(slot: Slot, item: ShopItem, preview: string): string {
    const { id, name, price } = item;
    const theme = item.theme ? DIMENSIONS[item.theme] : null;
    const tag = theme
      ? `<div class="rounded-full border px-2 text-[10px] font-bold tracking-wider" style="color:${theme.labelColor};border-color:${theme.labelColor}">${theme.name.toUpperCase()}</div>`
      : '';
    const equipped = this.save[slot] === id;
    const owned = this.save.owns(id);
    const affordable = this.save.coins >= price;
    const button =
      equipped ? `<button disabled class="w-full rounded-lg bg-good/20 py-1.5 text-good">Equipped</button>`
      : owned ? `<button data-action="equip" data-slot="${slot}" data-id="${id}" class="w-full rounded-lg bg-white/10 py-1.5 hover:bg-white/20">Equip</button>`
      : `<button data-action="buy" data-slot="${slot}" data-id="${id}" data-price="${price}" ${affordable ? '' : 'disabled'}
           class="w-full rounded-lg py-1.5 font-bold ${affordable ? 'bg-yellow-300 text-space hover:bg-yellow-200' : 'bg-white/5 text-white/30'}">● ${price}</button>`;
    return `
      <div class="flex flex-col items-center gap-3 rounded-xl border ${equipped ? 'border-good/60' : 'border-white/10'} bg-white/5 p-4">
        <div class="flex ${slot === 'effect' ? 'h-20' : 'h-10'} items-center">${preview}</div>
        <div class="font-medium">${name}</div>
        ${tag}
        ${button}
      </div>`;
  }
}
