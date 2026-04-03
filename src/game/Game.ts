import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDef, ItemDropAnim } from '../types';
import { TOWER_DEFS, CELL_SIZE, ELEMENT_COLORS,
  BASE_LIVES, INITIAL_GOLD, BASE_TOWER_COST,
  UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS,
  MAP_TIER_AT, MAX_TOWER_LEVEL, MAP_EXPAND_COST,
  getFusionDef, ITEM_DEFS, ITEM_RARITY_COLORS, ARCHETYPE_DEFS } from '../constants';
import {
  CFG_EARTH_AOE_RADIUS, CFG_PUDDLE_RADIUS, CFG_PUDDLE_DURATION,
  CFG_WIND_PUSH_CELLS, CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION,
  CFG_PUDDLE_SLOW_AMOUNT, CFG_WATER_PUDDLE_CHANCE,
  CFG_WATER_GOLEM_PUDDLE_REGEN,
  CFG_EARTH_GOLEM_SHIELD_RADIUS,
  CFG_ENEMY_REWARD_SCALE, CFG_ENEMY_XP_SCALE,
  CFG_MOVE_COST_MULT, CFG_SYNERGY_DAMAGE_BONUS,
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
  gameSpeed: 1 | 2 = 1;
  debugMode = false;
  pendingAffinity: ElementType = 'fire';  // stored between affinity→archetype screens

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

  // Item system
  items: OwnedItem[] = [];
  itemDropAnim: ItemDropAnim | null = null;
  private lastItemWave = 0;  // track which wave last gave item

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
      case 'menu':      this.handleMenuClick(p); break;
      case 'affinity':  this.handleAffinityClick(p); break;
      case 'archetype': this.handleArchetypeClick(p); break;
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
        this.startNewGame(this.pendingAffinity, id);
        return;
      }
    }
    // Back button
    const back = this.renderer.getArchetypeBackRect();
    if (back && this.hit(p, back)) { this.screen = 'affinity'; return; }
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
    const def = TOWER_DEFS.find(d => d.id === typeId)!;
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.getItemDiscount())));
  }

  /** Per-tower upgrade cost: baseCost × (1 + upgradeCount × 0.3), minus item discount */
  towerUpgradeCost(tower?: Tower): number {
    if (!tower) return 50; // fallback
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.3));
    return Math.max(1, Math.round(base * (1 - this.getItemDiscount())));
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
    const moveCost = Math.round(tower.placedCost * CFG_MOVE_COST_MULT);
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
    newTower.fusionDef     = tower.fusionDef;
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
    return !!getFusionDef(primary.def.element, secondary.def.element);
  }

  /** Perform fusion on a cell */
  fuseTowers(col: number, row: number) {
    if (!this.canFuse(col, row)) return;
    const here = this.towersAt(col, row);
    const primary = here.find(t => !t.isSecondary)!;
    const secondary = here.find(t => t.isSecondary)!;
    const fusion = getFusionDef(primary.def.element, secondary.def.element);
    if (!fusion) return;

    // Remove secondary tower, apply fusion to primary
    this.towers = this.towers.filter(t => t.id !== secondary.id);
    primary.fusionDef = fusion;
    primary.isSecondary = false;

    this.addFT(
      { x: primary.pixelX, y: primary.pixelY - 30 },
      `${fusion.icon} FUSÃO: ${fusion.name}!`, fusion.color
    );
    this.addFT(
      { x: primary.pixelX, y: primary.pixelY - 50 },
      fusion.description, '#ddddff'
    );
  }

  // ─── Item System ────────────────────────────────────────────────────────────
  /** Roll for an item drop (called every 10 waves) */
  private rollItemDrop() {
    const roll = Math.random();
    let pool: ItemDef[];
    if (roll < 0.05) {
      pool = ITEM_DEFS.filter(i => i.rarity === 'legendary');
    } else if (roll < 0.25) {
      pool = ITEM_DEFS.filter(i => i.rarity === 'rare');
    } else {
      pool = ITEM_DEFS.filter(i => i.rarity === 'common');
    }
    const item = pool[Math.floor(Math.random() * pool.length)];
    this.addItem(item);
  }

  private addItem(item: ItemDef) {
    const existing = this.items.find(i => i.defId === item.id);
    if (existing) {
      if (existing.stacks < 3) {
        existing.stacks++;
      } else {
        // Already at max stacks, reroll once
        const alt = ITEM_DEFS.filter(i => i.rarity === item.rarity && i.id !== item.id);
        if (alt.length > 0) {
          const other = alt[Math.floor(Math.random() * alt.length)];
          const otherExisting = this.items.find(i => i.defId === other.id);
          if (otherExisting && otherExisting.stacks < 3) otherExisting.stacks++;
          else if (!otherExisting) this.items.push({ defId: other.id, stacks: 1 });
          this.itemDropAnim = { item: other, phase: 'rising', timer: 0, totalTime: 2.5 };
          return;
        }
        return; // all maxed
      }
    } else {
      this.items.push({ defId: item.id, stacks: 1 });
    }
    this.itemDropAnim = { item, phase: 'rising', timer: 0, totalTime: 2.5 };
  }

  /** Total bonus gold per kill from items */
  getItemGoldBonus(): number {
    let bonus = 0;
    for (const owned of this.items) {
      const def = ITEM_DEFS.find(d => d.id === owned.defId);
      if (def && def.effectType === 'gold_mult') bonus += def.effectValue * owned.stacks;
    }
    return bonus;
  }

  /** Total discount fraction from items (capped at 0.9) */
  getItemDiscount(): number {
    let disc = 0;
    for (const owned of this.items) {
      const def = ITEM_DEFS.find(d => d.id === owned.defId);
      if (def && def.effectType === 'discount') disc += def.effectValue * owned.stacks;
    }
    return Math.min(0.9, disc);
  }

  /** Total slow aura seconds from items */
  getItemSlowAura(): number {
    let slow = 0;
    for (const owned of this.items) {
      const def = ITEM_DEFS.find(d => d.id === owned.defId);
      if (def && def.effectType === 'slow_aura') slow += def.effectValue * owned.stacks;
    }
    return slow;
  }

  /** Synergy bonus: +15% damage when 2 towers share a cell (before fusion) */
  getSynergyBonus(tower: Tower): number {
    const here = this.towersAt(tower.gridX, tower.gridY);
    if (here.length >= 2) return CFG_SYNERGY_DAMAGE_BONUS;
    return 0;
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
    this.items = []; this.itemDropAnim = null; this.lastItemWave = 0;
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
      if (t.fusionId) {
        const [pe, se] = t.fusionId.split('+');
        tower.fusionDef = getFusionDef(pe, se) ?? null;
      }
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
    const { waypoints, totalLength, pathCells, gameWidth, gameHeight } = this.map;

    // Wave just completed → vitality life regen + item drop every 10 waves
    if (this.waveManager.waveComplete) {
      this.waveManager.waveComplete = false;  // consume the flag
      const regen = Math.floor(this.player.stats.vitality * 0.1);
      if (regen > 0) {
        this.lives = Math.min(BASE_LIVES, this.lives + regen);
        this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 }, `+${regen}❤ Vitalidade`, '#ff8888');
      }
      // Item drop every 10 waves
      const completedWave = this.waveManager.currentWave;
      if (completedWave > 0 && completedWave % 10 === 0 && completedWave !== this.lastItemWave) {
        this.lastItemWave = completedWave;
        this.rollItemDrop();
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
    // Apply item slow aura to newly spawned enemies
    const slowAura = this.getItemSlowAura();
    if (slowAura > 0) {
      for (const e of newEnemies) e.applyTempSlow(0.15, slowAura);
    }
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
      const synergy  = this.getSynergyBonus(tower);
      const baseDmg  = tower.getDamage(this.player.stats, dmgB + synergy, affM);

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
        const rewardMult = 1 + (this.waveManager.currentWave - 1) * CFG_ENEMY_REWARD_SCALE;
        const g = Math.round(e.def.reward * rewardMult * this.player.goldMultiplier()) + this.getItemGoldBonus();
        this.gold += g; this.score += g;
        this.addFT(e.pos, `+${g}g`, '#ffdd44');
      }
      const xpMult = 1 + (this.waveManager.currentWave - 1) * CFG_ENEMY_XP_SCALE;
      if (this.player.addXp(Math.round(e.def.xp * xpMult))) this.screen = 'levelup';
    }

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

  // ─── Magic ───────────────────────────────────────────────────────────────────
  private fireMagic(tower: Tower, affM: number, extra: ProjectileData[]) {
    // Fused tower: use fusion magic
    if (tower.fusionDef) {
      this.fireFusionMagic(tower, affM, extra);
      return;
    }

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

  /** Fire fusion magic — enhanced version based on fusion type */
  private fireFusionMagic(tower: Tower, affM: number, extra: ProjectileData[]) {
    const fusion = tower.fusionDef!;
    const baseDmg = tower.getMagicDamage(this.player.stats, affM) * fusion.magicDamageMult;

    // All fusion magics target enemies in range
    const targets = tower.findAllInRange(this.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];

    switch (fusion.specialEffect) {
      case 'magma_pool':
      case 'fireball_aoe':
      case 'sandstorm':
      case 'tornado': {
        // AoE damage to all in range
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
            color: fusion.color, isMagic: true, burnFromMagic: fusion.specialEffect === 'fireball_aoe' || fusion.specialEffect === 'magma_pool',
          }));
        }
        this.renderer.triggerAoe(primary.pos.x, primary.pos.y, tower.getRange() * 0.6);
        break;
      }
      case 'inferno': {
        // Single target but massive burn
        extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: primary.id, damage: baseDmg, element: 'fire',
          color: fusion.color, isMagic: true, burnFromMagic: true,
        }));
        break;
      }
      case 'steam':
      case 'geyser': {
        // Hit + stun
        for (const t of targets.slice(0, 3)) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
            color: fusion.color, isMagic: true,
          }));
          t.stunRemaining = Math.max(t.stunRemaining, 1.5);
        }
        break;
      }
      case 'swamp':
      case 'mud': {
        // AoE slow + damage
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
            color: fusion.color, isMagic: true,
          }));
          t.addPermanentSlow();
          t.addPermanentSlow();
        }
        // Create puddle
        this.puddles.push({
          x: primary.pos.x, y: primary.pos.y,
          radius: PUDDLE_RADIUS * 1.5, remaining: PUDDLE_DURATION * 1.5,
          slowAmount: CFG_PUDDLE_SLOW_AMOUNT * 2,
        });
        break;
      }
      case 'blizzard': {
        // AoE freeze (stun + slow)
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'water',
            color: fusion.color, isMagic: true,
          }));
          t.stunRemaining = Math.max(t.stunRemaining, 1.0);
          t.addPermanentSlow();
        }
        this.renderer.triggerAoe(primary.pos.x, primary.pos.y, tower.getRange() * 0.5);
        break;
      }
      case 'lightning': {
        // Chain lightning: hits up to 5 targets
        for (const t of targets.slice(0, 5)) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'wind',
            color: fusion.color, isMagic: true,
          }));
        }
        break;
      }
      case 'tsunami': {
        // Push all enemies + damage
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'wind',
            color: fusion.color, isMagic: true,
          }));
          if (t.def.golemType !== 'wind') {
            t.distanceTraveled = Math.max(0, t.distanceTraveled - WIND_PUSH_PX * 2);
          }
        }
        break;
      }
      default: {
        // Fallback: single target
        extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: primary.id, damage: baseDmg, element: fusion.primaryElement,
          color: fusion.color, isMagic: true,
        }));
      }
    }

    this.addFT({ x: tower.pixelX, y: tower.pixelY - 20 }, `${fusion.icon} ${fusion.name}`, fusion.color);
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
        items: this.items,
        itemDropAnim: this.itemDropAnim,
        canFuse: this.upgradePopup ? this.canFuse(this.upgradePopup.col, this.upgradePopup.row) : false,
      },
      player: this.player,
      talentTree: this.talentTree,
      towersAt: (c, r) => this.towersAt(c, r),
      towerCost: (id) => this.towerCost(id),
      towerUpgradeCost: (t) => this.towerUpgradeCost(t),
      gameSpeed: this.gameSpeed,
      debugMode: this.debugMode,
      pendingAffinity: this.pendingAffinity,
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
            const rewardM = 1 + (this.waveManager.currentWave - 1) * CFG_ENEMY_REWARD_SCALE;
            const g = Math.round(e.def.reward * rewardM * this.player.goldMultiplier()) + this.getItemGoldBonus();
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
      case 'give_item':  this.rollItemDrop(); break;
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
