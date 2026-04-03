import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim } from '../types';
import { CELL_SIZE,
  BASE_LIVES, INITIAL_GOLD,
  UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS,
  MAP_TIER_AT, MAP_EXPAND_COST } from '../constants';
import { GameConfig } from '../config';
import { Tower, createTower, resetTowerIds, FusionTower } from '../entities/Tower';
import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import { resetProjectileIds } from '../entities/Projectile';
import { Player } from '../player/Player';
import { SkillTree as TalentTree } from '../player/SkillTree';
import { WaveManager } from './WaveManager';
import { generateMap, extendMap } from './MapGenerator';
import type { MapData } from './MapGenerator';
import { saveGame, loadGame, hasSave } from './SaveSystem';
import { Renderer } from '../ui/Renderer';
import { Modal } from '../ui/Modal';
import type { IGameContext, FloatingText, BurnZone } from '../core/GameContext';
import { towerRegistry, fusionRegistry } from '../registries';
import { ItemSystem } from '../systems/ItemSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectSystem } from '../systems/EffectSystem';
import { BossSystem } from '../systems/BossSystem';
import { RewardSystem } from '../systems/RewardSystem';
import { registerAllContent } from '../content/registerAll';

export interface UpgradePopup { col: number; row: number; }

export class Game implements IGameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  screen: GameScreen = 'menu';
  paused = false;
  autoWave = false;   // automatically start next wave
  gameSpeed: 1 | 2 = 1;
  debugMode = false;
  pendingAffinity: ElementType = 'fire';  // stored between affinity→archetype screens

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

  selectedTowerType = '';      // '' = nothing selected
  hoveredCell: Vec2 | null = null;
  mousePos: Vec2 = { x: 0, y: 0 };
  upgradePopup: UpgradePopup | null = null;
  movingTower: Tower | null = null;

  // Item system state (public for IGameContext)
  items: OwnedItem[] = [];
  itemDropAnim: ItemDropAnim | null = null;
  lastItemWave = 0;
  cataclysmTimer = 0;
  titanShieldCharges = 0;
  titanShieldWaves = 0;
  _lastTronoWave = 0;

  // Systems
  readonly itemSystem: ItemSystem;
  readonly combatSystem: CombatSystem;
  readonly effectSystem: EffectSystem;
  readonly bossSystem: BossSystem;
  readonly rewardSystem: RewardSystem;

  private lastTime = 0;
  private currentMapSeed = 1;
  private currentMapTier = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Register all content (towers, enemies, fusions, items) into registries
    registerAllContent();

    // Create systems
    this.itemSystem = new ItemSystem();
    this.combatSystem = new CombatSystem(this.itemSystem);
    this.effectSystem = new EffectSystem();
    this.bossSystem = new BossSystem();
    this.rewardSystem = new RewardSystem(this.itemSystem);

    // Default map so renderer never crashes before game start
    this.map = generateMap(1, 0);
    this.renderer = new Renderer(canvas, this.ctx, this.map);
    this.modal = new Modal();
    this.setupInput();
  }

  // ─── Input ──────────────────────────────────────────────────────────────────
  private setupInput() {
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('click',     e => this.onClick(e));
    this.canvas.addEventListener('contextmenu', e => { e.preventDefault(); this.onRightClick(e); });
    window.addEventListener('keydown', e => this.onKeyDown(e));
  }

  private cvPos(e: MouseEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width  / r.width),
      y: (e.clientY - r.top)  * (this.canvas.height / r.height),
    };
  }

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
          const cost = this.towerCost(def.id) * 2;
          if (this.gold >= cost) {
            this.gold -= cost;
            const t = createTower(def, this.upgradePopup.col, this.upgradePopup.row, 1);
            t.placedCost = cost;
            t.goldSpent  = cost;
            t.isSecondary = true;
            this.towers.push(t);
          }
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
        this.placeTower(cell.x, cell.y, 0);
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

  // ─── Tower helpers ───────────────────────────────────────────────────────────
  towersAt(col: number, row: number): Tower[] {
    return this.towers.filter(t => t.gridX === col && t.gridY === row);
  }

  /** Cost = baseCost × (count of that type already placed + 1), minus item discount */
  towerCost(typeId: string): number {
    const count = this.towers.filter(t => t.def.id === typeId).length;
    const def = towerRegistry.getDef(typeId);
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(this.items))));
  }

  /** Per-tower upgrade cost: baseCost × (1 + upgradeCount × 0.3), minus item discount */
  towerUpgradeCost(tower?: Tower): number {
    if (!tower) return 50; // fallback
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.2));
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(this.items))));
  }

  private placeTower(col: number, row: number, slot: 0 | 1) {
    const { cols, rows, pathCells } = this.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    if (pathCells.has(`${col},${row}`)) return;
    if (!this.selectedTowerType) return;
    if (!towerRegistry.has(this.selectedTowerType)) return;
    const def = towerRegistry.getDef(this.selectedTowerType);
    const cost = this.towerCost(def.id);
    if (this.gold < cost) return;
    this.gold -= cost;
    const t = createTower(def, col, row, slot);
    t.placedCost = cost;
    t.goldSpent  = cost;
    this.towers.push(t);
  }

  private sellTower(tower: Tower) {
    const refund = Math.floor(tower.goldSpent / 2);
    this.gold += refund;
    this.addFT({ x: tower.pixelX, y: tower.pixelY }, `+${refund}g 🏷`, '#ffdd44');
    this.towers = this.towers.filter(t => t.id !== tower.id);
  }

  private doMoveTower(tower: Tower, col: number, row: number) {
    const { cols, rows, pathCells } = this.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    if (pathCells.has(`${col},${row}`)) return;
    const sameCell = col === tower.gridX && row === tower.gridY;
    if (sameCell) return;

    // Collect all towers on the source cell (primary + secondary)
    const cellTowers = this.towersAt(tower.gridX, tower.gridY);
    const destTowers = this.towersAt(col, row);

    // Cannot move if destination already has towers
    if (destTowers.length > 0) {
      this.addFT({ x: tower.pixelX, y: tower.pixelY }, 'Célula ocupada', '#ff6666');
      return;
    }

    // Total move cost: sum of each tower's move cost
    let totalMoveCost = 0;
    for (const t of cellTowers) {
      totalMoveCost += Math.round(t.placedCost * GameConfig.get().movement.moveCostMult);
    }
    if (this.gold < totalMoveCost) {
      this.addFT({ x: tower.pixelX, y: tower.pixelY }, `Sem ouro (${totalMoveCost}g)`, '#ff6666');
      return;
    }
    this.gold -= totalMoveCost;

    // Move all towers in-place, preserving id, cooldown, magicBar, etc.
    for (const t of cellTowers) {
      t.moveTo(col, row, t.slotIndex);
    }
    this.addFT({ x: cellTowers[0].pixelX, y: cellTowers[0].pixelY }, `Movido (-${totalMoveCost}g)`, '#aaccff');
  }

  expandMap() {
    const nextTier = this.currentMapTier + 1;
    if (nextTier >= 4) return;  // already max tier
    const cost = Math.round(MAP_EXPAND_COST * (1 - this.itemSystem.getDiscount(this.items)));
    if (this.gold < cost) return;
    this.gold -= cost;
    this.doExpandMap(nextTier);
  }

  private doExpandMap(tier: number) {
    const newSeed = (this.currentMapSeed * 1103515245 + 12345) & 0xffffff;
    this.map = extendMap(this.map, newSeed, tier);
    this.currentMapTier = tier;
    this.currentMapSeed = newSeed;
    this.renderer.updateMap(this.map);
    this.addFT(
      { x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 },
      `🗺 Mapa expandido! Tier ${tier + 1}`, '#aaffaa'
    );
  }

  private upgradeTower(tower: Tower) {
    if (tower.isMaxLevel) return;
    const stat: 'damage'|'speed' = Math.random() < 0.5 ? 'damage' : 'speed';
    if (stat === 'damage') tower.damageMult += UPGRADE_MULT_STEP;
    else                   tower.speedMult  += UPGRADE_MULT_STEP;
    tower.upgradeCount++;
    tower.upgradeHistory.push(stat);

    const statLabel = stat === 'damage' ? '⚔ Dano' : '⚡ Vel';
    const lvlMsg = tower.isMaxLevel ? `★ Nível MÁX!` : `Nível ${tower.level}`;
    this.addFT({ x: tower.pixelX, y: tower.pixelY - 24 }, `${lvlMsg} +${statLabel}`, stat === 'damage' ? '#ff8888' : '#88ccff');

    if (!tower.dualMagic) {
      const chance = DUAL_MAGIC_BASE_CHANCE + this.player.stats.luck * DUAL_MAGIC_LUCK_BONUS;
      if (Math.random() < chance) {
        tower.dualMagic = true;
        this.addFT({ x: tower.pixelX, y: tower.pixelY - 30 }, '✨ DUAL MAGIA!', '#ffff44');
      }
    }
  }

  // ─── Fusion System ──────────────────────────────────────────────────────────
  /** Check if a cell with 2 max-level towers can fuse */
  canFuse(col: number, row: number): boolean {
    const here = this.towersAt(col, row);
    if (here.length !== 2) return false;
    const primary = here.find(t => !t.isSecondary);
    const secondary = here.find(t => t.isSecondary);
    if (!primary || !secondary) return false;
    if (!primary.isMaxLevel || !secondary.isMaxLevel) return false;
    if (primary.fusionDef) return false; // already fused
    return fusionRegistry.has(primary.def.element, secondary.def.element);
  }

  /** Perform fusion on a cell */
  fuseTowers(col: number, row: number) {
    if (!this.canFuse(col, row)) return;
    const here = this.towersAt(col, row);
    const primary = here.find(t => !t.isSecondary)!;
    const secondary = here.find(t => t.isSecondary)!;
    const fusion = fusionRegistry.getDef(primary.def.element, secondary.def.element);
    if (!fusion) return;

    // Create a real FusionTower and transfer primary's upgrade state
    const ft = new FusionTower(primary.def, primary.gridX, primary.gridY, fusion);
    ft.damageMult     = primary.damageMult;
    ft.speedMult      = primary.speedMult;
    ft.upgradeCount   = primary.upgradeCount;
    ft.upgradeHistory = [...primary.upgradeHistory];
    ft.dualMagic      = primary.dualMagic;
    ft.placedCost     = primary.placedCost;
    ft.goldSpent      = primary.goldSpent + secondary.goldSpent;
    ft.totalDamageDealt = primary.totalDamageDealt + secondary.totalDamageDealt;
    ft.totalKills     = primary.totalKills + secondary.totalKills;
    ft.isSecondary    = false;

    // Replace both towers with the fused one
    this.towers = this.towers.filter(t => t.id !== primary.id && t.id !== secondary.id);
    this.towers.push(ft);

    this.addFT(
      { x: ft.pixelX, y: ft.pixelY - 30 },
      `${fusion.icon} FUSÃO: ${fusion.name}!`, fusion.color
    );
    this.addFT(
      { x: ft.pixelX, y: ft.pixelY - 50 },
      fusion.description, '#ddddff'
    );
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
    // Wave completion rewards (vitality regen, item drops, titan shield)
    this.rewardSystem.processWaveCompletion(this);

    // Auto-start wave
    if (this.autoWave && this.waveManager.betweenWaves && !this.waveManager.waveActive) {
      this.waveManager.startWave();
    }

    // Item wave-start hooks (e.g. Trono do Rei Goblin gold bonus)
    if (this.waveManager.waveActive && this.waveManager.currentWave !== this._lastTronoWave) {
      this._lastTronoWave = this.waveManager.currentWave;
      this.itemSystem.processWaveStart(this);
    }

    // Auto map tier upgrade every 10 waves
    const expectedTier = MAP_TIER_AT(this.waveManager.currentWave);
    if (expectedTier > this.currentMapTier && this.waveManager.betweenWaves) {
      this.doExpandMap(expectedTier);
    }

    // Spawn enemies
    const newEnemies = this.waveManager.update(dt, this.enemies, this.map.waypoints, this.map.totalLength);
    this.itemSystem.applySlowAura(this, newEnemies);
    this.enemies.push(...newEnemies);

    // Enemy end-of-path
    if (this.rewardSystem.processEndOfPath(this)) return; // game over

    // Environmental effects (puddles, burn zones, cataclysm)
    this.effectSystem.update(this, dt);

    // Boss abilities
    this.bossSystem.update(this, dt);

    // Tower combat (targeting, shooting, magic, projectiles, hit resolution)
    this.combatSystem.update(this, dt);

    // Collect kills and grant rewards
    this.rewardSystem.processKills(this);

    // Floating texts
    for (const f of this.floatingTexts) { f.y -= 40 * dt; f.life -= dt; }
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);

    // Item drop animation
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
        canFuse: this.upgradePopup ? this.canFuse(this.upgradePopup.col, this.upgradePopup.row) : false,
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
          // Auto-pick a random stat to avoid 10 level-up screens
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
      case 'skip_wave':  {
        // Kill all current enemies and force wave complete
        for (const e of this.enemies) e.dead = true;
        this.enemies = [];
        this.waveManager.spawnQueues = [];
        this.waveManager.waveActive = false;
        this.waveManager.waveComplete = true;
        this.waveManager.betweenWaves = true;
        break;
      }
      case 'skip10': {
        for (let i = 0; i < 10; i++) {
          this.waveManager.currentWave++;
        }
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
