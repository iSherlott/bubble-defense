import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim } from '../types';
<<<<<<< HEAD
import { CELL_SIZE,
  BASE_LIVES, INITIAL_GOLD,
  MAP_TIER_AT, MAP_EXPAND_COST } from '../constants';
import { GameConfig } from '../config';
import { Tower, createTower, resetTowerIds } from '../entities/Tower';
=======
import { CELL_SIZE, BASE_LIVES, INITIAL_GOLD, MAP_TIER_AT } from '../constants';
import { GameConfig } from '../config';
import { Tower } from '../entities/Tower';
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07
import type { BaseEnemy } from '../entities/BaseEnemy';
import { Player } from '../player/Player';
import { SkillTree as TalentTree } from '../player/SkillTree';
import { WaveManager } from './WaveManager';
import { generateMap } from './MapGenerator';
import type { MapData } from './MapGenerator';
import { Renderer } from '../ui/Renderer';
import { Modal } from '../ui/Modal';
import type { IGameContext, FloatingText, BurnZone } from '../core/GameContext';
import { ItemSystem } from '../systems/ItemSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectSystem } from '../systems/EffectSystem';
import { BossSystem } from '../systems/BossSystem';
import { RewardSystem } from '../systems/RewardSystem';
<<<<<<< HEAD
import { TowerPlacementService, PlacementContext } from '../services/TowerPlacementService';
import { StateStore } from '../state/StateStore';
=======
import { AnimationSystem } from '../systems/AnimationSystem';
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07
import { registerAllContent } from '../content/registerAll';

// ── Extracted Services ────────────────────────────────────────────────────────
import { TowerPlacementService } from './TowerPlacementService';
import { TowerInteractionService } from './TowerInteractionService';
import { GameInputController } from './GameInputController';
import { GameFlowController } from './GameFlowController';

export interface UpgradePopup { col: number; row: number; }

export class Game implements IGameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  screen: GameScreen = 'menu';
  paused = false;
  autoWave = false;
  gameSpeed: 1 | 2 = 1;
  debugMode = false;
  pendingAffinity: ElementType = 'fire';

  gold   = INITIAL_GOLD;
  lives  = BASE_LIVES;
  score  = 0;

  towers: Tower[] = [];
  enemies: BaseEnemy[] = [];
  projectiles: ProjectileData[] = [];
  floatingTexts: FloatingText[] = [];
  puddles: Puddle[] = [];
  burnZones: BurnZone[] = [];

  map: MapData;

  player: Player      = new Player();
  talentTree: TalentTree = new TalentTree();
  waveManager: WaveManager = new WaveManager();
  renderer: Renderer;
  modal: Modal;

  selectedTowerType = '';
  hoveredCell: Vec2 | null = null;
  mousePos: Vec2 = { x: 0, y: 0 };
  upgradePopup: UpgradePopup | null = null;
  movingTower: Tower | null = null;

  // Item system state
  items: OwnedItem[] = [];
  itemDropAnim: ItemDropAnim | null = null;
  readonly itemState = {
    titanShieldCharges: 0,
    titanShieldWaves: 0,
    cataclysmTimer: 0,
    lastTronoWave: 0,
    lastItemWave: 0,
  };

  // Core systems
  readonly itemSystem: ItemSystem;
  readonly combatSystem: CombatSystem;
  readonly effectSystem: EffectSystem;
  readonly bossSystem: BossSystem;
  readonly rewardSystem: RewardSystem;
<<<<<<< HEAD
  readonly placement: TowerPlacementService;

  /** Central state store — exposes typed slice managers and the screen FSM. */
  readonly store!: StateStore;
