import type { DimensionState } from '../../config/dimensions';
import { PALETTE, type GameConfig } from '../../config/gameConfig';
import type { RunLevels } from '../../core/RunLevels';
import type { RunStats } from '../../core/RunStats';
import type { SaveData } from '../../core/SaveData';
import type { Player } from '../../entities/Player';
import type { WorldSystem } from '../../systems/WorldSystem';
import type { ILayerDrawer, RenderView } from '../IRenderer';

const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Health, score, boss bar, banners and an off-screen boss pointer. */
export class HudDrawer implements ILayerDrawer {
  constructor(
    private readonly player: Player,
    private readonly world: WorldSystem,
    private readonly stats: RunStats,
    private readonly save: SaveData,
    private readonly config: GameConfig,
    private readonly dimension: DimensionState,
    private readonly levels?: RunLevels,
  ) {}

  /** Whether to show the ROUND counter (off in Multiplayer). */
  showRound: () => boolean = () => true;

  /** Current speed in Mach, plus this run's best. Glows hotter past Mach 2 and 3. */
  private drawMach(ctx: CanvasRenderingContext2D): void {
    const v = this.player.body.velocity;
    const mach = Math.hypot(v.x, v.y) / this.config.player.machSpeed;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = mach >= 3 ? '#ff4d6d' : mach >= 2 ? '#fb923c' : 'rgba(255,255,255,0.7)';
    ctx.fillText(`MACH ${mach.toFixed(1)}`, 16, 108);
    ctx.font = `500 11px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`best ${this.stats.topMach.toFixed(1)}`, 82, 109);
  }

  /** "LV n" badge and XP progress bar. */
  private drawLevel(ctx: CanvasRenderingContext2D, barW: number): void {
    if (!this.levels) return;
    const y = 90;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(`LV ${this.levels.level}`, 16, y);
    const x = 56;
    const w = barW - (x - 16);
    this.bar(ctx, x, y + 4, w, 6, this.levels.xp / this.levels.xpNeeded, '#fde047');
  }

  draw({ ctx, width, height, timeMs, camera }: RenderView): void {
    ctx.save();
    ctx.textBaseline = 'top';

    // Player HP
    const hp = this.player.health;
    const barW = Math.min(220, width * 0.4);
    this.bar(ctx, 16, 16, barW, 10, hp.hp / hp.maxHp, hp.hp / hp.maxHp > 0.3 ? PALETTE.good : PALETTE.boss);
    ctx.font = `500 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`HP ${Math.ceil(hp.hp)}`, 16, 32);

    // Stats
    ctx.textAlign = 'right';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.stats.score), width - 16, 14);
    ctx.font = `500 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const secs = Math.floor(this.stats.elapsedMs / 1000);
    ctx.fillText(`${this.stats.kills} kills · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, width - 16, 40);
    ctx.fillText(`${Math.floor(this.stats.farthest / this.config.economy.pxPerLy)} ly from home`, width - 16, 58);

    // Round (below the pause button); hidden in Multiplayer, which shows its own timer there.
    ctx.textAlign = 'center';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    if (this.showRound()) ctx.fillText(`ROUND ${this.stats.round}`, width / 2, 50);
    if (this.showRound() && this.stats.enemiesLeft > 0) {
      ctx.font = `500 13px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`${this.stats.enemiesLeft} enemies left`, width / 2, 70);
    }

    // Coins
    ctx.textAlign = 'left';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(`● ${this.save.coins}`, 16, 52);
    const theme = this.dimension.theme;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = theme.labelColor;
    ctx.fillText(
      `${theme.name.toUpperCase()}${theme.coinMultiplier > 1 ? ` · ×${theme.coinMultiplier} coins` : ''}`,
      16,
      72,
    );
    this.drawLevel(ctx, barW);
    this.drawMach(ctx);

    // Boss HP + pointer
    const boss = this.world.currentBoss;
    if (boss) {
      const bw = Math.min(360, width - 32);
      const y = height - 34;
      ctx.textAlign = 'center';
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = PALETTE.boss;
      ctx.fillText(`BOSS ${boss.level}`, width / 2, y - 18);
      this.bar(ctx, (width - bw) / 2, y, bw, 12, boss.health.hp / boss.health.maxHp, PALETTE.boss);

      const sx = boss.body.position.x - camera.x;
      const sy = boss.body.position.y - camera.y;
      if (sx < 0 || sy < 0 || sx > width || sy > height) this.pointer(ctx, width, height, sx, sy);
    }

    // Banner
    const banner = this.stats.banner;
    if (banner && timeMs < banner.untilMs) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.min(44, width / 12)}px ${FONT}`;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(timeMs / 90);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillText(banner.text, width / 2, height * 0.3);
    }
    ctx.restore();
  }

  private bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string): void {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  /** Arrow on the screen edge pointing at an off-screen point. */
  private pointer(ctx: CanvasRenderingContext2D, width: number, height: number, sx: number, sy: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const pad = 28;
    const t = Math.min(Math.abs((cx - pad) / Math.cos(a)), Math.abs((cy - pad) / Math.sin(a)));
    ctx.save();
    ctx.translate(cx + Math.cos(a) * t, cy + Math.sin(a) * t);
    ctx.rotate(a);
    ctx.fillStyle = PALETTE.boss;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
