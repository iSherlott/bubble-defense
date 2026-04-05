import type { WaveManager } from '../../systems/WaveManager';
import { SIDEBAR_W, WAVE_BAR_H } from '../../constants';
import { enemyRegistry } from '../../registries';

export type BossBarState = { active: false } | { active: true; hp: number; maxHp: number; ratio: number };

export class WaveBarRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    gw: number,
    gh: number,
    wm: WaveManager,
    bossBar: BossBarState,
  ) {
    const barY = gh;
    const barW = gw;

    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, barY, barW + SIDEBAR_W, WAVE_BAR_H);
    ctx.strokeStyle = '#252540'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(barW + SIDEBAR_W, barY); ctx.stroke();

    if (wm.waveActive) {
      if (wm.isBossWave) {
        const pct = bossBar.active ? bossBar.ratio : wm.waveProgress;
        ctx.fillStyle = '#1a0a14'; ctx.fillRect(8, barY + 6, barW - 16, WAVE_BAR_H - 12);
        const grad = ctx.createLinearGradient(8, 0, barW - 8, 0);
        grad.addColorStop(0, '#cc0044'); grad.addColorStop(1, '#ff4488');
        ctx.fillStyle = grad;
        ctx.fillRect(8, barY + 6, (barW - 16) * pct, WAVE_BAR_H - 12);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        const hpText = bossBar.active ? `${Math.round(bossBar.hp)} / ${bossBar.maxHp}` : 'Derrotado!';
        ctx.fillText(`💀 BOSS — ${hpText}  (${Math.round(pct * 100)}%)`, barW / 2, barY + WAVE_BAR_H / 2 + 4);
      } else {
        const pct = wm.waveProgress;
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(8, barY + 6, barW - 16, WAVE_BAR_H - 12);
        const grad = ctx.createLinearGradient(8, 0, barW - 8, 0);
        grad.addColorStop(0, '#2255ff'); grad.addColorStop(1, '#44aaff');
        ctx.fillStyle = grad;
        ctx.fillRect(8, barY + 6, (barW - 16) * pct, WAVE_BAR_H - 12);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText(
          `Onda ${wm.currentWave} — ${wm.enemiesKilledThisWave}/${wm.totalEnemiesThisWave} eliminados`,
          barW / 2, barY + WAVE_BAR_H / 2 + 4,
        );
      }
    } else {
      ctx.fillStyle = '#1a1a28'; ctx.fillRect(8, barY + 6, barW - 16, WAVE_BAR_H - 12);
      ctx.textAlign = 'center';
      if (wm.currentWave === 0) {
        ctx.fillStyle = '#888899'; ctx.font = '11px Segoe UI';
        ctx.fillText('Pronto para começar — clique em "Próxima Onda"', barW / 2, barY + WAVE_BAR_H / 2 + 4);
      } else {
        const preview = wm.getNextWavePreview();
        const names = preview.types.map(id => {
          const d = enemyRegistry.getDef(id);
          return d ? d.name : id;
        });
        let txt = `Próxima: Onda ${wm.currentWave + 1}  ▸  `;
        if (preview.isBoss) txt += `💀 BOSS: ${names[0]}`;
        else {
          txt += names.join(', ');
          txt += ` (${preview.enemyCount})`;
          if (preview.eliteCount > 0) txt += `  ⭐${preview.eliteCount} elites`;
        }
        ctx.fillStyle = '#aabb99'; ctx.font = '11px Segoe UI';
        ctx.fillText(txt, barW / 2, barY + WAVE_BAR_H / 2 + 4);
      }
    }
  }
}
