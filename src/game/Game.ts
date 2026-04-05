import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim } from '../types';
import { CELL_SIZE, BASE_LIVES, INITIAL_GOLD, MAP_TIER_AT } from '../constants';
import { GameConfig } from '../config';
import { Tower } from '../entities/Tower';
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
import { AnimationSystem } from '../systems/AnimationSystem';
import { StateStore } from '../state/StateStore';
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

  /** Central state store — exposes typed slice managers and the screen FSM. */
  readonly store!: StateStore;

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
    this.animations = new AnimationSystem();

    // Extracted services
    this.towerPlacement = new TowerPlacementService(this.itemSystem);
    this.towerInteraction = new TowerInteractionService();
    this.gameFlow = new GameFlowController(this.itemSystem);
    this.inputController = new GameInputController(this);

    // Default map
    this.map = generateMap(1, 0);
    this.renderer = new Renderer(canvas, this.ctx, this.map);
    this.modal = new Modal();

    // State store — wired after player/talentTree/waveManager exist
    (this as { store: StateStore }).store = new StateStore(this.map);
    this.store.wire(this.player, this.talentTree, this.waveManager, () => this.gameFlow.hasSaveAvailable());
    this.store.setAoeFlashHandler((x, y, r) => this.renderer.triggerAoe(x, y, r));

    this.inputController.setup();
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

  expandMap(): void {
    const nextTier = this.currentMapTier + 1;
    if (nextTier >= GameConfig.get().map.tiers.length) return;
    const cost = Math.round(
      GameConfig.get().map.expandCost * (1 - this.itemSystem.getDiscount(this.items)),
    );
    if (this.gold < cost) return;
    this.gold -= cost;
    this.gameFlow.doExpandMap(this, nextTier);
  }

  // ─── Delegates for Renderer ─────────────────────────────────────────────────

  towersAt(col: number, row: number): Tower[] {
    return this.towerPlacement.towersAt(this.towers, col, row) as Tower[];
  }

  towerCost(typeId: string): number {
    return this.towerPlacement.towerCost(typeId, this.towers, this.items);
  }

  towerUpgradeCost(tower?: Tower): number {
    return this.towerPlacement.towerUpgradeCost(tower, this.items);
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