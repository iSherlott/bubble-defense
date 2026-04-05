import type { Vec2, ElementType, OwnedItem, ItemDropAnim, UpgradePopup } from '../types';
import type { AnimationInstance } from '../types/animation';
import type { BaseTower as Tower } from '../entities/BaseTower';
import type { BaseEnemy as Enemy } from '../entities/BaseEnemy';
import type { Player } from '../player/Player';
import type { WaveManager } from '../systems/WaveManager';
import type { MapData } from '../systems/MapGenerator';
import type { EntityRenderer } from './EntityRenderer';

import { BoardRenderer } from './game/BoardRenderer';
import { SidebarRenderer } from './game/SidebarRenderer';
import { WaveBarRenderer } from './game/WaveBarRenderer';
import { ItemsHudRenderer } from './game/ItemsHudRenderer';
import { UpgradePopupRenderer } from './game/UpgradePopupRenderer';
import { DebugPanelRenderer } from './game/DebugPanelRenderer';

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
    animationInstances: ReadonlyArray<AnimationInstance>;
    mapExpandCost: number;
    canExpandMap: boolean;
    bossBarState: { active: false } | { active: true; hp: number; maxHp: number; ratio: number };
  };
  player: Player;
  towersAt: (c: number, r: number) => Tower[];
  isCellFull: (c: number, r: number) => boolean;
  towerCost: (id: string) => number;
  towerUpgradeCost: (t?: Tower) => number;
  getSynergyBonus: (t: Tower) => number;
  getMoveCost: (towers: Tower[]) => number;
  getSellRefund: (t: Tower) => number;
  gameSpeed: 1 | 2 | 4;
  debugMode: boolean;
  mousePos: Vec2;
}

export class GameRenderer {
  private board: BoardRenderer;
  private sidebar: SidebarRenderer;
  private waveBar: WaveBarRenderer;
  private itemsHud: ItemsHudRenderer;
  private upgradePopup: UpgradePopupRenderer;
  private debugPanel: DebugPanelRenderer;

  constructor(private entityRenderer: EntityRenderer) {
    this.board        = new BoardRenderer();
    this.sidebar      = new SidebarRenderer();
    this.waveBar      = new WaveBarRenderer();
    this.itemsHud     = new ItemsHudRenderer();
    this.upgradePopup = new UpgradePopupRenderer();
    this.debugPanel   = new DebugPanelRenderer();
  }

  // ─── Rect accessors ────────────────────────────────────────────────────────
  getGameUIRects()         { return this.sidebar.getGameUIRects(); }
  getTowerSelectionRects() { return this.sidebar.getTowerSelectionRects(); }
  getUpgradePopupBtns()    { return this.upgradePopup.getUpgradePopupBtns(); }
  getUpgradePopupRect()    { return this.upgradePopup.getUpgradePopupRect(); }
  getDebugBtns()           { return this.debugPanel.getDebugBtns(); }

  renderGame(ctx: CanvasRenderingContext2D, map: MapData, gw: number, gh: number, state: GameRenderState) {
    const g = state.game;

    this.board.render(ctx, map, gw, gh, state, this.entityRenderer);
    this.sidebar.render(ctx, gw, gh, state);
    this.itemsHud.render(ctx, gw, g.items, { x: 0, y: 0 });
    this.waveBar.render(ctx, gw, gh, g.waveManager, g.bossBarState);


    if (g.upgradePopup)
      this.upgradePopup.render(
        ctx, gw, gh, g.upgradePopup,
        state.towersAt, state.towerCost, state.towerUpgradeCost, state.getSynergyBonus,
        state.getMoveCost, state.getSellRefund,
        g.gold, g.canFuse,
      );

    if (g.itemDropAnim) this.itemsHud.renderItemDropAnim(ctx, gw, gh, g.itemDropAnim);

    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, gw, gh);
      // Position pause message below the relics (items HUD) bar
      const pauseY = 60;
      ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 44px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('⏸  PAUSADO', gw / 2, pauseY);
      ctx.font = '17px Segoe UI'; ctx.fillStyle = '#7777aa';
      ctx.fillText('P ou ESC para continuar', gw / 2, pauseY + 44);
    }

    if (state.debugMode) this.debugPanel.render(ctx);
  }

  renderGameWithMouse(ctx: CanvasRenderingContext2D, map: MapData, gw: number, gh: number, state: GameRenderState, mousePos: Vec2) {
    this.renderGame(ctx, map, gw, gh, state);
    this.itemsHud.render(ctx, gw, state.game.items, mousePos);
  }

  // Kept for external callers (e.g. save/load screen)
  renderItemDropAnim(ctx: CanvasRenderingContext2D, gw: number, gh: number, anim: ItemDropAnim) {
    this.itemsHud.renderItemDropAnim(ctx, gw, gh, anim);
  }
}
