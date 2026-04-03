import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle } from '../types';
import { TOWER_DEFS, CELL_SIZE, ELEMENT_COLORS,
  BASE_LIVES, INITIAL_GOLD, BASE_TOWER_COST,
  UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS,
  MAP_TIER_AT, MAX_TOWER_LEVEL, MAP_EXPAND_COST } from '../constants';
import {
  CFG_EARTH_AOE_RADIUS, CFG_PUDDLE_RADIUS, CFG_PUDDLE_DURATION,
  CFG_WIND_PUSH_CELLS, CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION,
  CFG_PUDDLE_SLOW_AMOUNT, CFG_WATER_PUDDLE_CHANCE,
  CFG_FIRE_GOLEM_REGEN_PER_DMG, CFG_WATER_GOLEM_PUDDLE_REGEN,
  CFG_EARTH_GOLEM_SHIELD_RADIUS,
} from '../settings';
import { Tower, resetTowerIds } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';
import { createProjectile, updateProjectile, resetProjectileIds } from '../entities/Projectile';
import { Player } from '../player/Player';
import { TalentTree } from '../player/TalentTree';
import { WaveManager } from './WaveManager';
import { generateMap, extendMap, positionOnPath } from './MapGenerator';
import type { MapData } from './MapGenerator';
import { saveGame, loadGame, hasSave } from './SaveSystem';
import { Renderer } from '../ui/Renderer';
import { Modal } from '../ui/Modal';

const EARTH_AOE_BASE = CFG_EARTH_AOE_RADIUS;
const PUDDLE_RADIUS  = CFG_PUDDLE_RADIUS;
const PUDDLE_DURATION = CFG_PUDDLE_DURATION;
const WIND_PUSH_PX   = CFG_WIND_PUSH_CELLS * CELL_SIZE;

interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

