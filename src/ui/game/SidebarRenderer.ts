import type { ElementType } from '../../types';
import type { GameRenderState } from '../GameRenderer';
import {
  SIDEBAR_W, WAVE_BAR_H,
  ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS,
  MAX_LEVEL, TALENT_POINT_EVERY, MAP_EXPAND_COST,
} from '../../constants';
import { towerRegistry, itemRegistry } from '../../registries';
import type { Rect } from '../RenderUtils';
import { drawButton, roundedRect } from '../RenderUtils';

export class SidebarRenderer {
  private gameUIBtns: Record<string, Rect> = {};
  private towerSelRects: Map<string, Rect> = new Map();

  getGameUIRects()         { return this.gameUIBtns; }
  getTowerSelectionRects() { return this.towerSelRects; }

  render(ctx: CanvasRenderingContext2D, gw: number, gh: number, state: GameRenderState) {
    const g = state.game, p = state.player;
    const sx = gw, sw = SIDEBAR_W;

    ctx.fillStyle = '#0c0c1c'; ctx.fillRect(sx, 0, sw, gh + WAVE_BAR_H);
    ctx.strokeStyle = '#252540'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, gh + WAVE_BAR_H); ctx.stroke();
    ctx.textAlign = 'left';
    let y = 10;

    // Affinity + tier banner
    const aff = p.affinity;
    ctx.fillStyle = ELEMENT_COLORS[aff] + '28';
    roundedRect(ctx, sx + 8, y, sw - 16, 22, 6); ctx.fill();
    ctx.strokeStyle = ELEMENT_COLORS[aff] + '88'; ctx.lineWidth = 1;
    roundedRect(ctx, sx + 8, y, sw - 16, 22, 6); ctx.stroke();
    ctx.fillStyle = ELEMENT_COLORS[aff]; ctx.font = 'bold 10px Segoe UI';
    ctx.fillText(
      `${ELEMENT_ICONS[aff]} Aptidão: ${ELEMENT_NAMES[aff]} (2×)  |  Tier: ${state.game.currentMapTier + 1}`,
      sx + 12, y + 15,
    );
    y += 30;

    // Lives / gold / score
    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 12px Segoe UI';
    ctx.fillText(`❤ ${g.lives}   💰 ${g.gold}   ⭐ ${g.score}`, sx + 10, y + 12);
    y += 26;

    // Level / XP
    ctx.fillStyle = '#7777bb'; ctx.font = '10px Segoe UI';
    ctx.fillText(
      `Nível ${p.level}/${MAX_LEVEL}  | Tal. em: ${TALENT_POINT_EVERY - (p.level % TALENT_POINT_EVERY)}nív`,
      sx + 10, y + 10,
    );
    y += 14;
    const xpN = p.xpToNextLevel(), xpR = xpN === Infinity ? 1 : p.xp / xpN;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(sx + 10, y, sw - 20, 7);
    ctx.fillStyle = '#5555ff'; ctx.fillRect(sx + 10, y, (sw - 20) * xpR, 7);
    ctx.fillStyle = '#5555aa'; ctx.font = '8px Segoe UI';
    ctx.fillText(xpN === Infinity ? 'MAX' : `${p.xp}/${xpN}XP`, sx + 12, y + 6);
    y += 16;

    // Stats
    const st = p.stats;
    const statRows: [string, string, number][] = [
      ['⚔', 'Força', st.strength], ['🔮', 'Intel.', st.intelligence],
      ['🎯', 'Destr.', st.dexterity], ['⚡', 'Agi.', st.agility],
      ['🍀', 'Sorte', st.luck], ['❤', 'Vita.', st.vitality],
    ];
    for (let i = 0; i < statRows.length; i += 2) {
      const [ia, la, va] = statRows[i], [ib, lb, vb] = statRows[i + 1] ?? ['', '', 0];
      ctx.fillStyle = '#6666aa'; ctx.font = '10px Segoe UI';
      ctx.fillText(`${ia}${la}:${va}`, sx + 10, y + 10);
      if (ib) ctx.fillText(`${ib}${lb}:${vb}`, sx + sw / 2 - 4, y + 10);
      y += 13;
    }
    y += 6;

    // Wave info
    const wm = g.waveManager;
    ctx.fillStyle = wm.isBossWave ? '#ff88ff' : '#aa88ff';
    ctx.font = 'bold 11px Segoe UI';
    ctx.fillText(`Onda ${wm.currentWave}${wm.isBossWave ? ' 💀 BOSS' : ''}`, sx + 10, y + 12);
    y += 24;

    const bw = sw - 20;

