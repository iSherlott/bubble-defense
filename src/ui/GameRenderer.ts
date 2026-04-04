import type { Vec2, ElementType, OwnedItem, ItemDropAnim, ItemDef } from '../types';
import type { BaseTower as Tower } from '../entities/BaseTower';
import type { BaseEnemy as Enemy } from '../entities/BaseEnemy';
import type { Player } from '../player/Player';
import type { WaveManager } from '../game/WaveManager';
import type { UpgradePopup } from '../game/Game';
import type { MapData } from '../game/MapGenerator';
import { CELL_SIZE, SIDEBAR_W, WAVE_BAR_H,
  ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS,
  MAX_LEVEL, TALENT_POINT_EVERY, MAP_EXPAND_COST,
  ITEM_RARITY_COLORS,
  ITEM_RARITY_NAMES } from '../constants';
import { GameConfig } from '../config';
import { towerRegistry, enemyRegistry, itemRegistry, fusionRegistry } from '../registries';
import type { Rect } from './RenderUtils';
import { btn, rr, wrapText } from './RenderUtils';
import type { EntityRenderer } from './EntityRenderer';

interface AoeFlash { x: number; y: number; r: number; life: number; }

export interface GameRenderState {
  screen: string;
  paused: boolean;
  autoWave: boolean;
  game: {
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Array<{ x: number; y: number; color: string; isMagic?: boolean; isCrit?: boolean; components?: Array<{ element: ElementType }>; }>;
    floatingTexts: Array<{ x: number; y: number; text: string; color: string; life: number; maxLife: number }>;
    puddles: Array<{ x: number; y: number; radius: number; remaining: number }>;
    gold: number; lives: number; score: number;
    selectedTowerType: string;
    hoveredCell: Vec2 | null;
    waveManager: WaveManager;
    upgradePopup: UpgradePopup | null;
    movingTower: Tower | null;
    currentMapTier: number;
    items: OwnedItem[];
    itemDropAnim: ItemDropAnim | null;
    canFuse: boolean;
  };
  player: Player;
  towersAt: (c: number, r: number) => Tower[];
  towerCost: (id: string) => number;
  towerUpgradeCost: (t?: Tower) => number;
  getSynergyBonus: (t: Tower) => number;
  gameSpeed: 1 | 2;
  debugMode: boolean;
  mousePos: Vec2;
}

export class GameRenderer {
  private gameUIBtns: Record<string, Rect> = {};
  private towerSelRects: Map<string, Rect> = new Map();
  private upgradeBtns: Record<string, Rect> = {};
  private upgradePopupRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private debugBtns: Record<string, Rect> = {};
  aoeFlashes: AoeFlash[] = [];

  constructor(private entityRenderer: EntityRenderer) {}

  getGameUIRects() { return this.gameUIBtns; }
  getTowerSelectionRects() { return this.towerSelRects; }
  getUpgradePopupBtns() { return this.upgradeBtns; }
  getUpgradePopupRect() { return this.upgradePopupRect; }
  getDebugBtns() { return this.debugBtns; }

  triggerAoe(x: number, y: number, r: number) { this.aoeFlashes.push({ x, y, r, life: 0.35 }); }

