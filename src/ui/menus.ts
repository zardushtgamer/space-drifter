import type { PerkDef, PerkId } from '../config/perks';
import type { RunStats } from '../core/RunStats';
import type { SaveData } from '../core/SaveData';
import type { Shop } from './Shop';

const BTN = 'pointer-events-auto rounded-full px-8 py-3 text-lg font-bold';
const PRIMARY = `${BTN} bg-player text-space hover:brightness-110`;
const SECONDARY = `${BTN} bg-white/10 hover:bg-white/20`;

function overlay(container: HTMLElement, html: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className =
    'pointer-events-auto fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-space/70 px-4 text-center';
  el.innerHTML = html;
  container.appendChild(el);
  return el;
}

/** Opens the achievements screen; set once by main. Calls `onClose` when it's dismissed. */
let openAchievements: ((onClose: () => void) => void) | null = null;
export function setAchievementsOpener(fn: (onClose: () => void) => void): void {
  openAchievements = fn;
}
const ACH_BUTTON = `<button data-achievements class="${SECONDARY}">🏆 Achievements</button>`;

/** Wires [data-play], [data-shop] and [data-achievements]; sub-screens hide this overlay while open. */
function wireButtons(el: HTMLElement, save: SaveData, shop: Shop, onPlay: () => void): void {
  el.querySelector('[data-play]')?.addEventListener('click', onPlay);
  el.querySelector('[data-achievements]')?.addEventListener('click', () => {
    if (!openAchievements) return;
    el.classList.add('hidden');
    openAchievements(() => {
      el.classList.remove('hidden');
      // Achievement rewards may have added coins.
      const coins = el.querySelector('[data-coins]');
      if (coins) coins.textContent = String(save.coins);
    });
  });
  el.querySelector('[data-shop]')?.addEventListener('click', () => {
    el.classList.add('hidden');
    shop.open(() => {
      el.classList.remove('hidden');
      // Coins may have been spent in the shop.
      const coins = el.querySelector('[data-coins]');
      if (coins) coins.textContent = String(save.coins);
    });
  });
}

export type GameMode = 'solo' | 'arena';

export function showStartMenu(
  container: HTMLElement,
  save: SaveData,
  shop: Shop,
  onPlay: (mode: GameMode) => void,
): void {
  const el = overlay(
    container,
    `<div class="text-6xl font-bold text-player">SPACE DRIFT</div>
     <div class="text-white/70">Drag to launch. Ram enemies at speed. Avoid mines. Grab green crosses to heal.</div>
     <div class="text-white/70">Every light-year you travel from home pays 5 coins.</div>
     <div class="font-bold text-yellow-300">● <span data-coins>${save.coins}</span> coins</div>
     <div class="mt-4 flex flex-wrap justify-center gap-3">
       <button data-play class="${PRIMARY}">Play</button>
       <button data-arena class="${BTN} bg-rose-500 text-white hover:brightness-110">⚔️ Multiplayer (Bots)</button>
       <button data-shop class="${SECONDARY}">Shop</button>
       ${ACH_BUTTON}
     </div>`,
  );
  wireButtons(el, save, shop, () => {
    el.remove();
    onPlay('solo');
  });
  el.querySelector('[data-arena]')?.addEventListener('click', () => {
    el.remove();
    onPlay('arena');
  });
}