export interface UpgradePopup { col: number; row: number; }

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  screen: GameScreen = 'menu';
  paused = false;
  autoWave = false;   // automatically start next wave

  gold   = INITIAL_GOLD;
  lives  = BASE_LIVES;
  score  = 0;

  towers: Tower[] = [];
  enemies: Enemy[] = [];
  projectiles: ProjectileData[] = [];
  floatingTexts: FloatingText[] = [];
  puddles: Puddle[] = [];

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

  private lastTime = 0;
  private currentMapSeed = 1;
  private currentMapTier = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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
      case 'menu':     this.handleMenuClick(p); break;
      case 'affinity': this.handleAffinityClick(p); break;
      case 'game':     this.handleGameClick(p); break;
      case 'levelup':  this.handleLevelUpClick(p); break;
      case 'talent':   this.handleTalentClick(p); break;
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
      if (this.hit(p, r)) { this.startNewGame(el as ElementType); return; }
    }
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
        const t = this.talentTree.talents.find(t => t.id === id);
        if (t && this.talentTree.canPurchase(t, this.player.level, this.player.stats, this.player.talentPoints)) {
          this.talentTree.purchase(id);
          this.player.talentPoints -= t.cost;
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
          const upgCost = this.towerUpgradeCost();
          if (here[i] && this.gold >= upgCost && !here[i].isMaxLevel) {
            this.gold -= upgCost;
            here[i].goldSpent += upgCost;
            this.upgradeTower(here[i]);
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
      for (const def of TOWER_DEFS) {
        const k = `addSecond_${def.id}`;
        if (btns[k] && this.hit(p, btns[k])) {
          const cost = this.towerCost(def.id) * 2;
          if (this.gold >= cost) {
            this.gold -= cost;
            const t = new Tower(def, this.upgradePopup.col, this.upgradePopup.row, 1);
            t.placedCost = cost;
            t.goldSpent  = cost;
            t.isSecondary = true;
            this.towers.push(t);
          }
          this.upgradePopup = null; return;
        }
      }

      if (!this.hit(p, this.renderer.getUpgradePopupRect())) this.upgradePopup = null;
      return;
    }

    // ── Sidebar ──
    const ui = this.renderer.getGameUIRects();
    if (ui['pause']     && this.hit(p, ui['pause']))     { this.paused = !this.paused; return; }
    if (ui['nextWave']  && this.hit(p, ui['nextWave']))  {
      if (this.waveManager.betweenWaves) this.waveManager.startWave();
      return;
    }
    if (ui['autoWave']  && this.hit(p, ui['autoWave']))  { this.autoWave = !this.autoWave; return; }
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

  /** Cost = baseCost × (count of that type already placed + 1) */
  towerCost(typeId: string): number {
    const count = this.towers.filter(t => t.def.id === typeId).length;
    const def = TOWER_DEFS.find(d => d.id === typeId)!;
    return def.baseCost * (count + 1);
  }

  /** Dynamic upgrade cost: sum(baseCosts) × tier / 10 − max(0, 20-lives) */
  towerUpgradeCost(): number {
    const sumBase = this.towers.reduce((s, t) => s + t.def.baseCost, 0);
    const tier = this.currentMapTier + 1;
    const livesBonus = Math.max(0, BASE_LIVES - this.lives);
    return Math.max(50, Math.round(sumBase * tier / 10) - livesBonus);
  }

  private placeTower(col: number, row: number, slot: 0 | 1) {
    const { cols, rows, pathCells } = this.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    if (pathCells.has(`${col},${row}`)) return;
    if (!this.selectedTowerType) return;
    const def = TOWER_DEFS.find(d => d.id === this.selectedTowerType);
    if (!def) return;
    const cost = this.towerCost(def.id);
    if (this.gold < cost) return;
    this.gold -= cost;
    const t = new Tower(def, col, row, slot);
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
    const here = this.towersAt(col, row);
    const sameCell = col === tower.gridX && row === tower.gridY;
    const maxSlot = tower.slotIndex === 1 ? 0 : 1;  // same-cell slot check
    if (!sameCell && here.length >= 2) return;
    const moveCost = tower.placedCost * 2;
    if (this.gold < moveCost) {
      this.addFT({ x: tower.pixelX, y: tower.pixelY }, `Sem ouro (${moveCost}g)`, '#ff6666');
      return;
    }
    this.gold -= moveCost;
    // Rebuild tower at new position (same slot)
    const newTower = new Tower(tower.def, col, row, tower.slotIndex);
    newTower.damageMult    = tower.damageMult;
    newTower.speedMult     = tower.speedMult;
    newTower.upgradeCount  = tower.upgradeCount;
    newTower.upgradeHistory = tower.upgradeHistory;
    newTower.dualMagic     = tower.dualMagic;
    newTower.placedCost    = tower.placedCost;
    newTower.goldSpent     = tower.goldSpent;
    newTower.isSecondary   = tower.isSecondary;
    newTower.totalDamageDealt = tower.totalDamageDealt;
    newTower.totalKills    = tower.totalKills;
    this.towers = this.towers.filter(t => t.id !== tower.id);
    this.towers.push(newTower);
    this.addFT({ x: newTower.pixelX, y: newTower.pixelY }, `Movido (-${moveCost}g)`, '#aaccff');
  }

  expandMap() {
    const nextTier = this.currentMapTier + 1;
    if (nextTier >= 4) return;  // already max tier
    if (this.gold < MAP_EXPAND_COST) return;
    this.gold -= MAP_EXPAND_COST;
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
    this.floatingTexts = []; this.puddles = [];
    this.talentTree  = new TalentTree();
    this.waveManager = new WaveManager();
    this.upgradePopup = null; this.paused = false; this.autoWave = false;
    this.movingTower = null;
    this.selectedTowerType = '';
    resetTowerIds(); resetProjectileIds();
  }

  startNewGame(affinity: ElementType) {
    this.player = new Player();
    this.player.affinity = affinity;
    this.player.generateStartingStats();
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
      const def = TOWER_DEFS.find(d => d.id === t.typeId);
      if (!def) continue;
      const tower = new Tower(def, t.gridX, t.gridY, t.slotIndex as 0|1);
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
        towers: this.towers.map(t => ({
          typeId: t.def.id, gridX: t.gridX, gridY: t.gridY,
          slotIndex: t.slotIndex, damageMult: t.damageMult,
          speedMult: t.speedMult, upgradeCount: t.upgradeCount,
          upgradeHistory: t.upgradeHistory, dualMagic: t.dualMagic,
          placedCost: t.placedCost, goldSpent: t.goldSpent,
          isSecondary: t.isSecondary,
        })),
      },
      timestamp: Date.now(),
    });
  }

  // ─── Loop ────────────────────────────────────────────────────────────────────
  start() { this.lastTime = performance.now(); requestAnimationFrame(this.loop); }

  private loop = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if (this.screen === 'game' && !this.paused) this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  // ─── Update ─────────────────────────────────────────────────────────────────
  private update(dt: number) {
    const { waypoints, totalLength, pathCells, gameWidth, gameHeight } = this.map;

    // Wave just completed → vitality life regen
    if (this.waveManager.waveComplete) {
      this.waveManager.waveComplete = false;  // consume the flag
      const regen = Math.floor(this.player.stats.vitality * 0.1);
      if (regen > 0) {
        this.lives = Math.min(BASE_LIVES, this.lives + regen);
        this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 }, `+${regen}❤ Vitalidade`, '#ff8888');
      }
    }

    // Auto-start wave
    if (this.autoWave && this.waveManager.betweenWaves && !this.waveManager.waveActive) {
      this.waveManager.startWave();
    }

    // Auto map tier upgrade every 10 waves (preserves existing path)
    const expectedTier = MAP_TIER_AT(this.waveManager.currentWave);
    if (expectedTier > this.currentMapTier && this.waveManager.betweenWaves) {
      this.doExpandMap(expectedTier);
    }

    // Spawn enemies (WaveManager also calls enemy.update internally)
    const newEnemies = this.waveManager.update(dt, this.enemies, waypoints, totalLength);
    this.enemies.push(...newEnemies);

    // Enemy end-of-path check
    for (const e of this.enemies) {
      if (e.reachedEnd && !e.dead) {
        e.dead = true;
        const lost = e.def.baseLivesLost;
        this.lives = Math.max(0, this.lives - lost);
        if (lost > 0) this.addFT(e.pos, `-${lost}❤`, '#ff4444');
        if (this.lives <= 0) { this.screen = 'gameover'; return; }
      }
    }

    // Puddle effects (slow enemies, heal water golems)
    for (const e of this.enemies) {
      if (e.dead) continue;
      for (const pu of this.puddles) {
        if (Math.hypot(e.pos.x - pu.x, e.pos.y - pu.y) <= pu.radius) {
          if (e.def.golemType === 'water') {
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * CFG_WATER_GOLEM_PUDDLE_REGEN * dt * 60);
          } else {
            e.applyTempSlow(pu.slowAmount, 0.5);
          }
        }
      }
    }
    for (const pu of this.puddles) pu.remaining -= dt;
    this.puddles = this.puddles.filter(p => p.remaining > 0);

    // Towers
    const extraProjs: ProjectileData[] = [];
    for (const tower of this.towers) {
      tower.update(dt);
      const speedB   = this.talentTree.speedBonusForElement(tower.def.element);
      const magicSpB = this.talentTree.magicSpeedBonusForElement(tower.def.element);
      const affM     = tower.computeAffinityMult(this.player.affinity);

      if (tower.isSecondary) {
        // Secondary towers gain mana only when the primary on the same cell shoots.
        // This is handled below after the primary fires — skip here.
        continue;
      }

      if (!tower.canShoot(this.player.stats, speedB)) continue;
      const target = tower.findTarget(this.enemies);
      if (!target) continue;

      const dmgB     = this.talentTree.damageBonusForElement(tower.def.element);
      const baseDmg  = tower.getDamage(this.player.stats, dmgB, affM);

      const didHit   = Math.random() <= this.player.hitChance(target.agility);
      const isCrit   = didHit && Math.random() < this.player.critChance();
      const critMult = isCrit ? this.player.critMultiplier() : 1;
      const dmg      = didHit ? baseDmg * critMult : 0;

      this.projectiles.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: target.id, damage: dmg, element: tower.def.element,
        color: didHit ? (isCrit ? '#ffff44' : tower.def.accentColor) : '#555555',
        isCrit, isMiss: !didHit,
      }));

      const magicReady = tower.onNormalShot(this.player.stats, speedB, magicSpB);
      if (magicReady) {
        tower.consumeMagicBar();
        this.fireMagic(tower, affM, extraProjs);
        if (tower.dualMagic) this.fireMagic(tower, affM, extraProjs);
      }

      // Tick secondary tower on same cell — gains mana each time primary shoots
      const secondary = this.towers.find(
        t => t.isSecondary && t.gridX === tower.gridX && t.gridY === tower.gridY
      );
      if (secondary) {
        const secMagicSpB = this.talentTree.magicSpeedBonusForElement(secondary.def.element);
        const secAffM     = secondary.computeAffinityMult(this.player.affinity);
        secondary.magicBar = Math.min(
          secondary.def.magicBarMax,
          secondary.magicBar + secondary.getEffectiveMagicBarGain(secMagicSpB)
        );
        if (secondary.magicBar >= secondary.def.magicBarMax) {
          secondary.consumeMagicBar();
          this.fireMagic(secondary, secAffM, extraProjs);
        }
      }
    }

    // Projectiles
    const moreProjs: ProjectileData[] = [];
    for (const proj of this.projectiles) {
      const { hit, enemy } = updateProjectile(proj, this.enemies, dt);
      if (hit && enemy) this.onHit(proj, enemy, moreProjs);
    }
    this.projectiles = [...this.projectiles.filter(p => !p.dead), ...extraProjs, ...moreProjs];

    // Collect kills
    const killed = this.enemies.filter(e => e.dead);
    this.enemies  = this.enemies.filter(e => !e.dead);
    for (const e of killed) {
      this.waveManager.enemiesKilledThisWave++;
      if (!e.reachedEnd) {  // no gold for enemies that pass through
        const g = Math.round(e.def.reward * this.player.goldMultiplier());
        this.gold += g; this.score += g;
        this.addFT(e.pos, `+${g}g`, '#ffdd44');
      }
      if (this.player.addXp(e.def.xp)) this.screen = 'levelup';
    }

    // Floating texts
    for (const f of this.floatingTexts) { f.y -= 40 * dt; f.life -= dt; }
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);
  }

  // ─── Magic ───────────────────────────────────────────────────────────────────
  private fireMagic(tower: Tower, affM: number, extra: ProjectileData[]) {
    const dmg = tower.getMagicDamage(this.player.stats, affM);
    const burnOnMag = tower.def.element === 'fire' && this.talentTree.fireBurnOnMagic();

    switch (tower.def.element) {
      case 'fire': {
        for (const t of tower.findFireMagicTargets(this.enemies)) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: dmg, element: 'fire',
            color: '#ff8833', isMagic: true, burnFromMagic: burnOnMag,
          }));
        }
        break;
      }
      case 'water': {
        const t = tower.findTarget(this.enemies);
        if (t) extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: t.id, damage: dmg, element: 'water',
          color: '#44ccff', isMagic: true,
        }));
        break;
      }
      case 'earth': {
        const t = tower.findTarget(this.enemies);
        if (t) extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: t.id, damage: dmg, element: 'earth',
          color: '#aabb44', isMagic: true,
        }));
        break;
      }
      case 'wind': {
        const t = tower.findTarget(this.enemies);
        if (t) extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: t.id, damage: dmg, element: 'wind',
          color: '#eeff44', isMagic: true,
        }));
        break;
      }
    }
  }

  // ─── Hit Resolution ──────────────────────────────────────────────────────────
  /** Returns earth golem within 80px of enemy that can absorb damage, or null */
  private findEarthGolemShield(enemy: Enemy): Enemy | null {
    return this.enemies.find(e =>
      !e.dead && e !== enemy && e.def.golemType === 'earth' &&
      Math.hypot(e.pos.x - enemy.pos.x, e.pos.y - enemy.pos.y) <= 80
    ) ?? null;
  }

  private onHit(proj: ProjectileData, enemy: Enemy, extra: ProjectileData[]) {
    if (proj.isMiss) { this.addFT(enemy.pos, 'MISS', '#666666'); return; }
    if (proj.isMagic) { this.applyMagic(proj, enemy); return; }

    // Earth golem absorbs damage for nearby allies
    const shield = this.findEarthGolemShield(enemy);
    const actualTarget = shield ?? enemy;
    const dmg = actualTarget.receiveDamage(proj.damage, proj.element);
    const tw  = this.towers.find(t => t.id === proj.towerId);
    if (tw) { tw.totalDamageDealt += dmg; if (actualTarget.dead) tw.totalKills++; }
    if (shield) this.addFT(shield.pos, `🛡${Math.round(dmg)}`, '#aaaaff');
    else this.addFT(enemy.pos, proj.isCrit ? `${Math.round(dmg)} CRÍTICO!` : String(Math.round(dmg)),
      proj.isCrit ? '#ffff44' : proj.color);
  }

  private applyMagic(proj: ProjectileData, target: Enemy) {
    const tw = this.towers.find(t => t.id === proj.towerId);
    const c  = ELEMENT_COLORS[proj.element];

    switch (proj.element) {
      case 'fire': {
        const d = target.receiveDamage(proj.damage, 'fire');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        if (proj.burnFromMagic) target.applyBurn(CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION);
        this.addFT(target.pos, `✨${Math.round(d)}`, c);
        break;
      }
      case 'water': {
        const d = target.receiveDamage(proj.damage, 'water');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        target.addPermanentSlow();
        this.addFT(target.pos, `💧-5%vel(${target.permanentSlowStacks})`, '#66aaff');
        if (Math.random() < this.talentTree.waterPuddleChance()) {
          this.puddles.push({ x: target.pos.x, y: target.pos.y, radius: PUDDLE_RADIUS, remaining: PUDDLE_DURATION, slowAmount: CFG_PUDDLE_SLOW_AMOUNT });
        }
        break;
      }
      case 'earth': {
        const aoeR = EARTH_AOE_BASE * this.talentTree.earthAoERadiusMult();
        const targets = this.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= aoeR);
        for (const t of targets) {
          const d = t.receiveDamage(proj.damage, 'earth');
          if (tw) { tw.totalDamageDealt += d; if (t.dead) tw.totalKills++; }
          this.addFT(t.pos, `🌍${Math.round(d)}`, c);
        }
        this.renderer.triggerAoe(target.pos.x, target.pos.y, aoeR);
        break;
      }
      case 'wind': {
        const d = target.receiveDamage(proj.damage, 'wind');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        if (target.def.golemType !== 'wind') {  // wind golems are immune to push
          target.distanceTraveled = Math.max(0, target.distanceTraveled - WIND_PUSH_PX);
          if (this.talentTree.windStunDuration() > 0) target.stunRemaining = this.talentTree.windStunDuration();
          this.addFT(target.pos, `💨-3tiles`, '#ccee44');
        } else {
          this.addFT(target.pos, `💨IMUNE`, '#ccee44');
        }
        break;
      }
    }
  }

  private addFT(pos: Vec2, text: string, color: string) {
    this.floatingTexts.push({
      x: pos.x + (Math.random() - 0.5) * 18, y: pos.y - 20,
      text, color, life: 1.2, maxLife: 1.2,
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  private render() {
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
      },
      player: this.player,
      talentTree: this.talentTree,
      towersAt: (c, r) => this.towersAt(c, r),
      towerCost: (id) => this.towerCost(id),
      towerUpgradeCost: () => this.towerUpgradeCost(),
    });
  }
}