=======
  readonly animations: AnimationSystem;

  // Extracted services
  readonly towerPlacement: TowerPlacementService;
  readonly towerInteraction: TowerInteractionService;
  readonly gameFlow: GameFlowController;
  private readonly inputController: GameInputController;

  // Map state (public for GameFlowController)
  currentMapSeed = 1;
  currentMapTier = 0;

  /** Cell size for coordinate conversion */
  readonly cellSize = CELL_SIZE;
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07

  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    registerAllContent();

    // Core systems
    this.itemSystem = new ItemSystem();
    this.combatSystem = new CombatSystem(this.itemSystem);
    this.effectSystem = new EffectSystem();
    this.bossSystem = new BossSystem();
    this.rewardSystem = new RewardSystem(this.itemSystem);
<<<<<<< HEAD
    this.placement = new TowerPlacementService(this.itemSystem);
=======
    this.animations = new AnimationSystem();
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07

    // Extracted services
    this.towerPlacement = new TowerPlacementService(this.itemSystem);
    this.towerInteraction = new TowerInteractionService();
    this.gameFlow = new GameFlowController(this.itemSystem);
    this.inputController = new GameInputController(this);

    // Default map
    this.map = generateMap(1, 0);
    this.renderer = new Renderer(canvas, this.ctx, this.map);
    this.modal = new Modal();
<<<<<<< HEAD

    // State store — wired after player/talentTree/waveManager exist
    (this as { store: StateStore }).store = new StateStore(this.map);
    this.store.wire(this.player, this.talentTree, this.waveManager, hasSave);
    this.store.setAoeFlashHandler((x, y, r) => this.renderer.triggerAoe(x, y, r));

    this.setupInput();
=======
    this.inputController.setup();
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07
  }

  // ─── Public delegates for services / input controller ───────────────────────

  /** Called by GameInputController when archetype is selected */
  selectArchetype(id: string): void {
    this.player = new Player();
    this.player.affinity = this.pendingAffinity;
    this.player.applyArchetype(id);
    this.screen = 'bonus' as GameScreen;
  }

  startNewGameFromBonus(): void { this.gameFlow.startNewGameFromBonus(this); }
  startNewGame(affinity: ElementType, archetypeId: string): void { this.gameFlow.startNewGame(this, affinity, archetypeId); }
  loadGameFromSave(): void { this.gameFlow.loadGameFromSave(this); }
  hasSaveAvailable(): boolean { return this.gameFlow.hasSaveAvailable(); }
  saveCurrentGame(): void { this.gameFlow.saveCurrentGame(this); }

