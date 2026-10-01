import type { ArenaSystem } from '../../systems/ArenaSystem';
import { ARENA } from '../../systems/ArenaSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Multiplayer (Bots) HUD: match timer, live scoreboard and kill feed. */
export class ArenaHudDrawer implements ILayerDrawer {
  constructor(private readonly arena: ArenaSystem) {}

  draw({ ctx, width, timeMs }: RenderView): void {
    if (!this.arena.active) return;
    ctx.save();

    // Timer (where ROUND normally sits).
    const s = Math.ceil(this.arena.timeLeftMs / 1000);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = s <= 15 ? '#ff4d6d' : '#ffffff';
    ctx.fillText(`⚔️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, width / 2, 48);
    ctx.font = `500 11px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`first to ${ARENA.koTarget} KOs`, width / 2, 70);

    // Scoreboard.
    const rows = this.arena.standings();
    const w = 190;
    const x = width - w - 16;
    const y = 82;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y, w, 22 + rows.length * 18);
    ctx.textAlign = 'left';
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('PILOT', x + 8, y + 6);
    ctx.textAlign = 'right';
    ctx.fillText('KO / DEATHS', x + w - 8, y + 6);
    rows.forEach((r, i) => {
      const ry = y + 22 + i * 18;
      if (r.isPlayer) {
        ctx.fillStyle = 'rgba(94, 231, 255, 0.15)';
        ctx.fillRect(x, ry - 2, w, 18);
      }
      ctx.textAlign = 'left';
      ctx.font = `${r.isPlayer ? 700 : 500} 12px ${FONT}`;
      ctx.fillStyle = r.color;
      ctx.fillText(`${i + 1}. ${r.name}`, x + 8, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${r.kos} / ${r.deaths}`, x + w - 8, ry);
    });

    // Kill feed.
    ctx.textAlign = 'right';
    ctx.font = `600 12px ${FONT}`;
    let fy = y + 30 + rows.length * 18;
    for (const f of this.arena.feed) {
      const age = timeMs - f.atMs;
      if (age > 5000) continue;
      ctx.globalAlpha = Math.min(1, (5000 - age) / 800);
      ctx.fillStyle = f.text.includes('You') ? '#fde047' : 'rgba(255,255,255,0.85)';
      ctx.fillText(f.text, width - 16, fy);
      fy += 16;
    }
    ctx.restore();
  }
}
