import { ACHIEVEMENTS, achievementKey, type AchievementContext, type AchievementDef } from '../config/achievements';
import type { SaveData } from '../core/SaveData';

/** Slide-in toast in the top-right corner for a freshly unlocked achievement. */
export function showAchievementToast(container: HTMLElement, def: AchievementDef): void {
  const el = document.createElement('div');
  el.className =
    'pointer-events-none fixed right-4 top-24 z-30 flex items-center gap-3 rounded-xl border border-yellow-300/60 bg-space/90 px-4 py-3 shadow-lg transition-all duration-500';
  el.style.transform = 'translateX(120%)';
  el.innerHTML = `
    <div class="text-3xl">${def.icon}</div>
    <div>
      <div class="text-[10px] font-bold tracking-[0.25em] text-yellow-300">ACHIEVEMENT UNLOCKED</div>
      <div class="font-bold">${def.name}</div>
      <div class="text-xs text-white/60">${def.description} · <span class="text-yellow-300">+${def.reward} ●</span></div>
    </div>`;
  // Stack under any toasts already showing.
  const existing = container.querySelectorAll('[data-toast]').length;
  el.dataset.toast = '1';
  el.style.top = `${96 + existing * 84}px`;
  container.appendChild(el);
  requestAnimationFrame(() => (el.style.transform = 'translateX(0)'));
  setTimeout(() => (el.style.transform = 'translateX(120%)'), 3800);
  setTimeout(() => el.remove(), 4400);
}

/** Full list with progress bars. */
export function showAchievements(
  container: HTMLElement,
  save: SaveData,
  ctx: AchievementContext,
  onClose: () => void,
): void {
  const done = ACHIEVEMENTS.filter((a) => save.isUnlocked(achievementKey(a.id))).length;
  const rows = ACHIEVEMENTS.map((a) => {
    const unlocked = save.isUnlocked(achievementKey(a.id));
    const [cur, goal] = a.progress(ctx);
    const frac = unlocked ? 1 : Math.max(0, Math.min(1, cur / goal));
    return `
      <div class="flex items-center gap-3 rounded-xl border ${unlocked ? 'border-yellow-300/50 bg-yellow-300/5' : 'border-white/10 bg-white/5'} p-3">
        <div class="text-3xl ${unlocked ? '' : 'opacity-30 grayscale'}">${a.icon}</div>
        <div class="flex-1">
          <div class="flex justify-between gap-2">
            <span class="font-bold ${unlocked ? 'text-yellow-200' : ''}">${a.name}</span>
            <span class="text-sm text-yellow-300">+${a.reward} ●</span>
          </div>
          <div class="text-xs text-white/60">${a.description}</div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div class="h-full rounded-full ${unlocked ? 'bg-yellow-300' : 'bg-white/40'}" style="width:${frac * 100}%"></div>
          </div>
          ${unlocked || goal <= 1 ? '' : `<div class="mt-0.5 text-[10px] text-white/40">${Math.min(cur, goal)} / ${goal}</div>`}
        </div>
      </div>`;
  }).join('');

  const el = document.createElement('div');
  el.className =
    'pointer-events-auto fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-space/90 px-4 py-8';
  el.innerHTML = `
    <div class="w-full max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-3xl font-bold">Achievements <span class="text-lg text-white/50">${done}/${ACHIEVEMENTS.length}</span></h2>
        <button data-close class="rounded-full bg-white/10 px-4 py-1.5 hover:bg-white/20">Done</button>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">${rows}</div>
    </div>`;
  el.querySelector('[data-close]')?.addEventListener('click', () => {
    el.remove();
    onClose();
  });
  container.appendChild(el);
}
