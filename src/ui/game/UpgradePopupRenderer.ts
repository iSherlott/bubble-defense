import type { BaseTower as Tower } from '../../entities/BaseTower';
import type { UpgradePopup } from '../../game/Game';
import { CELL_SIZE, ELEMENT_COLORS, ELEMENT_ICONS } from '../../constants';
import { getFusionDef } from '../../constants';
import { GameConfig } from '../../config';
import { towerRegistry } from '../../registries';
import type { Rect } from '../RenderUtils';
import { btn, rr } from '../RenderUtils';

export class UpgradePopupRenderer {
  private upgradeBtns: Record<string, Rect> = {};
  private upgradePopupRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  getUpgradePopupBtns() { return this.upgradeBtns; }
  getUpgradePopupRect() { return this.upgradePopupRect; }

  render(
    ctx: CanvasRenderingContext2D,
    gw: number,
    gh: number,
    popup: UpgradePopup,
    towersAt: (c: number, r: number) => Tower[],
    towerCost: (id: string) => number,
    towerUpgradeCost: (t?: Tower) => number,
    getSynergyBonus: (t: Tower) => number,
    gold: number,
    canFuse = false,
  ) {
    const here = towersAt(popup.col, popup.row);
    const hasSynergy = here.length >= 2;
    const synergyPct = hasSynergy ? Math.round(getSynergyBonus(here[0]) * 100) : 0;
    const pw = 252, towerH = 60, actionH = 26, headerH = hasSynergy ? 48 : 34, add2H = 60, closeH = 28;
    const fusionH = canFuse ? 36 : 0;
    const towerRows = here.reduce((_ , __) => _ + towerH + actionH + 6, 0);
    const ph = headerH + towerRows + (here.length < 2 ? add2H : 0) + fusionH + closeH + 20;

    let px = popup.col * CELL_SIZE + CELL_SIZE + 4;
    let py = popup.row * CELL_SIZE;
    if (px + pw > gw) px = popup.col * CELL_SIZE - pw - 4;
    if (py + ph > gh) py = gh - ph - 4;
    py = Math.max(4, py);
    this.upgradePopupRect = { x: px, y: py, w: pw, h: ph };
    this.upgradeBtns = {};

    ctx.fillStyle = '#111128'; rr(ctx, px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = '#5555aa'; ctx.lineWidth = 1.5; rr(ctx, px, py, pw, ph, 10); ctx.stroke();

    ctx.textAlign = 'left';
    let ry = py + 10;
    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 12px Segoe UI';
    ctx.fillText(`📍 Célula (${popup.col},${popup.row})`, px + 12, ry + 12);
    if (hasSynergy) {
      const synColor = synergyPct >= 30 ? '#ffcc44' : synergyPct >= 20 ? '#aaddff' : synergyPct >= 15 ? '#88cc88' : '#88aaaa';
      ctx.fillStyle = synColor; ctx.font = 'bold 9px Segoe UI';
      ctx.fillText(
        `⚡ Sinergia: +${synergyPct}% dano${here[0].fusionDef ? ' (fusão: dano duplo)' : ''}`,
        px + 12, ry + 26,
      );
    }
    ry += headerH;

    const totalMoveCost = here.reduce((s, t) => s + Math.round(t.placedCost * GameConfig.get().movement.moveCostMult), 0);
    const canMvAll = gold >= totalMoveCost;

    here.forEach((tower, i) => {
      const infoRect = { x: px + 8, y: ry, w: pw - 16, h: towerH - 4 };
      const maxed = tower.isMaxLevel;
      ctx.fillStyle = maxed ? '#1a1500' : '#141420';
      rr(ctx, infoRect.x, infoRect.y, infoRect.w, infoRect.h, 6); ctx.fill();
      ctx.strokeStyle = maxed ? '#aaaa00' : '#333355'; ctx.lineWidth = 1;
      rr(ctx, infoRect.x, infoRect.y, infoRect.w, infoRect.h, 6); ctx.stroke();

      const ec = ELEMENT_COLORS[tower.def.element];
      const lvlBx = infoRect.x + 12, lvlBy = infoRect.y + towerH / 2 - 4;
      ctx.beginPath(); ctx.arc(lvlBx, lvlBy, 9, 0, Math.PI * 2);
      ctx.fillStyle = maxed ? '#ffcc00' : ec; ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText(maxed ? '★' : `${tower.level}`, lvlBx, lvlBy + 3);

      ctx.textAlign = 'left';
      const role = tower.isSecondary
        ? '[2ª]'
        : tower.fusionDef ? `[${tower.fusionDef.icon} ${tower.fusionDef.name}]`
        : '[Base]';
      ctx.fillStyle = tower.fusionDef ? tower.fusionDef.color : '#aaaaee'; ctx.font = 'bold 10px Segoe UI';
      ctx.fillText(`${tower.def.name} ${role}`, infoRect.x + 27, infoRect.y + 15);
      ctx.fillStyle = '#777788'; ctx.font = '8px Segoe UI';
      const dmgUps = tower.upgradeHistory.filter(h => h === 'damage').length;
      const spdUps = tower.upgradeHistory.filter(h => h === 'speed').length;
      ctx.fillText(
        `Dmg×${tower.damageMult.toFixed(1)} Spd×${tower.speedMult.toFixed(1)}${tower.upgradeCount > 0 ? ` ⚔${dmgUps}⚡${spdUps}` : ''}`,
        infoRect.x + 27, infoRect.y + 27,
      );
      if (tower.fusionDef) {
        const pe = tower.fusionDef.primaryElement, se = tower.fusionDef.secondaryElement;
        ctx.fillStyle = '#99aacc'; ctx.font = '7px Segoe UI';
        ctx.fillText(
          `Ataque: 50%${ELEMENT_ICONS[pe]}+50%${ELEMENT_ICONS[se]} | Magia: 60%${ELEMENT_ICONS[pe]}+40%${ELEMENT_ICONS[se]}`,
          infoRect.x + 27, infoRect.y + 39,
        );
      } else {
        const moveLbl = here.length > 1 ? `Mover tudo: ${totalMoveCost}g` : `Mover: ${totalMoveCost}g`;
        ctx.fillText(`Venda: ${Math.floor(tower.goldSpent / 2)}g | ${moveLbl}`, infoRect.x + 27, infoRect.y + 39);
      }
      if (tower.dualMagic) {
        ctx.fillStyle = '#ffff44'; ctx.font = 'bold 7px Segoe UI';
        ctx.fillText('✨DUAL', infoRect.x + pw - 60, infoRect.y + 15);
      }
      ry += towerH;

      const bw3 = (pw - 28) / 3;
      const upRect = { x: px + 8, y: ry, w: bw3, h: actionH };
      const mvRect = { x: px + 12 + bw3, y: ry, w: bw3, h: actionH };
      const slRect = { x: px + 16 + bw3 * 2, y: ry, w: bw3, h: actionH };

      const upgCost = towerUpgradeCost(tower);
      const canUp = !maxed && gold >= upgCost;
      btn(ctx, upRect, maxed ? '★ Máx' : `⬆ ${upgCost}g`, canUp ? '#0d1f0d' : '#1a1a1a', canUp ? '#55bb55' : '#445544');
      const mvLabel = here.length > 1 ? `📦 ${totalMoveCost}g*` : `📦 ${totalMoveCost}g`;
      btn(ctx, mvRect, mvLabel, canMvAll ? '#0d1522' : '#1a1a1a', canMvAll ? '#4499cc' : '#335577');
      btn(ctx, slRect, `🏷 ${Math.floor(tower.goldSpent / 2)}g`, '#220f0f', '#cc5533');

      this.upgradeBtns[`upgrade_${i}`] = upRect;
      this.upgradeBtns[`move_${i}`] = mvRect;
      this.upgradeBtns[`sell_${i}`] = slRect;
      ry += actionH + 6;
    });

    if (here.length < 2) {
      ctx.fillStyle = '#888899'; ctx.font = 'bold 9px Segoe UI';
      ctx.fillText('➕ Adicionar 2ª Torre:', px + 10, ry + 12);
      ry += 16;
      const bw2 = (pw - 20) / 2, bh2 = 20;
      towerRegistry.getAllDefs().forEach((def, idx) => {
        const cost = towerCost(def.id) * 2;
        const af = gold >= cost;
        const bx = px + 8 + (idx % 2) * (bw2 + 4), by = ry + Math.floor(idx / 2) * (bh2 + 4);
        const r2 = { x: bx, y: by, w: bw2, h: bh2 };
        ctx.fillStyle = af ? '#12122a' : '#0e0e1e'; rr(ctx, r2.x, r2.y, r2.w, r2.h, 5); ctx.fill();
        ctx.strokeStyle = af ? ELEMENT_COLORS[def.element] + '88' : '#333344'; ctx.lineWidth = 1;
        rr(ctx, r2.x, r2.y, r2.w, r2.h, 5); ctx.stroke();
        ctx.fillStyle = af ? ELEMENT_COLORS[def.element] : '#554444'; ctx.font = '9px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(`${ELEMENT_ICONS[def.element]} ${def.name} (${cost}g)`, r2.x + bw2 / 2, r2.y + 14);
        ctx.textAlign = 'left';
        this.upgradeBtns[`addSecond_${def.id}`] = r2;
      });
      ry += bh2 * 2 + 8 + 4;
    }

    if (canFuse) {
      const primary = here.find(t => !t.isSecondary);
      const secondary = here.find(t => t.isSecondary);
      if (primary && secondary) {
        const fusion = getFusionDef(primary.def.element, secondary.def.element);
        if (fusion) {
          const fusRect = { x: px + 8, y: ry, w: pw - 16, h: 30 };
          ctx.shadowColor = fusion.color; ctx.shadowBlur = 12;
          ctx.fillStyle = '#1a0a2a'; rr(ctx, fusRect.x, fusRect.y, fusRect.w, fusRect.h, 8); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = fusion.color; ctx.lineWidth = 2;
          rr(ctx, fusRect.x, fusRect.y, fusRect.w, fusRect.h, 8); ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = fusion.color; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
          ctx.fillText(`${fusion.icon} FUSÃO: ${fusion.name}`, fusRect.x + fusRect.w / 2, fusRect.y + 14);
          ctx.fillStyle = '#ccccee'; ctx.font = '8px Segoe UI';
          ctx.fillText(fusion.description, fusRect.x + fusRect.w / 2, fusRect.y + 25);
          ctx.textAlign = 'left';
          this.upgradeBtns['fusion'] = fusRect;
          ry += 36;
        }
      }
    }

    const closeRect = { x: px + 8, y: ry + 4, w: pw - 16, h: closeH - 6 };
    btn(ctx, closeRect, '✕ Fechar', '#220000', '#aa4444');
    this.upgradeBtns['close'] = closeRect;
    ctx.textAlign = 'center';
  }
}
