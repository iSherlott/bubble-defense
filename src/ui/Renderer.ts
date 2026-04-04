import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim } from '../types';
import type { BaseTower as Tower } from '../entities/BaseTower';
import type { BaseEnemy as Enemy } from '../entities/BaseEnemy';
import type { Player } from '../player/Player';
import type { SkillTree as TalentTree } from '../player/SkillTree';
import type { WaveManager } from '../game/WaveManager';
import type { UpgradePopup } from '../game/Game';
import type { MapData } from '../game/MapGenerator';
import { SIDEBAR_W, WAVE_BAR_H } from '../constants';
import { MenuRenderer } from './MenuRenderer';
import { EntityRenderer } from './EntityRenderer';
import { GameRenderer } from './GameRenderer';
import { OverlayRenderer } from './OverlayRenderer';

interface RenderState {
  screen: GameScreen;
  paused: boolean;
  autoWave: boolean;
  game: {
    towers: Tower[];
    enemies: Enemy[];
    projectiles: ProjectileData[];
    floatingTexts: Array<{x:number;y:number;text:string;color:string;life:number;maxLife:number}>;
    puddles: Puddle[];
    gold:number; lives:number; score:number;
    selectedTowerType: string;
    hoveredCell: Vec2|null;
    waveManager: WaveManager;
    upgradePopup: UpgradePopup|null;
    movingTower: Tower|null;
    currentMapTier: number;
    items: OwnedItem[];
    itemDropAnim: ItemDropAnim|null;
    canFuse: boolean;
  };
  player: Player;
  talentTree: TalentTree;
  towersAt: (c:number,r:number) => Tower[];
  towerCost: (id:string) => number;
  towerUpgradeCost: (t?:Tower) => number;
  getSynergyBonus: (t:Tower) => number;
  gameSpeed: 1 | 2;
  debugMode: boolean;
  pendingAffinity: ElementType;
  mousePos: Vec2;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapData;

  private menu = new MenuRenderer();
  private entity = new EntityRenderer();
  private gameR: GameRenderer;
  private overlay = new OverlayRenderer();

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, map: MapData) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.map = map;
    this.gameR = new GameRenderer(this.entity);
    this.resizeCanvas();
  }

  updateMap(map: MapData) {
    this.map = map;
    this.resizeCanvas();
  }

  private resizeCanvas() {
    const { gameWidth, gameHeight } = this.map;
    this.canvas.width  = gameWidth  + SIDEBAR_W;
    this.canvas.height = gameHeight + WAVE_BAR_H;
  }

  private get cw() { return this.canvas.width; }
  private get ch() { return this.canvas.height; }
  private get gw() { return this.map.gameWidth; }
  private get gh() { return this.map.gameHeight; }

  triggerAoe(x: number, y: number, r: number) { this.gameR.triggerAoe(x, y, r); }

  setMousePos(pos: {x:number;y:number}) { this.overlay.setMousePos(pos); }

  render(state: RenderState) {
    // Update AoE flashes
    for (const f of this.gameR.aoeFlashes) f.life -= 0.016;
    this.gameR.aoeFlashes = this.gameR.aoeFlashes.filter(f => f.life > 0);
    this.ctx.clearRect(0, 0, this.cw, this.ch);

    switch (state.screen) {
      case 'menu':      this.menu.renderMenu(this.ctx, this.cw, this.ch); break;
      case 'affinity':  this.menu.renderAffinity(this.ctx, this.cw, this.ch, state.player); break;
      case 'archetype': this.menu.renderArchetype(this.ctx, this.cw, this.ch, state.pendingAffinity); break;
      case 'bonus':     this.menu.renderBonus(this.ctx, this.cw, this.ch, state.player); break;
      case 'game':      this.gameR.renderGame(this.ctx, this.map, this.gw, this.gh, state); break;
      case 'levelup':   this.overlay.renderLevelUp(this.ctx, this.cw, this.ch, state.player); break;
      case 'talent':    this.overlay.renderTalents(this.ctx, this.cw, this.ch, state.player, state.talentTree); break;
      case 'gameover':  this.overlay.renderGameOver(this.ctx, this.cw, this.ch, state.game.score, state.game.waveManager.currentWave); break;
      case 'bestiary':  this.overlay.renderBestiary(this.ctx, this.cw, this.ch); break;
    }
  }

  // ─── Public accessors (delegated) ─────────────────────────────────────────
  getMenuButtonRects()     { return this.menu.getMenuButtonRects(); }
  getAffinityRects()       { return this.menu.getAffinityRects(); }
  getArchetypeRects()      { return this.menu.getArchetypeRects(); }
  getArchetypeBackRect()   { return this.menu.getArchetypeBackRect(); }
  getBonusStatBtns()       { return this.menu.getBonusStatBtns(); }
  getBonusStartBtn()       { return this.menu.getBonusStartBtn(); }
  getBonusBackBtn()        { return this.menu.getBonusBackBtn(); }

  getGameUIRects()         { return this.gameR.getGameUIRects(); }
  getTowerSelectionRects() { return this.gameR.getTowerSelectionRects(); }
  getUpgradePopupBtns()    { return this.gameR.getUpgradePopupBtns(); }
  getUpgradePopupRect()    { return this.gameR.getUpgradePopupRect(); }
  getDebugBtns()           { return this.gameR.getDebugBtns(); }

  getLevelUpButtonRects()  { return this.overlay.getLevelUpButtonRects(); }
  getTalentRects()         { return this.overlay.getTalentRects(); }
  getTalentBackRect()      { return this.overlay.getTalentBackRect(); }
  getGameOverButtonRects() { return this.overlay.getGameOverButtonRects(); }
  getBestiaryRects()       { return this.overlay.getBestiaryRects(); }
  handleBestiaryTabClick(p: {x:number;y:number}, hit: (p:{x:number;y:number},r:{x:number;y:number;w:number;h:number})=>boolean) {
    this.overlay.handleBestiaryTabClick(p, hit);
  }
}
