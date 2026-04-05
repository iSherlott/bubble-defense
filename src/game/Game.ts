import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim, UpgradePopup } from '../types';
import { CELL_SIZE, BASE_LIVES, INITIAL_GOLD, MAP_TIER_AT } from '../constants';
import { SingleTower as Tower } from '../entities/towers/SingleTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import { Player } from '../player/Player';
import { SkillTree as TalentTree } from '../player/SkillTree';
import { WaveManager } from '../systems/WaveManager';
import { generateMap } from '../systems/MapGenerator';
import type { MapData } from '../systems/MapGenerator';
import { Renderer } from '../ui/Renderer';
import { Modal } from '../ui/Modal';
import type { IGameContext, FloatingText, BurnZone } from '../core/GameContext';
import { ItemSystem } from '../systems/ItemSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectSystem } from '../systems/EffectSystem';
import { EnemyBehaviorSystem } from '../systems/EnemyBehaviorSystem';
import { RewardSystem } from '../systems/RewardSystem';
import { AnimationSystem } from '../systems/AnimationSystem';
import { StateStore } from '../state/StateStore';

// ── Extracted Services ────────────────────────────────────────────────────────
import { TowerService } from '../services/TowerService';
import { GameInputController } from './GameInputController';
import { GameFlowController } from './GameFlowController';
import { DebugService } from '../services/DebugService';

export class Game implements IGameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  screen: GameScreen = 'menu';
  paused = false;
  autoWave = false;
  gameSpeed: 1 | 2 | 4 = 1;
  debugMode = false;
  pendingAffinity: ElementType = 'fire';
  /** Tracks which screen to return to when closing the bestiary */
  bestiaryReturnScreen: GameScreen = 'game';

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
  readonly enemyBehaviors: EnemyBehaviorSystem;
  readonly rewardSystem: RewardSystem;
  readonly animations: AnimationSystem;

  // Extracted services
  readonly towerService: TowerService;
  readonly gameFlow: GameFlowController;
  readonly debugService: DebugService;
  private readonly inputController: GameInputController;

  // Map state (public for GameFlowController)
  currentMapSeed = 1;
  currentMapTier = 0;

  /** Cell size for coordinate conversion */
  readonly cellSize = CELL_SIZE;

  /** Central state store — exposes typed slice managers and the screen FSM. */
  readonly store!: StateStore;

  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Core systems
    this.itemSystem = new ItemSystem();
    this.combatSystem = new CombatSystem(this.itemSystem);
    this.effectSystem = new EffectSystem();
    this.enemyBehaviors = new EnemyBehaviorSystem();
    this.rewardSystem = new RewardSystem(this.itemSystem);
    this.animations = new AnimationSystem();

    // Extracted services
    this.towerService = new TowerService(this.itemSystem);
    this.gameFlow = new GameFlowController();
    this.debugService = new DebugService(this.itemSystem);
    this.inputController = new GameInputController(this);

    // Default map
    this.map = generateMap(1, 0);
    this.renderer = new Renderer(canvas, this.ctx, this.map);
    this.modal = new Modal();

    // State store — wired after player/talentTree/waveManager exist
    (this as { store: StateStore }).store = new StateStore(this.map);
    this.store.wire(this.player, this.talentTree, this.waveManager, () => this.gameFlow.hasSaveAvailable());
    this.store.animations = this.animations;
    this.store.setAoeFlashHandler((x, y, r) => this.animations.request({ id: 'aoe_flash', sourceX: x, sourceY: y, radius: r }));

    this.inputController.setup();
  }

  // ─── Public delegates for services / input controller ───────────────────────

  selectArchetype(id: string): void { this.gameFlow.selectArchetype(this, id, this.pendingAffinity); }

  startNewGameFromBonus(): void { this.gameFlow.startNewGameFromBonus(this); }
  startNewGame(affinity: ElementType, archetypeId: string): void { this.gameFlow.startNewGame(this, affinity, archetypeId); }
  loadGameFromSave(): void { this.gameFlow.loadGameFromSave(this); }
  hasSaveAvailable(): boolean { return this.gameFlow.hasSaveAvailable(); }
  saveCurrentGame(): void { this.gameFlow.saveCurrentGame(this); }
  expandMap(): void { this.gameFlow.expandMap(this); }


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
    this.enemyBehaviors.update(this, dt);
    this.combatSystem.update(this, dt);
    this.rewardSystem.processKills(this);
    this.animations.update(dt);
    this.itemSystem.updateItemDropAnim(this, dt);
  }

  addFT(pos: Vec2, text: string, color: string) {
    this.floatingTexts.push({
      x: pos.x + (Math.random() - 0.5) * 18, y: pos.y - 20,
      text, color, life: 1.2, maxLife: 1.2,
    });
  }

  triggerAoeFlash(x: number, y: number, radius: number) {
    this.animations.request({ id: 'aoe_flash', sourceX: x, sourceY: y, radius });
  }

  requestScreen(to: import('../types').GameScreen): void {
    this.screen = to;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  private render() {
    this.renderer.setMousePos(this.mousePos);

    const wm = this.waveManager;
    const boss = wm.isBossWave && wm.waveActive
      ? this.enemies.find(e => e.def.isBoss && !e.dead) ?? null
      : null;

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
          ? this.towerService.canFuse(this.towers, this.upgradePopup.col, this.upgradePopup.row)
          : false,
        animationInstances: this.animations.getActive(),
        mapExpandCost: this.towerService.getMapExpandCost(this.items),
        canExpandMap: this.currentMapTier < 3
          && wm.betweenWaves
          && this.gold >= this.towerService.getMapExpandCost(this.items),
        bossBarState: boss
          ? { active: true as const, hp: boss.hp, maxHp: boss.maxHp, ratio: boss.hp / boss.maxHp }
          : { active: false as const },
      },
      player: this.player,
      talentTree: this.talentTree,
      towersAt: (c, r) => this.towerService.towersAt(this.towers, c, r) as Tower[],
      isCellFull: (c, r) => this.towerService.isCellFull(this.towers, c, r),
      towerCost: (id) => this.towerService.towerCost(id, this.towers, this.items),
      towerUpgradeCost: (t) => this.towerService.towerUpgradeCost(t, this.items),
      getSynergyBonus: (t) => this.combatSystem.getSynergyBonus(t, this),
      getMoveCost: (towers) => this.towerService.getMoveCost(towers),
      getSellRefund: (t) => this.towerService.getSellRefund(t),
      gameSpeed: this.gameSpeed,
      debugMode: this.debugMode,
      pendingAffinity: this.pendingAffinity,
      mousePos: this.mousePos,
      bestiaryReturnScreen: this.bestiaryReturnScreen,
    });
  }

  // ─── Debug ───────────────────────────────────────────────────────────────────

  handleDebugClick(cmd: string) {
    if (!this.debugMode) return;
    this.debugService.execute(this, cmd);
  }
}