  renderGame(ctx: CanvasRenderingContext2D, map: MapData, gw: number, gh: number, state: GameRenderState) {
    const g = state.game;
    const { waypoints, pathCells, cols, rows } = map;

    // Grid bg
    ctx.fillStyle = '#111118'; ctx.fillRect(0, 0, gw, gh);
    ctx.strokeStyle = '#1a1a28'; ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, gh); ctx.stroke(); }
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(gw, r * CELL_SIZE); ctx.stroke(); }

    // Path cells
    ctx.fillStyle = '#1f1a0f';
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++)
      if (pathCells.has(`${c},${r}`)) ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Path line
    ctx.strokeStyle = '#554422'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    waypoints.forEach((wp, i) => i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y));
    ctx.stroke();
    // Arrows
    ctx.fillStyle = '#776644';
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1], b = waypoints[i];
      const ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Puddles
    for (const p of g.puddles) {
      const a = Math.min(1, p.remaining / 2) * 0.4;
      ctx.fillStyle = `rgba(40,120,255,${a})`;
      ctx.strokeStyle = `rgba(80,180,255,${a + 0.2})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // AoE flashes
    for (const f of this.aoeFlashes) {
      const a = (f.life / 0.35) * 0.4;
      ctx.fillStyle = `rgba(150,220,80,${a})`; ctx.strokeStyle = `rgba(180,255,100,${a + 0.2})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Hover
    if (g.hoveredCell && g.hoveredCell.x < cols && g.hoveredCell.y < rows) {
      const hc = g.hoveredCell;
      const isMoving = !!g.movingTower;
      const blocked = pathCells.has(`${hc.x},${hc.y}`) || (!isMoving && state.towersAt(hc.x, hc.y).length >= 2);
      ctx.fillStyle = isMoving ? 'rgba(100,200,255,0.12)' : blocked ? 'rgba(255,50,50,0.10)' : 'rgba(100,255,100,0.10)';
      ctx.strokeStyle = isMoving ? 'rgba(100,200,255,0.6)' : blocked ? 'rgba(255,50,50,0.5)' : 'rgba(100,255,100,0.5)';
      ctx.lineWidth = 1; ctx.fillRect(hc.x * CELL_SIZE, hc.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeRect(hc.x * CELL_SIZE, hc.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      if (isMoving && g.movingTower) {
        ctx.globalAlpha = 0.4; this.entityRenderer.drawTower(ctx, g.movingTower); ctx.globalAlpha = 1;
      } else if (!blocked && g.selectedTowerType) {
        const def = towerRegistry.has(g.selectedTowerType) ? towerRegistry.getDef(g.selectedTowerType) : null;
        if (def) {
          ctx.beginPath(); ctx.arc(hc.x * CELL_SIZE + CELL_SIZE / 2, hc.y * CELL_SIZE + CELL_SIZE / 2, def.baseRange, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    // Towers
    for (const t of g.towers) this.entityRenderer.drawTower(ctx, t);

    // Hovered tower range
    if (g.hoveredCell) {
      for (const t of state.towersAt(g.hoveredCell.x, g.hoveredCell.y)) {
        ctx.beginPath(); ctx.arc(t.pixelX, t.pixelY, t.def.baseRange, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // Projectiles
    for (const proj of g.projectiles) {
      const r = proj.isMagic ? 7 : proj.isCrit ? 6 : 4;
      ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color; ctx.shadowBlur = proj.isMagic ? 16 : proj.isCrit ? 10 : 5;
      ctx.fill(); ctx.shadowBlur = 0;
      if (proj.isMagic) {
        ctx.beginPath(); ctx.arc(proj.x, proj.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = proj.color + '66'; ctx.lineWidth = 2; ctx.stroke();
      }
      if (proj.components && proj.components.length > 1) {
        const secColor = ELEMENT_COLORS[proj.components[1].element];
        ctx.beginPath(); ctx.arc(proj.x, proj.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = secColor + 'aa'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // Enemies
    for (const e of g.enemies) this.entityRenderer.drawEnemy(ctx, e);

    // Floating texts
    for (const ft of g.floatingTexts) {
      ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.fillStyle = ft.color;
      ctx.font = ft.text.includes('CRÍTICO') ? 'bold 13px Segoe UI' : 'bold 11px Segoe UI';
      ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Sidebar
    this.renderSidebar(ctx, gw, gh, state);

    // Items HUD (top of game area)
    this.renderItemsHUD(ctx, gw, g.items, state.mousePos);

    // Wave progress bar (bottom strip)
    this.renderWaveBar(ctx, gw, gh, g.waveManager, g.enemies);

    // Upgrade popup
    if (g.upgradePopup)
      this.renderUpgradePopup(ctx, gw, gh, g.upgradePopup, state.towersAt, state.towerCost, state.towerUpgradeCost, state.getSynergyBonus, g.gold, g.canFuse);

    // Item drop animation
    if (g.itemDropAnim) this.renderItemDropAnim(ctx, gw, gh, g.itemDropAnim);

    // Pause overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, gw, gh);
      ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 44px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('⏸  PAUSADO', gw / 2, gh / 2);
      ctx.font = '17px Segoe UI'; ctx.fillStyle = '#7777aa';
      ctx.fillText('P ou ESC para continuar', gw / 2, gh / 2 + 44);
    }

    // Debug overlay
    if (state.debugMode) this.renderDebugPanel(ctx);
  }

  private renderWaveBar(ctx: CanvasRenderingContext2D, gw: number, gh: number, wm: WaveManager, enemies: Enemy[]) {
    const barY = gh;
    const barW = gw;

    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, barY, barW + SIDEBAR_W, WAVE_BAR_H);
    ctx.strokeStyle = '#252540'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(barW + SIDEBAR_W, barY); ctx.stroke();

    if (wm.waveActive) {
      if (wm.isBossWave) {
        const boss = enemies.find(e => e.def.isBoss && !e.dead);
        const pct = boss ? boss.hp / boss.maxHp : (wm.waveProgress);
        ctx.fillStyle = '#1a0a14'; ctx.fillRect(8, barY + 6, barW - 16, WAVE_BAR_H - 12);
        const grad = ctx.createLinearGradient(8, 0, barW - 8, 0);
        grad.addColorStop(0, '#cc0044'); grad.addColorStop(1, '#ff4488');
        ctx.fillStyle = grad;
        ctx.fillRect(8, barY + 6, (barW - 16) * pct, WAVE_BAR_H - 12);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        const hpText = boss ? `${Math.round(boss.hp)} / ${boss.maxHp}` : 'Derrotado!';
        ctx.fillText(`💀 BOSS — ${hpText}  (${Math.round(pct * 100)}%)`, barW / 2, barY + WAVE_BAR_H / 2 + 4);
      } else {
        const pct = wm.waveProgress;
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(8, barY + 6, barW - 16, WAVE_BAR_H - 12);
        const grad = ctx.createLinearGradient(8, 0, barW - 8, 0);
        grad.addColorStop(0, '#2255ff'); grad.addColorStop(1, '#44aaff');
        ctx.fillStyle = grad;
        ctx.fillRect(8, barY + 6, (barW - 16) * pct, WAVE_BAR_H - 12);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText(`Onda ${wm.currentWave} — ${wm.enemiesKilledThisWave}/${wm.totalEnemiesThisWave} eliminados`, barW / 2, barY + WAVE_BAR_H / 2 + 4);
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

  private renderItemsHUD(ctx: CanvasRenderingContext2D, gw: number, items: OwnedItem[], mouse: Vec2) {
    if (items.length === 0) return;
    const padding = 4, iconSize = 28, gap = 3;
    const totalW = items.length * (iconSize + gap) - gap + padding * 2;
    const hx = gw / 2 - totalW / 2, hy = 2;

    ctx.fillStyle = 'rgba(10,10,30,0.75)';
    rr(ctx, hx, hy, totalW, iconSize + padding * 2, 6); ctx.fill();
    ctx.strokeStyle = '#333366'; ctx.lineWidth = 1;
    rr(ctx, hx, hy, totalW, iconSize + padding * 2, 6); ctx.stroke();

    let ix = hx + padding;
    let hoveredDef: ItemDef | null = null;
    let hoveredX = 0, hoveredStacks = 1;

    for (const owned of items) {
      const def = itemRegistry.getDef(owned.defId);
      if (!def) continue;
      const rc = ITEM_RARITY_COLORS[def.rarity];
      const itemRect = { x: ix, y: hy + padding, w: iconSize, h: iconSize };

      const hovered = mouse.x >= itemRect.x && mouse.x <= itemRect.x + itemRect.w &&
        mouse.y >= itemRect.y && mouse.y <= itemRect.y + itemRect.h;
      if (hovered) { hoveredDef = def; hoveredX = ix + iconSize / 2; hoveredStacks = owned.stacks; }

      ctx.fillStyle = def.rarity === 'legendary' ? '#2a2000' : def.rarity === 'epic' ? '#1a0030' : def.rarity === 'rare' ? '#0a1530' : '#141422';
      rr(ctx, ix, hy + padding, iconSize, iconSize, 4); ctx.fill();
      ctx.strokeStyle = hovered ? (rc) : (rc + 'aa'); ctx.lineWidth = hovered ? 2 : 1;
      rr(ctx, ix, hy + padding, iconSize, iconSize, 4); ctx.stroke();

      ctx.font = '16px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(def.icon, ix + iconSize / 2, hy + padding + iconSize / 2 + 6);

      if (owned.stacks > 1) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Segoe UI';
        ctx.textAlign = 'right';
        ctx.fillText(`×${owned.stacks}`, ix + iconSize - 1, hy + padding + iconSize - 1);
      }
      ctx.textAlign = 'left';
      ix += iconSize + gap;
    }

    if (hoveredDef) {
      const rc = ITEM_RARITY_COLORS[hoveredDef.rarity];
      const rarityName = ITEM_RARITY_NAMES[hoveredDef.rarity];
      const lines = wrapText(hoveredDef.description, 30);
      const tw = Math.max(180, hoveredDef.name.length * 8 + 20);
      const th = 20 + 14 * (lines.length + 1) + 8;
      let tx = Math.max(4, Math.min(hoveredX - tw / 2, gw - tw - 4));
      const ty = hy + padding + iconSize + 4;

      ctx.fillStyle = 'rgba(8,8,24,0.95)';
      rr(ctx, tx, ty, tw, th, 8); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 1.5;
      rr(ctx, tx, ty, tw, th, 8); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = rc; ctx.font = `bold 10px Segoe UI`;
      ctx.fillText(`${hoveredDef.name}${hoveredStacks > 1 ? ` ×${hoveredStacks}` : ''}`, tx + tw / 2, ty + 14);
      ctx.fillStyle = '#aaaacc'; ctx.font = '9px Segoe UI';
      ctx.fillText(`[${rarityName}]`, tx + tw / 2, ty + 24);
      lines.forEach((l, li) => {
        ctx.fillStyle = '#ddddee';
        ctx.fillText(l, tx + tw / 2, ty + 36 + li * 13);
      });
      ctx.textAlign = 'left';
    }
  }

  renderItemDropAnim(ctx: CanvasRenderingContext2D, gw: number, gh: number, anim: ItemDropAnim) {
    const cx = gw / 2, cy = gh / 2;
    const t = anim.timer;
    const item = anim.item;
    const rc = ITEM_RARITY_COLORS[item.rarity];

    ctx.save();

    if (anim.phase === 'rising') {
      const p = Math.min(1, t / 0.6);
      const scale = p * 1.2;
      const alpha = p;
      ctx.globalAlpha = alpha;

      ctx.shadowColor = rc; ctx.shadowBlur = 30 + p * 20;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      rr(ctx, cx - 100, cy - 60, 200, 120, 16); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      rr(ctx, cx - 100, cy - 60, 200, 120, 16); ctx.stroke();

      ctx.font = `${Math.round(40 * scale)}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.icon, cx, cy + 5 * scale);

    } else if (anim.phase === 'showing') {
      ctx.globalAlpha = 1;
      const sparkle = 0.7 + 0.3 * Math.sin(t * 8);

      ctx.shadowColor = rc; ctx.shadowBlur = 25 * sparkle;
      ctx.fillStyle = 'rgba(8,8,25,0.92)';
      rr(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      rr(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.stroke();

      ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(), cx, cy - 60);

      ctx.font = '44px serif';
      ctx.fillText(item.icon, cx, cy + 4);

      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Segoe UI';
      ctx.fillText(item.name, cx, cy + 36);

      ctx.fillStyle = '#aaaacc'; ctx.font = '10px Segoe UI';
      ctx.fillText(item.description, cx, cy + 54);

      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * Math.PI * 2 + t * 2;
        const dist = 50 + 15 * Math.sin(t * 4 + i);
        const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
        ctx.fillStyle = `rgba(255,255,200,${sparkle * 0.6})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2 + sparkle, 0, Math.PI * 2); ctx.fill();
      }

    } else {
      const fadeStart = 2.0;
      const p = Math.max(0, 1 - (t - fadeStart) / 0.5);
      ctx.globalAlpha = p;

      ctx.fillStyle = 'rgba(8,8,25,0.92)';
      rr(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      rr(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.stroke();

      ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(), cx, cy - 60);
      ctx.font = '44px serif'; ctx.fillText(item.icon, cx, cy + 4);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Segoe UI';
      ctx.fillText(item.name, cx, cy + 36);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderSidebar(ctx: CanvasRenderingContext2D, gw: number, gh: number, state: GameRenderState) {
    const g = state.game, p = state.player;
    const sx = gw, sw = SIDEBAR_W;

    ctx.fillStyle = '#0c0c1c'; ctx.fillRect(sx, 0, sw, gh + WAVE_BAR_H);
    ctx.strokeStyle = '#252540'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, gh + WAVE_BAR_H); ctx.stroke();
    ctx.textAlign = 'left';
    let y = 10;

    const aff = p.affinity;
    ctx.fillStyle = ELEMENT_COLORS[aff] + '28';
    rr(ctx, sx + 8, y, sw - 16, 22, 6); ctx.fill();
    ctx.strokeStyle = ELEMENT_COLORS[aff] + '88'; ctx.lineWidth = 1;
    rr(ctx, sx + 8, y, sw - 16, 22, 6); ctx.stroke();
    ctx.fillStyle = ELEMENT_COLORS[aff]; ctx.font = 'bold 10px Segoe UI';
    // tier info rendered inline
    ctx.fillText(`${ELEMENT_ICONS[aff]} Aptidão: ${ELEMENT_NAMES[aff]} (2×)  |  Tier: ${state.game.currentMapTier + 1}`, sx + 12, y + 15);
    y += 30;

    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 12px Segoe UI';
    ctx.fillText(`❤ ${g.lives}   💰 ${g.gold}   ⭐ ${g.score}`, sx + 10, y + 12);
    y += 26;

    ctx.fillStyle = '#7777bb'; ctx.font = '10px Segoe UI';
    ctx.fillText(`Nível ${p.level}/${MAX_LEVEL}  | Tal. em: ${TALENT_POINT_EVERY - (p.level % TALENT_POINT_EVERY)}nív`, sx + 10, y + 10);
    y += 14;
    const xpN = p.xpToNextLevel(), xpR = xpN === Infinity ? 1 : p.xp / xpN;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(sx + 10, y, sw - 20, 7);
    ctx.fillStyle = '#5555ff'; ctx.fillRect(sx + 10, y, (sw - 20) * xpR, 7);
    ctx.fillStyle = '#5555aa'; ctx.font = '8px Segoe UI';
    ctx.fillText(xpN === Infinity ? 'MAX' : `${p.xp}/${xpN}XP`, sx + 12, y + 6);
    y += 16;

    const st = p.stats;
    const rows: [string, string, number][] = [
      ['⚔', 'Força', st.strength], ['🔮', 'Intel.', st.intelligence],
      ['🎯', 'Destr.', st.dexterity], ['⚡', 'Agi.', st.agility],
      ['🍀', 'Sorte', st.luck], ['❤', 'Vita.', st.vitality],
    ];
    for (let i = 0; i < rows.length; i += 2) {
      const [ia, la, va] = rows[i], [ib, lb, vb] = rows[i + 1] ?? ['', '', 0];
      ctx.fillStyle = '#6666aa'; ctx.font = '10px Segoe UI';
      ctx.fillText(`${ia}${la}:${va}`, sx + 10, y + 10);
      if (ib) ctx.fillText(`${ib}${lb}:${vb}`, sx + sw / 2 - 4, y + 10);
      y += 13;
    }
    y += 6;

    const wm = g.waveManager;
    ctx.fillStyle = wm.isBossWave ? '#ff88ff' : '#aa88ff';
    ctx.font = 'bold 11px Segoe UI';
    ctx.fillText(`Onda ${wm.currentWave}${wm.isBossWave ? ' 💀 BOSS' : ''}`, sx + 10, y + 12);
    y += 24;

    const bw = sw - 20;

    {
      let label = ''; let bg = ''; let fg = '';
      if (state.paused) {
        label = '▶  Continuar'; bg = '#1a2a1a'; fg = '#55cc55';
      } else if (wm.waveActive) {
        label = '⏸  Pausar'; bg = '#1c1c3c'; fg = '#6666aa';
      } else {
        label = '⚡  Próxima Onda'; bg = '#1a2a1a'; fg = '#55cc55';
      }
      const mainRect = { x: sx + 10, y, w: bw, h: 32 };
      btn(ctx, mainRect, label, bg, fg);
      this.gameUIBtns['mainAction'] = mainRect; y += 38;

      const indY = y;
      ctx.font = '9px Segoe UI';

      const colW = Math.floor((bw - 8) / 3);

      const autoRect = { x: sx + 10, y: indY, w: colW, h: 22 };
      btn(ctx, autoRect,
        state.autoWave ? '🔄 Auto: ON' : '🔄 Auto: OFF',
        state.autoWave ? '#1a2a0a' : '#1c1c1c',
        state.autoWave ? '#88ff44' : '#557755');
      this.gameUIBtns['autoWave'] = autoRect;

      const spdRect = { x: sx + 10 + colW + 4, y: indY, w: colW, h: 22 };
      const fast = state.gameSpeed === 2;
      btn(ctx, spdRect, fast ? '⏩ 2x' : '▶ 1x',
        fast ? '#2a1a00' : '#1c1c1c',
        fast ? '#ffaa44' : '#777766');
      this.gameUIBtns['speedToggle'] = spdRect;

      const canExpand = g.currentMapTier < GameConfig.get().map.tiers.length - 1 && wm.betweenWaves;
      let discountFrac = 0;
      for (const owned of g.items) { const def = itemRegistry.getDef(owned.defId); if (def && def.effectType === 'discount') discountFrac += def.effectValue * owned.stacks; }
      discountFrac = Math.min(0.6, discountFrac);
      const expCost = Math.round(MAP_EXPAND_COST * (1 - discountFrac));
      const expAfford = g.gold >= expCost;
      const expRect = { x: sx + 10 + 2 * (colW + 4), y: indY, w: bw - 2 * (colW + 4), h: 22 };
      const expLabel = g.currentMapTier >= GameConfig.get().map.tiers.length - 1 ? '🗺 Max' : canExpand ? `🗺 ${expCost}g` : '🗺 ---';
      btn(ctx, expRect, expLabel,
        canExpand && expAfford ? '#0a1a1a' : '#141414',
        canExpand && expAfford ? '#44cccc' : '#335555');
      this.gameUIBtns['expandMap'] = expRect;
      y += 28;
    }

    const tp = p.talentPoints;
    const talBtn = { x: sx + 10, y, w: bw, h: 28 };
    btn(ctx, talBtn, `🌟  Talentos${tp > 0 ? ` (+${tp})` : ''}`, tp > 0 ? '#2a2a00' : '#181820', tp > 0 ? '#dddd44' : '#777788');
    this.gameUIBtns['talentBtn'] = talBtn; y += 34;

    const bstRect = { x: sx + 10, y, w: bw, h: 28 };
    btn(ctx, bstRect, '📖  Mostruário', '#0d0d22', '#8888cc');
    this.gameUIBtns['bestiary'] = bstRect; y += 34;

    if (g.movingTower) {
      ctx.fillStyle = 'rgba(100,200,255,0.15)';
      rr(ctx, sx + 4, y, sw - 8, 22, 6); ctx.fill();
      ctx.fillStyle = '#88ddff'; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('📦 Clique no destino para mover  (ESC=cancelar)', sx + sw / 2, y + 15);
      ctx.textAlign = 'left'; y += 28;
    }

    ctx.fillStyle = '#777799'; ctx.font = 'bold 10px Segoe UI';
    ctx.fillText('── Torres ──', sx + 10, y); y += 12;
    ctx.fillStyle = '#445544'; ctx.font = '8px Segoe UI';
    const noSel = !g.selectedTowerType;
    ctx.fillText(noSel ? 'Clique em torre para ações' : 'Clique no mapa para colocar', sx + 10, y); y += 12;

    this.towerSelRects.clear();
    for (const def of towerRegistry.getAllDefs()) {
      const cost = state.towerCost(def.id);
      const rect = { x: sx + 4, y, w: sw - 8, h: 48 };
      const sel = g.selectedTowerType === def.id, afford = g.gold >= cost;
      ctx.fillStyle = sel ? '#141428' : '#0e0e1e';
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 6); ctx.fill();
      ctx.strokeStyle = sel ? '#6666ff' : afford ? '#222244' : '#3a2020';
      ctx.lineWidth = sel ? 2 : 1; rr(ctx, rect.x, rect.y, rect.w, rect.h, 6); ctx.stroke();

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

  private renderUpgradePopup(
    ctx: CanvasRenderingContext2D,
    gw: number, gh: number,
    popup: UpgradePopup,
    towersAt: (c: number, r: number) => Tower[],
    towerCost: (id: string) => number,
    towerUpgradeCost: (t?: Tower) => number,
    getSynergyBonus: (t: Tower) => number,
    gold: number,
    canFuse: boolean = false,
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
      ctx.fillText(`⚡ Sinergia: +${synergyPct}% dano${here[0].fusionDef ? ' (fusão: dano duplo)' : ''}`, px + 12, ry + 26);
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
      const role = tower.isSecondary ? '[2ª]' : tower.fusionDef ? `[${tower.fusionDef.icon} ${tower.fusionDef.name}]` : '[Base]';
      ctx.fillStyle = tower.fusionDef ? tower.fusionDef.color : '#aaaaee'; ctx.font = 'bold 10px Segoe UI';
      ctx.fillText(`${tower.def.name} ${role}`, infoRect.x + 27, infoRect.y + 15);
      ctx.fillStyle = '#777788'; ctx.font = '8px Segoe UI';
      const dmgUps = tower.upgradeHistory.filter(h => h === 'damage').length;
      const spdUps = tower.upgradeHistory.filter(h => h === 'speed').length;
      ctx.fillText(`Dmg×${tower.damageMult.toFixed(1)} Spd×${tower.speedMult.toFixed(1)}${tower.upgradeCount > 0 ? ` ⚔${dmgUps}⚡${spdUps}` : ''}`, infoRect.x + 27, infoRect.y + 27);
      if (tower.fusionDef) {
        const pe = tower.fusionDef.primaryElement, se = tower.fusionDef.secondaryElement;
        ctx.fillStyle = '#99aacc'; ctx.font = '7px Segoe UI';
        ctx.fillText(`Ataque: 50%${ELEMENT_ICONS[pe]}+50%${ELEMENT_ICONS[se]} | Magia: 60%${ELEMENT_ICONS[pe]}+40%${ELEMENT_ICONS[se]}`, infoRect.x + 27, infoRect.y + 39);
      } else {
        const moveLbl = here.length > 1 ? `Mover tudo: ${totalMoveCost}g` : `Mover: ${totalMoveCost}g`;
        ctx.fillText(`Venda: ${Math.floor(tower.goldSpent / 2)}g | ${moveLbl}`, infoRect.x + 27, infoRect.y + 39);
      }
      if (tower.dualMagic) { ctx.fillStyle = '#ffff44'; ctx.font = 'bold 7px Segoe UI'; ctx.fillText('✨DUAL', infoRect.x + pw - 60, infoRect.y + 15); }

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
        const fusion = fusionRegistry.getDef(primary.def.element, secondary.def.element);
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

  private renderDebugPanel(ctx: CanvasRenderingContext2D) {
    this.debugBtns = {};
    const pw = 240, pad = 8, btnH = 26, gap = 4;
    const cmds: [string, string][] = [
      ['gold_1000', '💰  +1 000 Ouro'],
      ['gold_10000', '💰  +10 000 Ouro'],
      ['levelup', '⬆  Level Up (escolha)'],
      ['levelup10', '⬆  +10 Levels (auto)'],
      ['maxlevel', '⬆  Max Level 50'],
      ['heal', '❤  Curar (max vidas)'],
      ['kill_all', '💀  Matar Todos'],
      ['skip_wave', '⏭  Pular Onda'],
      ['skip10', '⏭  Pular +10 Ondas'],
      ['give_item', '🎁  Item Aleatório'],
      ['max_towers', '🏗  Max Todas Torres'],
      ['god_mode', '🛡  God Mode (9999 HP)'],
    ];
    const ph = pad * 2 + cmds.length * (btnH + gap) - gap + 24;
    const px = 10, py = 10;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    rr(ctx, px, py, pw, ph, 8); ctx.fill();
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
    rr(ctx, px, py, pw, ph, 8); ctx.stroke();

    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'left';
    ctx.fillText('🐛 DEBUG  (F12 para fechar)', px + pad, py + 18);

    let by = py + 28;
    for (const [id, label] of cmds) {
      const r = { x: px + pad, y: by, w: pw - pad * 2, h: btnH };
      btn(ctx, r, label, '#1a0a0a', '#ff8866');
      this.debugBtns[id] = r;
      by += btnH + gap;
    }
    ctx.textAlign = 'left';
  }
}
