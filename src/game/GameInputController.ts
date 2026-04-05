// ─── GameInputController — mouse, keyboard, click dispatch ───────────────────
// Extracted from Game.ts to isolate input handling from game logic.

import type { Vec2, ElementType, GameScreen } from '../types';
import type { Game, UpgradePopup } from './Game';
import { towerRegistry } from '../registries';

export class GameInputController {
  constructor(private game: Game) {}

  setup() {
    const g = this.game;
    g.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    g.canvas.addEventListener('click',     e => this.onClick(e));
    g.canvas.addEventListener('contextmenu', e => { e.preventDefault(); this.onRightClick(e); });
    window.addEventListener('keydown', e => this.onKeyDown(e));
  }

  private cvPos(e: MouseEvent): Vec2 {
    const c = this.game.canvas;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width  / r.width),
      y: (e.clientY - r.top)  * (c.height / r.height),
    };
  }

  private px2grid(p: Vec2): Vec2 {
    const cs = this.game.cellSize;
    return { x: Math.floor(p.x / cs), y: Math.floor(p.y / cs) };
  }

  private hit(p: Vec2, r: { x: number; y: number; w: number; h: number }) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  private onMouseMove(e: MouseEvent) {
    const g = this.game;
    g.mousePos = this.cvPos(e);
    if (g.screen === 'game') g.hoveredCell = this.px2grid(g.mousePos);
  }

  private onClick(e: MouseEvent) {
    const p = this.cvPos(e);
    switch (this.game.screen) {
      case 'menu':      this.handleMenuClick(p); break;
      case 'affinity':  this.handleAffinityClick(p); break;
      case 'archetype': this.handleArchetypeClick(p); break;
      case 'bonus':     this.handleBonusClick(p); break;
      case 'game':      this.handleGameClick(p); break;
      case 'levelup':   this.handleLevelUpClick(p); break;
      case 'talent':    this.handleTalentClick(p); break;
      case 'gameover':  this.handleGameOverClick(p); break;
      case 'bestiary':  this.handleBestiaryClick(p); break;
    }
  }

  private onRightClick(e: MouseEvent) {
    if (this.game.screen !== 'game') return;
    this.handleRightClick(this.cvPos(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    const g = this.game;
    if (e.key === 'Escape') {
      if (g.screen === 'talent')   { g.screen = 'game'; return; }
      if (g.screen === 'bestiary') { g.screen = 'game'; return; }
      if (g.screen === 'game') {
        if (g.movingTower)  { g.movingTower = null; return; }
        if (g.upgradePopup) { g.upgradePopup = null; return; }
        g.paused = !g.paused;
      }
    }
    if ((e.key === 'p' || e.key === 'P') && g.screen === 'game') g.paused = !g.paused;
    if ((e.key === 'a' || e.key === 'A') && g.screen === 'game') g.autoWave = !g.autoWave;
    if ((e.key === 'e' || e.key === 'E') && g.screen === 'game') g.expandMap();
    if (e.key === 'F12') { e.preventDefault(); g.debugMode = !g.debugMode; }
  }

  // ─── Screen click handlers ─────────────────────────────────────────────────

  private handleMenuClick(p: Vec2) {
    const g = this.game;
    const b = g.renderer.getMenuButtonRects();
    if (b['newGame']  && this.hit(p, b['newGame']))  g.screen = 'affinity';
    if (b['loadGame'] && this.hit(p, b['loadGame']) && g.hasSaveAvailable()) g.loadGameFromSave();
  }

  private handleAffinityClick(p: Vec2) {
    const g = this.game;
    for (const [el, r] of g.renderer.getAffinityRects()) {
      if (this.hit(p, r)) {
        g.pendingAffinity = el as ElementType;
        g.screen = 'archetype' as GameScreen;
        return;
      }
    }
  }

  private handleArchetypeClick(p: Vec2) {
    const g = this.game;
    const rects = g.renderer.getArchetypeRects();
    for (const [id, r] of rects) {
      if (this.hit(p, r)) {
        g.selectArchetype(id);
        return;
      }
    }
    const back = g.renderer.getArchetypeBackRect();
    if (back && this.hit(p, back)) { g.screen = 'affinity'; return; }
  }

  private handleBonusClick(p: Vec2) {
    const g = this.game;
    const statBtns = g.renderer.getBonusStatBtns();
    const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
      ['strength','intelligence','dexterity','agility','luck','vitality'];
    for (const k of keys) {
      const r = statBtns[k];
      if (r && this.hit(p, r) && g.player.bonusPoints > 0) {
        g.player.spendBonusPoint(k);
        return;
      }
    }
    const startBtn = g.renderer.getBonusStartBtn();
    if (startBtn && this.hit(p, startBtn) && g.player.bonusPoints <= 0) {
      g.startNewGameFromBonus();
      return;
    }
    const backBtn = g.renderer.getBonusBackBtn();
    if (backBtn && this.hit(p, backBtn)) {
      g.screen = 'archetype' as GameScreen;
      return;
    }
  }

  private handleGameOverClick(p: Vec2) {
    const g = this.game;
    const b = g.renderer.getGameOverButtonRects();
    if (b['menu']    && this.hit(p, b['menu']))    g.screen = 'menu';
    if (b['restart'] && this.hit(p, b['restart'])) g.screen = 'affinity';
  }

  private handleLevelUpClick(p: Vec2) {
    const g = this.game;
    const keys = ['strength','intelligence','dexterity','agility','luck','vitality'] as const;
    for (const k of keys) {
      const r = g.renderer.getLevelUpButtonRects()[k];
      if (r && this.hit(p, r)) { g.player.chooseStat(k); g.screen = 'game'; return; }
    }
  }

  private handleBestiaryClick(p: Vec2) {
    const g = this.game;
    const b = g.renderer.getBestiaryRects();
    if (b['back'] && this.hit(p, b['back'])) { g.screen = 'game'; return; }
    g.renderer.handleBestiaryTabClick(p, this.hit.bind(this));
  }

  private handleTalentClick(p: Vec2) {
    const g = this.game;
    const back = g.renderer.getTalentBackRect();
    if (back && this.hit(p, back)) { g.screen = 'game'; return; }
    for (const [id, r] of g.renderer.getTalentRects()) {
      if (this.hit(p, r)) {
        const node = g.talentTree.nodes.get(id);
        if (node && g.talentTree.canPurchase(id, g.player.level, g.player.talentPoints)) {
          g.talentTree.purchase(id);
          g.player.talentPoints -= node.cost;
        }
        return;
      }
    }
  }

  // ─── Main game click handler ───────────────────────────────────────────────

  private handleGameClick(p: Vec2) {
    const g = this.game;

    // ── Upgrade popup ──
    if (g.upgradePopup) {
      this.handleUpgradePopupClick(p, g.upgradePopup);
      return;
    }

    // ── Debug panel ──
    if (g.debugMode) {
      const dbg = g.renderer.getDebugBtns();
      for (const [cmd, r] of Object.entries(dbg)) {
        if (this.hit(p, r)) { g.handleDebugClick(cmd); return; }
      }
    }

    // ── Sidebar ──
    const ui = g.renderer.getGameUIRects();
    if (ui['mainAction'] && this.hit(p, ui['mainAction'])) {
      if (g.paused) { g.paused = false; }
      else if (g.waveManager.waveActive) { g.paused = true; }
      else if (g.waveManager.betweenWaves) { g.waveManager.startWave(); }
      return;
    }
    if (ui['autoWave']    && this.hit(p, ui['autoWave']))    { g.autoWave = !g.autoWave; return; }
    if (ui['speedToggle'] && this.hit(p, ui['speedToggle'])) { g.gameSpeed = g.gameSpeed === 1 ? 2 : 1; return; }
    if (ui['talentBtn']   && this.hit(p, ui['talentBtn']))   { g.screen = 'talent'; return; }
    if (ui['expandMap']   && this.hit(p, ui['expandMap']))   { g.expandMap(); return; }
    if (ui['bestiary']    && this.hit(p, ui['bestiary']))    { g.screen = 'bestiary'; return; }
    for (const [id, r] of g.renderer.getTowerSelectionRects()) {
      if (this.hit(p, r)) {
        g.selectedTowerType = g.selectedTowerType === id ? '' : id;
        return;
      }
    }

    // ── Board ──
    if (p.x < g.map.gameWidth && p.y < g.map.gameHeight) {
      const cell = this.px2grid(p);

      // Move mode
      if (g.movingTower) {
        g.towerService.moveTower(g, g.movingTower, cell.x, cell.y);
        g.movingTower = null;
        return;
      }

      const here = g.towerService.towersAt(g.towers, cell.x, cell.y);
      if (here.length > 0) {
        g.upgradePopup = { col: cell.x, row: cell.y };
      } else if (g.selectedTowerType) {
        g.towerService.placeTower(g, g.selectedTowerType, cell.x, cell.y, 0);
        g.selectedTowerType = '';
      }
    }
  }

  private handleUpgradePopupClick(p: Vec2, popup: UpgradePopup) {
    const g = this.game;
    const btns = g.renderer.getUpgradePopupBtns();

    if (btns['close'] && this.hit(p, btns['close'])) { g.upgradePopup = null; return; }

    for (let i = 0; i < 2; i++) {
      const k = `upgrade_${i}`;
      if (btns[k] && this.hit(p, btns[k])) {
        const here = g.towerService.towersAt(g.towers, popup.col, popup.row);
        if (here[i]) {
          g.towerService.upgradeTower(g, here[i]);
        }
        return;
      }
      const sk = `sell_${i}`;
      if (btns[sk] && this.hit(p, btns[sk])) {
        const here = g.towerService.towersAt(g.towers, popup.col, popup.row);
        if (here[i]) { g.towerService.sellTower(g, here[i]); }
        g.upgradePopup = null; return;
      }
      const mk = `move_${i}`;
      if (btns[mk] && this.hit(p, btns[mk])) {
        const here = g.towerService.towersAt(g.towers, popup.col, popup.row);
        if (here[i]) { g.movingTower = here[i]; }
        g.upgradePopup = null; return;
      }
    }

    // Add 2nd tower
    for (const def of towerRegistry.getAllDefs()) {
      const k = `addSecond_${def.id}`;
      if (btns[k] && this.hit(p, btns[k])) {
        g.towerService.placeTower(g, def.id, popup.col, popup.row, 1);
        g.upgradePopup = null; return;
      }
    }

    // Fusion button
    if (btns['fusion'] && this.hit(p, btns['fusion'])) {
      g.towerService.fuseTowers(g, popup.col, popup.row);
      g.upgradePopup = null; return;
    }

    if (!this.hit(p, g.renderer.getUpgradePopupRect())) g.upgradePopup = null;
  }

  private handleRightClick(p: Vec2) {
    const g = this.game;
    if (p.x >= g.map.gameWidth) return;
    for (const e of g.enemies) {
      if (Math.hypot(e.pos.x - p.x, e.pos.y - p.y) < e.def.size + 4) {
        g.modal.showEnemy(e); return;
      }
    }
    const cell = this.px2grid(p);
    const here = g.towerService.towersAt(g.towers, cell.x, cell.y);
    if (here.length > 0) g.modal.showTower(here[0], g.player.stats, g.talentTree);
  }
}