<<<<<<< HEAD
  private onMouseMove(e: MouseEvent) {
    this.mousePos = this.cvPos(e);
    if (this.screen === 'game') this.hoveredCell = this.px2grid(this.mousePos);
  }

  private onClick(e: MouseEvent) {
    const p = this.cvPos(e);
    switch (this.screen) {
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
    if (this.screen !== 'game') return;
    this.handleRightClick(this.cvPos(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.screen === 'talent') { this.screen = 'game'; return; }
      if (this.screen === 'bestiary') { this.screen = 'game'; return; }
      if (this.screen === 'game') {
        if (this.movingTower)  { this.movingTower = null; return; }
        if (this.upgradePopup) { this.upgradePopup = null; return; }
        this.paused = !this.paused;
      }
    }
    if ((e.key === 'p' || e.key === 'P') && this.screen === 'game') this.paused = !this.paused;
    if ((e.key === 'a' || e.key === 'A') && this.screen === 'game') this.autoWave = !this.autoWave;
    if ((e.key === 'e' || e.key === 'E') && this.screen === 'game') this.expandMap();
    if (e.key === 'F12') { e.preventDefault(); this.debugMode = !this.debugMode; }
  }

  private px2grid(p: Vec2): Vec2 {
    return { x: Math.floor(p.x / CELL_SIZE), y: Math.floor(p.y / CELL_SIZE) };
  }

  private hit(p: Vec2, r: { x:number;y:number;w:number;h:number }) {
    return p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────
  private handleMenuClick(p: Vec2) {
    const b = this.renderer.getMenuButtonRects();
    if (b['newGame']  && this.hit(p, b['newGame']))  this.screen = 'affinity';
    if (b['loadGame'] && this.hit(p, b['loadGame']) && hasSave()) this.loadGameFromSave();
  }

  private handleAffinityClick(p: Vec2) {
    for (const [el, r] of this.renderer.getAffinityRects()) {
      if (this.hit(p, r)) { this.pendingAffinity = el as ElementType; this.screen = 'archetype' as GameScreen; return; }
    }
  }

  private handleArchetypeClick(p: Vec2) {
    const rects = this.renderer.getArchetypeRects();
    for (const [id, r] of rects) {
      if (this.hit(p, r)) {
        // Apply archetype but go to bonus distribution screen first
        this.player = new Player();
        this.player.affinity = this.pendingAffinity;
        this.player.applyArchetype(id);
        this.screen = 'bonus' as GameScreen;
        return;
      }
    }
    // Back button
    const back = this.renderer.getArchetypeBackRect();
    if (back && this.hit(p, back)) { this.screen = 'affinity'; return; }
  }

  private handleBonusClick(p: Vec2) {
    const statBtns = this.renderer.getBonusStatBtns();
    const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
      ['strength','intelligence','dexterity','agility','luck','vitality'];
    for (const k of keys) {
      const r = statBtns[k];
      if (r && this.hit(p, r) && this.player.bonusPoints > 0) {
        this.player.spendBonusPoint(k);
        return;
      }
    }
    // Start button (only if all bonus points spent)
    const startBtn = this.renderer.getBonusStartBtn();
    if (startBtn && this.hit(p, startBtn) && this.player.bonusPoints <= 0) {
      this.startNewGameFromBonus();
      return;
    }
    // Back button
    const backBtn = this.renderer.getBonusBackBtn();
    if (backBtn && this.hit(p, backBtn)) {
      this.screen = 'archetype' as GameScreen;
      return;
    }
  }

  private startNewGameFromBonus() {
    this.initState();
    const seed = Date.now() & 0xffffff;
    this.regenerateMap(0, seed);
    this.screen = 'game';
  }

  private handleGameOverClick(p: Vec2) {
    const b = this.renderer.getGameOverButtonRects();
    if (b['menu']    && this.hit(p, b['menu']))    this.screen = 'menu';
    if (b['restart'] && this.hit(p, b['restart'])) this.screen = 'affinity';
  }

  private handleLevelUpClick(p: Vec2) {
    const keys = ['strength','intelligence','dexterity','agility','luck','vitality'] as const;
    for (const k of keys) {
      const r = this.renderer.getLevelUpButtonRects()[k];
      if (r && this.hit(p, r)) { this.player.chooseStat(k); this.screen = 'game'; return; }
    }
  }

  private handleBestiaryClick(p: Vec2) {
    const b = this.renderer.getBestiaryRects();
    if (b['back'] && this.hit(p, b['back'])) { this.screen = 'game'; return; }
    this.renderer.handleBestiaryTabClick(p, this.hit.bind(this));
  }

  private handleTalentClick(p: Vec2) {
    const back = this.renderer.getTalentBackRect();
    if (back && this.hit(p, back)) { this.screen = 'game'; return; }
    for (const [id, r] of this.renderer.getTalentRects()) {
      if (this.hit(p, r)) {
        const node = this.talentTree.nodes.get(id);
        if (node && this.talentTree.canPurchase(id, this.player.level, this.player.talentPoints)) {
          this.talentTree.purchase(id);
          this.player.talentPoints -= node.cost;
        }
        return;
      }
    }
  }

  private handleGameClick(p: Vec2) {
    // ── Upgrade popup ──
    if (this.upgradePopup) {
      const btns = this.renderer.getUpgradePopupBtns();
      if (btns['close'] && this.hit(p, btns['close'])) { this.upgradePopup = null; return; }

      for (let i = 0; i < 2; i++) {
        const k = `upgrade_${i}`;
        if (btns[k] && this.hit(p, btns[k])) {
          const here = this.towersAt(this.upgradePopup.col, this.upgradePopup.row);
          if (here[i]) {
            const upgCost = this.towerUpgradeCost(here[i]);
            if (this.gold >= upgCost && !here[i].isMaxLevel) {
              this.gold -= upgCost;
              here[i].goldSpent += upgCost;
              this.upgradeTower(here[i]);
            }
          }
          return;
        }
        const sk = `sell_${i}`;
        if (btns[sk] && this.hit(p, btns[sk])) {
          const here = this.towersAt(this.upgradePopup.col, this.upgradePopup.row);
          if (here[i]) { this.sellTower(here[i]); }
          this.upgradePopup = null; return;
        }
        const mk = `move_${i}`;
        if (btns[mk] && this.hit(p, btns[mk])) {
          const here = this.towersAt(this.upgradePopup.col, this.upgradePopup.row);
          if (here[i]) { this.movingTower = here[i]; }
          this.upgradePopup = null; return;
        }
      }

      // Add 2nd tower: one button per element type
      for (const def of towerRegistry.getAllDefs()) {
        const k = `addSecond_${def.id}`;
        if (btns[k] && this.hit(p, btns[k])) {
          const ctx = this.placementCtx;
          this.placement.placeSecond(ctx, this.upgradePopup.col, this.upgradePopup.row, def.id);
          this.syncFromCtx(ctx);
          this.upgradePopup = null; return;
        }
      }

      // Fusion button
      if (btns['fusion'] && this.hit(p, btns['fusion'])) {
        this.fuseTowers(this.upgradePopup.col, this.upgradePopup.row);
        this.upgradePopup = null; return;
      }

      if (!this.hit(p, this.renderer.getUpgradePopupRect())) this.upgradePopup = null;
      return;
    }

    // ── Debug panel (absorbs clicks when open) ──
    if (this.debugMode) {
      const dbg = this.renderer.getDebugBtns();
      for (const [cmd, r] of Object.entries(dbg)) {
        if (this.hit(p, r)) { this.handleDebugClick(cmd); return; }
      }
    }

    // ── Sidebar ──
    const ui = this.renderer.getGameUIRects();
    if (ui['mainAction'] && this.hit(p, ui['mainAction'])) {
      if (this.paused) { this.paused = false; }
      else if (this.waveManager.waveActive) { this.paused = true; }
      else if (this.waveManager.betweenWaves) { this.waveManager.startWave(); }
      return;
    }
    if (ui['autoWave']  && this.hit(p, ui['autoWave']))  { this.autoWave = !this.autoWave; return; }
    if (ui['speedToggle'] && this.hit(p, ui['speedToggle'])) { this.gameSpeed = this.gameSpeed === 1 ? 2 : 1; return; }
    if (ui['talentBtn'] && this.hit(p, ui['talentBtn'])) { this.screen = 'talent'; return; }
    if (ui['expandMap']  && this.hit(p, ui['expandMap']))  { this.expandMap(); return; }
    if (ui['bestiary']   && this.hit(p, ui['bestiary']))   { this.screen = 'bestiary'; return; }
    for (const [id, r] of this.renderer.getTowerSelectionRects()) {
      if (this.hit(p, r)) {
        this.selectedTowerType = this.selectedTowerType === id ? '' : id; // toggle
        return;
      }
    }

    // ── Board ──
    if (p.x < this.map.gameWidth && p.y < this.map.gameHeight) {
      const cell = this.px2grid(p);

      // Move mode
      if (this.movingTower) {
        this.doMoveTower(this.movingTower, cell.x, cell.y);
        this.movingTower = null;
        return;
      }

      const here = this.towersAt(cell.x, cell.y);
      if (here.length > 0) {
        this.upgradePopup = { col: cell.x, row: cell.y };
      } else if (this.selectedTowerType) {
        this.placeTower(cell.x, cell.y);
        this.selectedTowerType = '';   // deselect after placing
      }
    }
  }

  private handleRightClick(p: Vec2) {
    if (p.x >= this.map.gameWidth) return;
    for (const e of this.enemies) {
      if (Math.hypot(e.pos.x - p.x, e.pos.y - p.y) < e.def.size + 4) {
        this.modal.showEnemy(e); return;
      }
    }
    const cell = this.px2grid(p);
    const here = this.towersAt(cell.x, cell.y);
    if (here.length > 0) this.modal.showTower(here[0], this.player.stats, this.talentTree);
  }

  // ─── Placement context getter ─────────────────────────────────────────────────
  private get placementCtx() {
    return {
      towers: this.towers,
      gold: this.gold,
      map: this.map,
      player: this.player,
      items: this.items,
      selectedTowerType: this.selectedTowerType,
      addFT: this.addFT.bind(this),
    };
  }

  // Sync ctx changes back (gold/towers can be replaced by service)
  private syncFromCtx(ctx: PlacementContext) {
    this.towers = ctx.towers;
    this.gold   = ctx.gold;
  }

  // ─── Tower helpers ───────────────────────────────────────────────────────────
  towersAt(col: number, row: number): Tower[] {
    return this.placement.towersAt(this.placementCtx, col, row);
  }

  towerCost(typeId: string): number {
    return this.placement.towerCost(this.placementCtx, typeId);
  }

  towerUpgradeCost(tower?: Tower): number {
    return this.placement.towerUpgradeCost(this.placementCtx, tower);
  }

  private placeTower(col: number, row: number) {
    const ctx = this.placementCtx;
    this.placement.place(ctx, col, row);
    this.syncFromCtx(ctx);
  }

  private sellTower(tower: Tower) {
    const ctx = this.placementCtx;
    this.placement.sell(ctx, tower);
    this.syncFromCtx(ctx);
  }

  private doMoveTower(tower: Tower, col: number, row: number) {
    const ctx = this.placementCtx;
    this.placement.move(ctx, tower, col, row);
    this.syncFromCtx(ctx);
  }

  expandMap() {
    const nextTier = this.currentMapTier + 1;
    if (nextTier >= 4) return;
    const cost = Math.round(MAP_EXPAND_COST * (1 - this.itemSystem.getDiscount(this.items)));
=======
  expandMap(): void {
    const nextTier = this.currentMapTier + 1;
    if (nextTier >= GameConfig.get().map.tiers.length) return;
    const cost = Math.round(
      GameConfig.get().map.expandCost * (1 - this.itemSystem.getDiscount(this.items)),
    );
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07
    if (this.gold < cost) return;
    this.gold -= cost;
    this.gameFlow.doExpandMap(this, nextTier);
  }

<<<<<<< HEAD
  private doExpandMap(tier: number) {
    const newSeed = (this.currentMapSeed * 1103515245 + 12345) & 0xffffff;
    this.map = extendMap(this.map, newSeed, tier);
    this.currentMapTier = tier;
    this.currentMapSeed = newSeed;
    this.renderer.updateMap(this.map);
    this.addFT(
      { x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 },
      `🗺 Mapa expandido! Tier ${tier + 1}`, '#aaffaa',
    );
  }

  private upgradeTower(tower: Tower) {
    const ctx = this.placementCtx;
    this.placement.upgrade(ctx, tower);
  }

  // ─── Fusion System ──────────────────────────────────────────────────────────
  canFuse(col: number, row: number): boolean {
    return this.placement.canFuse(this.placementCtx, col, row);
  }

  fuseTowers(col: number, row: number) {
    const ctx = this.placementCtx;
    this.placement.fuse(ctx, col, row);
    this.syncFromCtx(ctx);
  }



  // ─── Map helpers ─────────────────────────────────────────────────────────────
  private regenerateMap(tier: number, seed: number) {
    this.currentMapTier = tier;
    this.currentMapSeed = seed;
    this.map = generateMap(seed, tier);
    this.renderer.updateMap(this.map);
    // Remove towers that landed on the new path
    this.towers = this.towers.filter(t => !this.map.pathCells.has(`${t.gridX},${t.gridY}`));
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  private initState() {
    this.gold  = INITIAL_GOLD; this.lives = BASE_LIVES; this.score = 0;
    this.towers = []; this.enemies = []; this.projectiles = [];
    this.floatingTexts = []; this.puddles = []; this.burnZones = [];
    this.items = []; this.itemDropAnim = null; this.lastItemWave = 0;
    this.cataclysmTimer = 0; this.titanShieldCharges = 0; this.titanShieldWaves = 0; this._lastTronoWave = 0;
    this.talentTree  = new TalentTree();
    this.waveManager = new WaveManager();
    this.upgradePopup = null; this.paused = false; this.autoWave = false;
    this.movingTower = null;
    this.selectedTowerType = '';
    resetTowerIds(); resetProjectileIds();
  }

  startNewGame(affinity: ElementType, archetypeId: string) {
    this.player = new Player();
    this.player.affinity = affinity;
    this.player.applyArchetype(archetypeId);
    this.initState();
    const seed = Date.now() & 0xffffff;
    this.regenerateMap(0, seed);
    this.screen = 'game';
  }

  private loadGameFromSave() {
    const data = loadGame();
    if (!data) return;
    this.initState();
    this.player = new Player();
    this.player.fromJSON(data.player);
    this.talentTree.loadFromIds(data.player.purchasedTalents);
    this.player.talentPoints = data.player.talentPoints;
    this.gold  = data.game.gold;
    this.lives = data.game.lives;
    this.score = data.game.score;
    this.waveManager.currentWave = data.game.wave;

    const tier = MAP_TIER_AT(data.game.wave);
    this.regenerateMap(tier, data.game.mapSeed ?? 1);

    for (const t of data.game.towers) {
      const def = towerRegistry.has(t.typeId) ? towerRegistry.getDef(t.typeId) : null;
      if (!def) continue;
      let fusionDef: import('../types').FusionDef | undefined;
      if (t.fusionId) {
        const [pe, se] = t.fusionId.split('+');
        fusionDef = fusionRegistry.getDef(pe, se) ?? undefined;
      }
      const tower = createTower(def, t.gridX, t.gridY, t.slotIndex as 0|1, fusionDef);
      tower.damageMult    = t.damageMult;
      tower.speedMult     = t.speedMult;
      tower.dualMagic     = t.dualMagic;
      tower.upgradeCount  = t.upgradeCount ?? 0;
      tower.upgradeHistory = t.upgradeHistory ?? [];
      tower.placedCost    = t.placedCost ?? def.baseCost;
      tower.goldSpent     = t.goldSpent  ?? def.baseCost;
      tower.isSecondary   = t.isSecondary ?? (t.slotIndex === 1);
      this.towers.push(tower);
    }
    // Normalize cell slots after loading (guards against stale save state)
    const loadedCtx = this.placementCtx;
    const loadedCells = new Set(this.towers.map(t => `${t.gridX},${t.gridY}`));
    for (const key of loadedCells) {
      const [c, r] = key.split(',').map(Number);
      this.placement.normalizeCell(loadedCtx, c, r);
    }
    this.syncFromCtx(loadedCtx);

    // Restore items
    if (data.game.items) {
      this.items = data.game.items.map(i => ({ defId: i.defId, stacks: i.stacks }));
    }
    this.lastItemWave = Math.floor(data.game.wave / 10) * 10;

    this.screen = 'game';
  }

  saveCurrentGame() {
    saveGame({
      version: 1,
      player: { ...this.player.toJSON(), purchasedTalents: this.talentTree.getPurchasedIds() },
      game: {
        gold: this.gold, lives: this.lives,
        wave: this.waveManager.currentWave, score: this.score,
        mapSeed: this.currentMapSeed,
        items: this.items.map(i => ({ defId: i.defId, stacks: i.stacks })),
        towers: this.towers.map(t => ({
          typeId: t.def.id, gridX: t.gridX, gridY: t.gridY,
          slotIndex: t.slotIndex, damageMult: t.damageMult,
          speedMult: t.speedMult, upgradeCount: t.upgradeCount,
          upgradeHistory: t.upgradeHistory, dualMagic: t.dualMagic,
          placedCost: t.placedCost, goldSpent: t.goldSpent,
          isSecondary: t.isSecondary,
          fusionId: t.fusionDef?.id,
        })),
      },
      timestamp: Date.now(),
    });
=======
  // ─── Delegates for Renderer ─────────────────────────────────────────────────

  towersAt(col: number, row: number): Tower[] {
    return this.towerPlacement.towersAt(this.towers, col, row) as Tower[];
  }

  towerCost(typeId: string): number {
    return this.towerPlacement.towerCost(typeId, this.towers, this.items);
  }

  towerUpgradeCost(tower?: Tower): number {
    return this.towerPlacement.towerUpgradeCost(tower, this.items);
>>>>>>> 1c469a1146d67af2f97adc4a135ac76ed0d4bc07
  }

  // ─── Loop ────────────────────────────────────────────────────────────────────

  start() { this.lastTime = performance.now(); requestAnimationFrame(this.loop); }

  private loop = (now: number) => {
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if (this.screen === 'game' && !this.paused) {
      const dt = rawDt * this.gameSpeed;
      this.update(dt);
    }
    this.render();
    requestAnimationFrame(this.loop);
  };

  // ─── Update ─────────────────────────────────────────────────────────────────

  private update(dt: number) {
    this.rewardSystem.processWaveCompletion(this);

    if (this.autoWave && this.waveManager.betweenWaves && !this.waveManager.waveActive) {
      this.waveManager.startWave();
    }

    if (this.waveManager.waveActive && this.waveManager.currentWave !== this.itemState.lastTronoWave) {
      this.itemState.lastTronoWave = this.waveManager.currentWave;
      this.itemSystem.processWaveStart(this);
    }

    const expectedTier = MAP_TIER_AT(this.waveManager.currentWave);
    if (expectedTier > this.currentMapTier && this.waveManager.betweenWaves) {
      this.gameFlow.doExpandMap(this, expectedTier);
    }

    const newEnemies = this.waveManager.update(dt, this.enemies, this.map.waypoints, this.map.totalLength);
    this.itemSystem.applySlowAura(this, newEnemies);
    this.enemies.push(...newEnemies);

    if (this.rewardSystem.processEndOfPath(this)) return;

    this.effectSystem.update(this, dt);
    this.bossSystem.update(this, dt);
    this.combatSystem.update(this, dt);
    this.rewardSystem.processKills(this);
    this.animations.update(dt);

    for (const f of this.floatingTexts) { f.y -= 40 * dt; f.life -= dt; }
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);

    if (this.itemDropAnim) {
      this.itemDropAnim.timer += dt;
      const t = this.itemDropAnim.timer;
      if (t < 0.6) this.itemDropAnim.phase = 'rising';
      else if (t < 2.0) this.itemDropAnim.phase = 'showing';
      else this.itemDropAnim.phase = 'fading';
      if (t >= this.itemDropAnim.totalTime) this.itemDropAnim = null;
    }
  }

  addFT(pos: Vec2, text: string, color: string) {
    this.floatingTexts.push({
      x: pos.x + (Math.random() - 0.5) * 18, y: pos.y - 20,
      text, color, life: 1.2, maxLife: 1.2,
    });
  }

  triggerAoeFlash(x: number, y: number, radius: number) {
    this.renderer.triggerAoe(x, y, radius);
  }

  requestScreen(to: import('../types').GameScreen): void {
    this.screen = to;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  private render() {
    this.renderer.setMousePos(this.mousePos);
    this.renderer.render({
      screen: this.screen,
      paused: this.paused,
      autoWave: this.autoWave,
      game: {
        towers: this.towers,
        enemies: this.enemies,
        projectiles: this.projectiles,
        floatingTexts: this.floatingTexts,
        puddles: this.puddles,
        gold: this.gold, lives: this.lives, score: this.score,
        selectedTowerType: this.selectedTowerType,
        hoveredCell: this.hoveredCell,
        waveManager: this.waveManager,
        upgradePopup: this.upgradePopup,
        movingTower: this.movingTower,
        currentMapTier: this.currentMapTier,
        items: this.items,
        itemDropAnim: this.itemDropAnim,
        canFuse: this.upgradePopup
          ? this.towerInteraction.canFuse(this.towers, this.upgradePopup.col, this.upgradePopup.row)
          : false,
      },
      player: this.player,
      talentTree: this.talentTree,
      towersAt: (c, r) => this.towersAt(c, r),
      towerCost: (id) => this.towerCost(id),
      towerUpgradeCost: (t) => this.towerUpgradeCost(t),
      getSynergyBonus: (t) => this.combatSystem.getSynergyBonus(t, this),
      gameSpeed: this.gameSpeed,
      debugMode: this.debugMode,
      pendingAffinity: this.pendingAffinity,
      mousePos: this.mousePos,
    });
  }

  // ─── Debug Commands ─────────────────────────────────────────────────────────

  handleDebugClick(cmd: string) {
    if (!this.debugMode) return;
    switch (cmd) {
      case 'gold_1000':  this.gold += 1000; break;
      case 'gold_10000': this.gold += 10000; break;
      case 'levelup': {
        if (this.player.level < 50) {
          this.player.xp = 0;
          this.player.level++;
          if (this.player.level % 10 === 0) this.player.talentPoints++;
          this.screen = 'levelup';
        }
        break;
      }
      case 'levelup10': {
        for (let i = 0; i < 10 && this.player.level < 50; i++) {
          this.player.level++;
          if (this.player.level % 10 === 0) this.player.talentPoints++;
          const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
            ['strength','intelligence','dexterity','agility','luck','vitality'];
          this.player.stats[keys[Math.floor(Math.random() * keys.length)]]++;
        }
        this.player.xp = 0;
        break;
      }
      case 'maxlevel': {
        while (this.player.level < 50) {
          this.player.level++;
          if (this.player.level % 10 === 0) this.player.talentPoints++;
          const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
            ['strength','intelligence','dexterity','agility','luck','vitality'];
          this.player.stats[keys[Math.floor(Math.random() * keys.length)]]++;
        }
        this.player.xp = 0;
        break;
      }
      case 'heal':       this.lives = BASE_LIVES; break;
      case 'kill_all': {
        for (const e of this.enemies) {
          if (!e.dead) {
            e.dead = true;
            this.waveManager.enemiesKilledThisWave++;
            const rewardM = 1 + (this.waveManager.currentWave - 1) * GameConfig.get().economy.rewardScalePerWave;
            const g = Math.round(e.def.reward * rewardM * this.player.goldMultiplier()) + this.itemSystem.getGoldBonus(this.items);
            this.gold += g; this.score += g;
          }
        }
        this.enemies = [];
        break;
      }
      case 'skip_wave': {
        for (const e of this.enemies) e.dead = true;
        this.enemies = [];
        this.waveManager.spawnQueues = [];
        this.waveManager.waveActive = false;
        this.waveManager.waveComplete = true;
        this.waveManager.betweenWaves = true;
        break;
      }
      case 'skip10': {
        for (let i = 0; i < 10; i++) this.waveManager.currentWave++;
        this.waveManager.waveActive = false;
        this.waveManager.waveComplete = true;
        this.waveManager.betweenWaves = true;
        this.enemies = [];
        break;
      }
      case 'give_item':  this.itemSystem.rollItemDrop(this); break;
      case 'max_towers': {
        for (const t of this.towers) {
          while (!t.isMaxLevel) {
            const stat: 'damage'|'speed' = Math.random() < 0.5 ? 'damage' : 'speed';
            if (stat === 'damage') t.damageMult += 0.1;
            else t.speedMult += 0.1;
            t.upgradeCount++;
            t.upgradeHistory.push(stat);
          }
        }
        break;
      }
      case 'god_mode':   this.lives = 9999; break;
    }
  }
}