    // Action buttons (main + auto + speed + expand)
    {
      let label = '', bg = '', fg = '';
      if (state.paused) {
        label = '▶  Continuar'; bg = '#1a2a1a'; fg = '#55cc55';
      } else if (wm.waveActive) {
        label = '⏸  Pausar'; bg = '#1c1c3c'; fg = '#6666aa';
      } else {
        label = '⚡  Próxima Onda'; bg = '#1a2a1a'; fg = '#55cc55';
      }
      const mainRect = { x: sx + 10, y, w: bw, h: 32 };
      drawButton(ctx, mainRect, label, bg, fg);
      this.gameUIBtns['mainAction'] = mainRect; y += 38;

      const indY = y;
      ctx.font = '9px Segoe UI';
      const colW = Math.floor((bw - 8) / 3);

      const autoRect = { x: sx + 10, y: indY, w: colW, h: 22 };
      drawButton(ctx, autoRect,
        state.autoWave ? '🔄 Auto: ON' : '🔄 Auto: OFF',
        state.autoWave ? '#1a2a0a' : '#1c1c1c',
        state.autoWave ? '#88ff44' : '#557755',
      );
      this.gameUIBtns['autoWave'] = autoRect;

      const spdRect = { x: sx + 10 + colW + 4, y: indY, w: colW, h: 22 };
      const spdLabel = state.gameSpeed === 4 ? '⏩ 4x' : state.gameSpeed === 2 ? '⏩ 2x' : '▶ 1x';
      const spdFast = state.gameSpeed > 1;
      drawButton(ctx, spdRect, spdLabel, spdFast ? '#2a1a00' : '#1c1c1c', spdFast ? '#ffaa44' : '#777766');
      this.gameUIBtns['speedToggle'] = spdRect;

      const canExpand = g.currentMapTier < 3 && wm.betweenWaves;
      let discountFrac = 0;
      for (const owned of g.items) {
        const def = itemRegistry.getDef(owned.defId);
        if (def && def.effectType === 'discount') discountFrac += def.effectValue * owned.stacks;
      }
      discountFrac = Math.min(0.6, discountFrac);
      const expCost = Math.round(MAP_EXPAND_COST * (1 - discountFrac));
      const expAfford = g.gold >= expCost;
      const expRect = { x: sx + 10 + 2 * (colW + 4), y: indY, w: bw - 2 * (colW + 4), h: 22 };
      const expLabel = g.currentMapTier >= 3 ? '🗺 Max' : canExpand ? `🗺 ${expCost}g` : '🗺 ---';
      drawButton(ctx, expRect, expLabel,
        canExpand && expAfford ? '#0a1a1a' : '#141414',
        canExpand && expAfford ? '#44cccc' : '#335555',
      );
      this.gameUIBtns['expandMap'] = expRect;
      y += 28;
    }

    // Talent + Bestiary buttons
    const tp = p.talentPoints;
    const talBtn = { x: sx + 10, y, w: bw, h: 28 };
    drawButton(ctx, talBtn, `🌟  Talentos${tp > 0 ? ` (+${tp})` : ''}`, tp > 0 ? '#2a2a00' : '#181820', tp > 0 ? '#dddd44' : '#777788');
    this.gameUIBtns['talentBtn'] = talBtn; y += 34;

    const bstRect = { x: sx + 10, y, w: bw, h: 28 };
    drawButton(ctx, bstRect, '📖  Mostruário', '#0d0d22', '#8888cc');
    this.gameUIBtns['bestiary'] = bstRect; y += 34;

    // Moving tower hint
    if (g.movingTower) {
      ctx.fillStyle = 'rgba(100,200,255,0.15)';
      roundedRect(ctx, sx + 4, y, sw - 8, 22, 6); ctx.fill();
      ctx.fillStyle = '#88ddff'; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('📦 Clique no destino para mover  (ESC=cancelar)', sx + sw / 2, y + 15);
      ctx.textAlign = 'left'; y += 28;
    }

    // Tower selection list
    ctx.fillStyle = '#777799'; ctx.font = 'bold 10px Segoe UI';
    ctx.fillText('── Torres ──', sx + 10, y); y += 12;
    ctx.fillStyle = '#445544'; ctx.font = '8px Segoe UI';
    ctx.fillText(!g.selectedTowerType ? 'Clique em torre para ações' : 'Clique no mapa para colocar', sx + 10, y);
    y += 12;

    this.towerSelRects.clear();
    for (const def of towerRegistry.getAllDefs()) {
      const cost = state.towerCost(def.id);
      const rect = { x: sx + 4, y, w: sw - 8, h: 48 };
      const sel = g.selectedTowerType === def.id, afford = g.gold >= cost;
      ctx.fillStyle = sel ? '#141428' : '#0e0e1e';
      roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6); ctx.fill();
      ctx.strokeStyle = sel ? '#6666ff' : afford ? '#222244' : '#3a2020';
      ctx.lineWidth = sel ? 2 : 1; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6); ctx.stroke();

      const ec = ELEMENT_COLORS[def.element];
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(rect.x + 13, rect.y + 17, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = ec; ctx.font = '9px serif'; ctx.textAlign = 'center';
      ctx.fillText(ELEMENT_ICONS[def.element], rect.x + 13, rect.y + 20);
      ctx.textAlign = 'left';

      ctx.fillStyle = afford ? '#ddddff' : '#887777';
      ctx.font = `${sel ? 'bold ' : ''}11px Segoe UI`;
      ctx.fillText(def.name, rect.x + 26, rect.y + 14);
      ctx.fillStyle = afford ? '#88cc88' : '#aa6666'; ctx.font = '10px Segoe UI';
      ctx.fillText(`💰${cost}g`, rect.x + 26, rect.y + 27);
      ctx.fillStyle = '#445566'; ctx.font = '8px Segoe UI';
      ctx.fillText(this.magicLabel(def.element), rect.x + 26, rect.y + 40);

      this.towerSelRects.set(def.id, rect);
      y += 52;
    }
    ctx.textAlign = 'center';
  }

  private magicLabel(el: ElementType): string {
    return ({ fire: '✨ 3-alvo', water: '✨ -5%vel perm.', earth: '✨ AoE', wind: '✨ empurrão 3t' })[el];
  }
}