/** End of a Multiplayer (Bots) match: final standings, your place, coins. */
export function showArenaResults(
  container: HTMLElement,
  result: { standings: ReadonlyArray<{ name: string; color: string; kos: number; deaths: number; isPlayer: boolean }>; place: number; coins: number },
  save: SaveData,
): void {
  const medal = ['🥇', '🥈', '🥉'][result.place - 1] ?? '';
  const rows = result.standings
    .map(
      (s, i) => `
      <div class="flex justify-between gap-6 rounded-lg px-3 py-1 ${s.isPlayer ? 'bg-player/15 font-bold' : ''}">
        <span style="color:${s.color}">${i + 1}. ${s.name}</span>
        <span>${s.kos} KO · ${s.deaths} deaths</span>
      </div>`,
    )
    .join('');
  const el = overlay(
    container,
    `<div class="text-sm font-bold tracking-[0.3em] text-rose-300">MATCH OVER</div>
     <div class="text-5xl font-bold">${medal} ${ordinal(result.place)} place</div>
     <div class="w-full max-w-sm">${rows}</div>
     <div class="font-bold text-yellow-300">+${result.coins} coins · ● ${save.coins}</div>
     <div class="mt-4 flex gap-3">
       <button data-again class="${PRIMARY}">Fight again</button>
       <button data-menu class="${SECONDARY}">Menu</button>
     </div>`,
  );
  el.querySelector('[data-again]')?.addEventListener('click', () => restartInto('arena'));
  el.querySelector('[data-menu]')?.addEventListener('click', () => location.reload());
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

/** Reloads straight into a mode, skipping the start menu. */
function restartInto(mode: GameMode): void {
  try {
    sessionStorage.setItem('space-drift:autostart', mode);
  } catch {
    // Ignore: the start menu just shows again.
  }
  location.reload();
}

export interface PauseMenu {
  close(): void;
}

export interface TravelDestination {
  id: string;
  name: string;
  color: string;
  /** e.g. "×3 coins" */
  note: string;
  /** If set, this destination is locked and this explains how to open it. */
  locked?: string;
}

export interface TravelOption {
  destinations: readonly TravelDestination[];
  unlocked: boolean;
  /** Shown while locked, e.g. "Clear round 15 to unlock". */
  lockedHint: string;
  onTravel: (id: string) => void;
}

export function showPauseMenu(
  container: HTMLElement,
  save: SaveData,
  shop: Shop,
  onResume: () => void,
  travel: TravelOption,
): PauseMenu {
  const travelButtons = travel.destinations
    .map((d) =>
      travel.unlocked && d.locked
        ? `<button disabled class="cursor-not-allowed rounded-xl bg-white/5 px-4 py-2 text-left text-white/40">
             <div class="font-bold">🔒 ${d.name}</div>
             <div class="text-xs">${d.locked}</div>
           </button>`
        : travel.unlocked
        ? `<button data-travel="${d.id}" class="pointer-events-auto rounded-xl border bg-white/5 px-4 py-2 text-left hover:bg-white/15" style="border-color:${d.color}">
             <div class="font-bold" style="color:${d.color}">🌀 ${d.name}</div>
             <div class="text-xs text-white/60">${d.note}</div>
           </button>`
        : `<button disabled class="cursor-not-allowed rounded-xl bg-white/5 px-4 py-2 text-white/40">🔒 ${d.name}</button>`,
    )
    .join('');
  const travelButton = `
    <div class="text-sm font-medium tracking-widest text-white/60">TRAVEL</div>
    <div class="mt-2 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">${travelButtons}</div>`;
  const el = overlay(
    container,
    `<div class="text-5xl font-bold">PAUSED</div>
     <div class="font-bold text-yellow-300">● <span data-coins>${save.coins}</span> coins</div>
     <div class="mt-4 flex flex-wrap justify-center gap-3">
       <button data-play class="${PRIMARY}">Resume</button>
       <button data-shop class="${SECONDARY}">Shop</button>
       ${ACH_BUTTON}
       <button data-quit class="${SECONDARY}">Quit</button>
     </div>
     <div class="mt-4 flex flex-col items-center">${travelButton}</div>
     ${travel.unlocked ? '' : `<div class="text-sm text-white/50">${travel.lockedHint}</div>`}
     <div class="text-sm text-white/50">Esc to resume</div>`,
  );
  for (const btn of el.querySelectorAll<HTMLButtonElement>('[data-travel]')) {
    btn.addEventListener('click', () => travel.onTravel(btn.dataset.travel ?? ''));
  }
  const menu = {
    close: () => {
      shop.close();
      el.remove();
    },
  };
  wireButtons(el, save, shop, onResume);
  el.querySelector('[data-quit]')?.addEventListener('click', () => location.reload());
  return menu;
}

export function showGameOver(
  container: HTMLElement,
  stats: RunStats,
  ly: number,
  earned: number,
  save: SaveData,
  shop: Shop,
): void {
  const el = overlay(
    container,
    `<div class="text-5xl font-bold text-boss">DRIFT OVER</div>
     <div class="text-xl">Reached round ${stats.round} · Level ${stats.level} · Score ${stats.score}</div>
     <div class="text-white/70">${stats.kills} kills · ${stats.bossesDefeated} bosses · ${ly} ly from home</div>
     <div class="font-bold text-yellow-300">+${earned} coins this run · ● <span data-coins>${save.coins}</span></div>
     <div class="mt-4 flex gap-3">
       <button data-play class="${PRIMARY}">Drift again</button>
       <button data-shop class="${SECONDARY}">Shop</button>
       ${ACH_BUTTON}
     </div>`,
  );
  // Skip the start menu on a quick restart.
  wireButtons(el, save, shop, () => restartInto('solo'));
}

/** Level-up overlay: pick one of the offered perks (click, or press 1–3). */
export function showLevelUp(
  container: HTMLElement,
  level: number,
  choices: readonly PerkDef[],
  stacks: (id: PerkId) => number,
  onPick: (id: PerkId) => void,
): void {
  const cards = choices
    .map((p, i) => {
      const have = stacks(p.id);
      const pips = Array.from(
        { length: p.maxStacks },
        (_, k) => `<span class="inline-block h-1.5 w-4 rounded-full ${k < have ? 'bg-good' : 'bg-white/20'}"></span>`,
      ).join('');
      return `
        <button data-perk="${p.id}" class="pointer-events-auto flex w-56 flex-col items-center gap-2 rounded-2xl border border-yellow-300/40 bg-white/5 p-5 text-center transition hover:-translate-y-1 hover:border-yellow-300 hover:bg-white/10">
          <div class="text-4xl">${p.icon}</div>
          <div class="text-lg font-bold">${p.name}</div>
          <div class="text-sm text-white/70">${p.description}</div>
          <div class="mt-1 flex gap-1">${pips}</div>
          <div class="text-xs text-white/40">press ${i + 1}</div>
        </button>`;
    })
    .join('');
  const el = overlay(
    container,
    `<div class="text-sm font-bold tracking-[0.3em] text-yellow-300">LEVEL UP</div>
     <div class="text-6xl font-bold">LV ${level}</div>
     <div class="text-white/70">Choose a perk</div>
     <div class="mt-4 flex flex-wrap justify-center gap-4">${cards}</div>`,
  );
  const pick = (id: PerkId) => {
    window.removeEventListener('keydown', onKey);
    el.remove();
    onPick(id);
  };
  const onKey = (e: KeyboardEvent) => {
    const choice = choices[Number(e.key) - 1];
    if (choice) pick(choice.id);
  };
  window.addEventListener('keydown', onKey);
  for (const btn of el.querySelectorAll<HTMLButtonElement>('[data-perk]')) {
    btn.addEventListener('click', () => pick(btn.dataset.perk as PerkId));
  }
}

/** The mode to jump straight into, once, right after "Drift again" / "Fight again". */
export function consumeAutostart(): GameMode | null {
  try {
    const v = sessionStorage.getItem('space-drift:autostart');
    sessionStorage.removeItem('space-drift:autostart');
    // '1' is the old solo value.
    return v === 'arena' ? 'arena' : v === 'solo' || v === '1' ? 'solo' : null;
  } catch {
    return null;
  }
}
