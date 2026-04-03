import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDef, ItemDropAnim, DamageComponent } from '../types';
import { TOWER_DEFS, CELL_SIZE, ELEMENT_COLORS, ELEMENT_ICONS,
  BASE_LIVES, INITIAL_GOLD, BASE_TOWER_COST,
  UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS,
  MAP_TIER_AT, MAX_TOWER_LEVEL, MAP_EXPAND_COST,
  getFusionDef, ITEM_DEFS, ITEM_RARITY_COLORS, ARCHETYPE_DEFS,
  ENEMY_DEFS } from '../constants';
import {
  CFG_EARTH_AOE_RADIUS, CFG_PUDDLE_RADIUS, CFG_PUDDLE_DURATION,
  CFG_WIND_PUSH_CELLS, CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION,
  CFG_PUDDLE_SLOW_AMOUNT, CFG_WATER_PUDDLE_CHANCE,
  CFG_WATER_GOLEM_PUDDLE_REGEN,
  CFG_EARTH_GOLEM_SHIELD_RADIUS,
  CFG_ENEMY_REWARD_SCALE, CFG_ENEMY_XP_SCALE,
  CFG_MOVE_COST_MULT, CFG_SYNERGY_DAMAGE_BONUS,
} from '../settings';
import { Tower, createTower, resetTowerIds } from '../entities/Tower';
import type { BaseTower } from '../entities/BaseTower';
import { createEnemy } from '../entities/Enemy';
import type { BaseEnemy } from '../entities/BaseEnemy';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { createProjectile, updateProjectile, resetProjectileIds } from '../entities/Projectile';
import { Player } from '../player/Player';
import { SkillTree as TalentTree } from '../player/SkillTree';
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

interface BurnZone {
  x: number; y: number; radius: number; remaining: number; dmgPerSec: number;
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

  // Item system
  items: OwnedItem[] = [];
  itemDropAnim: ItemDropAnim | null = null;
  private lastItemWave = 0;       // track which wave last gave item
  private cataclysmTimer = 0;     // counts up; fires every 20s when Relicário owned
  private titanShieldCharges = 0; // blocks next N life losses (Selo do Titã)
  private titanShieldWaves = 0;   // wave count since last shield grant
  private _lastTronoWave = 0;    // last wave that got Trono do Rei Goblin gold

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
      for (const def of TOWER_DEFS) {
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
    const def = TOWER_DEFS.find(d => d.id === typeId)!;
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.getItemDiscount())));
  }

  /** Per-tower upgrade cost: baseCost × (1 + upgradeCount × 0.3), minus item discount */
  towerUpgradeCost(tower?: Tower): number {
    if (!tower) return 50; // fallback
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.2));
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
      totalMoveCost += Math.round(t.placedCost * CFG_MOVE_COST_MULT);
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
    const cost = Math.round(MAP_EXPAND_COST * (1 - this.getItemDiscount()));
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
    } else if (roll < 0.18) {
      pool = ITEM_DEFS.filter(i => i.rarity === 'epic');
    } else if (roll < 0.40) {
      pool = ITEM_DEFS.filter(i => i.rarity === 'rare');
    } else {
      pool = ITEM_DEFS.filter(i => i.rarity === 'common');
    }
    if (pool.length === 0) pool = ITEM_DEFS.filter(i => i.rarity === 'common');
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
      if (!def) continue;
      if (def.effectType === 'gold_mult') bonus += def.effectValue * owned.stacks;
      // Trono do Rei Goblin: +2 gold per kill per stack
      if (def.effectType === 'wave_gold_bonus') bonus += 2 * owned.stacks;
    }
    return Math.round(bonus);
  }

  /** Total discount fraction from items (capped at 0.6) */
  getItemDiscount(): number {
    let disc = 0;
    for (const owned of this.items) {
      const def = ITEM_DEFS.find(d => d.id === owned.defId);
      if (def && def.effectType === 'discount') disc += def.effectValue * owned.stacks;
    }
    return Math.min(0.6, disc);
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

  /** Returns true if the player owns at least one stack of the given item */
  private hasItem(id: string): boolean {
    return this.items.some(i => i.defId === id);
  }

  /** Total stacks of the given item */
  private itemStacks(id: string): number {
    return this.items.find(i => i.defId === id)?.stacks ?? 0;
  }

  // ── Per-element tower bonuses ──────────────────────────────────────────────

  /** Extra damage multiplier bonus for element (Brasa/Coroa das Quatro Marés) */
  getItemDmgBonus(element: ElementType): number {
    let bonus = 0;
    // Brasa do Vigia: +8% fire tower damage per stack
    if (element === 'fire') {
      const s = this.itemStacks('ember_sentry');
      if (s > 0) bonus += 0.08 * s;
    }
    // Coroa das Quatro Marés: +12% all towers
    const crownStacks = this.itemStacks('four_tides_crown');
    if (crownStacks > 0) bonus += 0.12 * crownStacks;
    return bonus;
  }

  /** Extra fire-rate multiplier bonus for element (Gota de Maré/Coroa) */
  getItemSpeedBonus(element: ElementType): number {
    let bonus = 0;
    // Gota de Maré: +10% water tower fire rate per stack
    if (element === 'water') {
      const s = this.itemStacks('tide_drop');
      if (s > 0) bonus += 0.10 * s;
    }
    // Coroa das Quatro Marés: +12% all towers
    const crownStacks = this.itemStacks('four_tides_crown');
    if (crownStacks > 0) bonus += 0.12 * crownStacks;
    return bonus;
  }

  /** Extra range multiplier for element (Seixo Rúnico) — returns a mult (1 + bonus) */
  getItemRangeMult(element: ElementType): number {
    let bonus = 0;
    if (element === 'earth') {
      const s = this.itemStacks('runic_pebble');
      if (s > 0) bonus += 0.12 * s;
    }
    return 1 + bonus;
  }

  /** Extra magic bar gain bonus for element (Ampulheta Vulcânica/Coroa) */
  getItemMagicChargeBonus(element: ElementType): number {
    let bonus = 0;
    if (element === 'fire') {
      const s = this.itemStacks('volcanic_hourglass');
      if (s > 0) bonus += 0.20 * s;
    }
    // Coroa das Quatro Marés: +15% all magic charge
    const crownStacks = this.itemStacks('four_tides_crown');
    if (crownStacks > 0) bonus += 0.15 * crownStacks;
    return bonus;
  }

  /** Extra pixels pushed by wind magic (Insígnia do Vendaval) */
  getItemWindPushBonus(): number {
    const s = this.itemStacks('gale_insignia');
    return s > 0 ? s * CELL_SIZE : 0;
  }

  /** Wind stun duration multiplier (Pena de Corrente) */
  getItemWindStunMult(): number {
    const s = this.itemStacks('wind_feather');
    return 1 + (s > 0 ? 0.15 * s : 0);
  }

  /** Water slow strength multiplier (Medalhão da Maré Profunda) */
  getItemWaterSlowAmp(): number {
    const s = this.itemStacks('deep_tide_medal');
    return 1 + (s > 0 ? 0.25 * s : 0);
  }

  /** Earth AoE radius multiplier from item (Totem da Falha Sísmica) */
  getItemEarthRadiusBonus(): number {
    const s = this.itemStacks('seismic_totem');
    return s > 0 ? 0.20 * s : 0;
  }

  /** Gold bonus given at each wave start (Trono do Rei Goblin: +40 gold) */
  private getItemWaveStartGold(): number {
    let bonus = 0;
    for (const owned of this.items) {
      const def = ITEM_DEFS.find(d => d.id === owned.defId);
      if (def && def.effectType === 'wave_gold_bonus') bonus += def.effectValue * owned.stacks;
    }
    return Math.round(bonus);
  }

  /** Damage multiplier for hunter bonus vs elites/golems/bosses */
  getItemHunterMult(enemy: BaseEnemy): number {
    const s = this.itemStacks('golem_hunter');
    if (s === 0) return 1;
    const isTarget = (enemy as any)._elite || enemy.def.isBoss || enemy.def.golemType != null;
    return isTarget ? 1 + 0.18 * s : 1;
  }

  /** Damage multiplier for boss/high-HP bonus (Núcleo do Titã) */
  getItemBossMult(enemy: BaseEnemy): number {
    const s = this.itemStacks('shadow_core');
    if (s === 0) return 1;
    const isTarget = enemy.def.isBoss || (enemy.hp / enemy.maxHp > 0.70);
    return isTarget ? 1 + 0.30 * s : 1;
  }

  /** True if Coração de Magma is owned (fire magic leaves burn zone) */
  hasFireMagmaTrail(): boolean { return this.hasItem('magma_heart'); }

  /** True if Coroa da Nevasca is owned (water magic freeze chance) */
  hasWaterFreeze(): boolean { return this.hasItem('blizzard_crown'); }
  waterFreezeChance(): number { return 0.20 * this.itemStacks('blizzard_crown'); }

  /** True if Olho da Tempestade is owned (earth magic sandstorm) */
  hasEarthSandstorm(): boolean { return this.hasItem('sandstorm_eye'); }

  /** True if Trombeta do Furacão is owned (wind magic hits 3 aligned) */
  hasWindChainMagic(): boolean { return this.hasItem('hurricane_horn'); }
  windChainDmgMult(): number { return 1 + 0.30 * this.itemStacks('hurricane_horn'); }

  /** True if Asa do Dragão Caótico is owned (fire AoE splash) */
  hasFireAoeSplash(): boolean { return this.hasItem('chaos_wing'); }
  fireAoeSplashMult(): number { return 0.25 * this.itemStacks('chaos_wing'); }

  /**
   * Tiered synergy bonus based on minimum tower level on the cell:
   *  - 2 towers present: +10% damage (base)
   *  - Both level 5+: +15% damage
   *  - Both level 8+: +20% damage
   *  - Both max level: +30% damage (pre-fusion peak)
   */
  getSynergyBonus(tower: Tower): number {
    const here = this.towersAt(tower.gridX, tower.gridY);
    if (here.length < 2) return 0;
    const minLevel = Math.min(...here.map(t => t.level));
    if (minLevel >= MAX_TOWER_LEVEL + 1) return 0.30;  // both max level
    if (minLevel >= 8) return 0.20;
    if (minLevel >= 5) return 0.15;
    return 0.10;  // base synergy for any 2 towers
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
      const def = TOWER_DEFS.find(d => d.id === t.typeId);
      if (!def) continue;
      const tower = createTower(def, t.gridX, t.gridY, t.slotIndex as 0|1);
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

    // Wave just completed → vitality regen + item drop every 10 waves + titan shield
    if (this.waveManager.waveComplete) {
      this.waveManager.waveComplete = false;  // consume the flag
      const regen = this.player.vitalityRegen();
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
      // Titan shield (Selo do Titã Sombrio): grant 1 shield charge every 3 waves
      const titanStacks = this.itemStacks('titan_seal');
      if (titanStacks > 0) {
        this.titanShieldWaves++;
        if (this.titanShieldWaves >= 3) {
          this.titanShieldWaves = 0;
          this.titanShieldCharges += titanStacks;
          this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 - 30 }, `🛡 Escudo do Titã!`, '#cc44ff');
        }
      }
    }

    // Auto-start wave
    if (this.autoWave && this.waveManager.betweenWaves && !this.waveManager.waveActive) {
      this.waveManager.startWave();
    }
    // Trono do Rei Goblin: +40g per stack at the start of every new wave
    if (this.waveManager.waveActive && this.waveManager.currentWave !== this._lastTronoWave) {
      this._lastTronoWave = this.waveManager.currentWave;
      const waveGold = this.getItemWaveStartGold();
      if (waveGold > 0) {
        this.gold += waveGold;
        this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 }, `👑 +${waveGold}g`, '#ffdd44');
      }
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
        let lost = e.def.baseLivesLost;
        // Titan shield absorbs life losses
        if (lost > 0 && this.titanShieldCharges > 0) {
          const absorbed = Math.min(lost, this.titanShieldCharges);
          this.titanShieldCharges -= absorbed;
          lost -= absorbed;
          this.addFT(e.pos, `🛡 Bloqueado!`, '#cc44ff');
        }
        if (lost > 0) {
          this.lives = Math.max(0, this.lives - lost);
          this.addFT(e.pos, `-${lost}❤`, '#ff4444');
        }
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

    // Burn zones (Coração de Magma)
    for (const bz of this.burnZones) {
      bz.remaining -= dt;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.pos.x - bz.x, e.pos.y - bz.y) <= bz.radius) {
          const dmg = bz.dmgPerSec * dt;
          e.receiveDamage(dmg, 'fire');
        }
      }
    }
    this.burnZones = this.burnZones.filter(bz => bz.remaining > 0);

    // Cataclysm (Relicário do Cataclismo Elemental) — every 20s
    if (this.hasItem('cataclysm_relic') && this.waveManager.waveActive) {
      this.cataclysmTimer += dt;
      if (this.cataclysmTimer >= 20) {
        this.cataclysmTimer = 0;
        this.fireCataclysm();
      }
    }

    // Boss abilities
    this.processBossAbilities(dt);

    // Towers
    const extraProjs: ProjectileData[] = [];
    for (const tower of this.towers) {
      tower.update(dt);
      const speedB   = this.talentTree.speedBonusForElement(tower.def.element);
      const magicSpB = this.talentTree.magicSpeedBonusForElement(tower.def.element);
      const affM     = tower.computeAffinityMult(this.player.affinity);

      const itemSpeedB = this.getItemSpeedBonus(tower.def.element);
      const itemRangeMult = this.getItemRangeMult(tower.def.element);
      const itemMagicChB  = this.getItemMagicChargeBonus(tower.def.element);

      if (!tower.canShoot()) continue;
      const target = tower.findTarget(this.enemies, itemRangeMult);
      if (!target) continue;

      const dmgB     = this.talentTree.damageBonusForElement(tower.def.element);
      const synergy  = this.getSynergyBonus(tower);
      const itemDmgB = this.getItemDmgBonus(tower.def.element);
      const baseDmg  = tower.getDamage(this.player.stats, dmgB + synergy + itemDmgB, affM);

      const didHit   = Math.random() <= this.player.hitChance(target.agility);
      const isCrit   = didHit && Math.random() < this.player.critChance();
      const critMult = isCrit ? this.player.critMultiplier() : 1;
      const dmg      = didHit ? baseDmg * critMult : 0;

      // Fused towers split normal shot damage between both elements
      const fusionComponents = tower.fusionDef && didHit ? [
        { element: tower.fusionDef.primaryElement, amount: dmg * 0.5 },
        { element: tower.fusionDef.secondaryElement, amount: dmg * 0.5 },
      ] : undefined;

      this.projectiles.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: target.id, damage: dmg, element: tower.def.element,
        color: didHit ? (isCrit ? '#ffff44' : (tower.fusionDef?.color ?? tower.def.accentColor)) : '#555555',
        isCrit, isMiss: !didHit,
        components: fusionComponents,
      }));

      const magicReady = tower.onNormalShot(this.player.stats, speedB + itemSpeedB, magicSpB + itemMagicChB);
      if (magicReady) {
        tower.consumeMagicBar();
        this.fireMagic(tower, affM, extraProjs);
        if (tower.dualMagic) this.fireMagic(tower, affM, extraProjs);
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

    // Dual-element components: 60% primary, 40% secondary
    const dualComponents = [
      { element: fusion.primaryElement, amount: baseDmg * 0.6 },
      { element: fusion.secondaryElement, amount: baseDmg * 0.4 },
    ];

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
            components: dualComponents,
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
          components: dualComponents,
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
            components: dualComponents,
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
            components: dualComponents,
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
            components: dualComponents,
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
            components: dualComponents,
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
            components: dualComponents,
          }));
          if (t.def.golemType !== 'wind') {
            t.distanceTraveled = Math.max(0, t.distanceTraveled - WIND_PUSH_PX * 2);
          }
        }
        break;
      }
      case 'solar_core': {
        // Fire+Fire: massive AoE fire burst + eternal burn on all enemies in range
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'fire',
            color: fusion.color, isMagic: true, burnFromMagic: true,
          }));
        }
        // Leave persistent burn zone
        this.burnZones.push({ x: primary.pos.x, y: primary.pos.y, radius: tower.getRange() * 0.5, remaining: 6, dmgPerSec: baseDmg * 0.15 });
        this.renderer.triggerAoe(primary.pos.x, primary.pos.y, tower.getRange() * 0.7);
        break;
      }
      case 'abyssal_vortex': {
        // Water+Water: AoE slow + stun pulse; add 3 permanent slows to each
        for (const t of targets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'water',
            color: fusion.color, isMagic: true,
          }));
          t.addPermanentSlow(); t.addPermanentSlow(); t.addPermanentSlow();
          t.stunRemaining = Math.max(t.stunRemaining, 1.0);
        }
        this.puddles.push({ x: primary.pos.x, y: primary.pos.y, radius: tower.getRange() * 0.6, remaining: 10, slowAmount: 0.15 });
        this.renderer.triggerAoe(primary.pos.x, primary.pos.y, tower.getRange() * 0.6);
        break;
      }
      case 'primal_quake': {
        // Earth+Earth: screen-wide tremor — hit ALL enemies currently on map
        const allEnemies = this.enemies.filter(e => !e.dead && !e.reachedEnd);
        for (const t of allEnemies) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg * 0.6, element: 'earth',
            color: fusion.color, isMagic: true,
          }));
          t.stunRemaining = Math.max(t.stunRemaining, 0.5);
        }
        this.renderer.triggerAoe(this.map.gameWidth / 2, this.map.gameHeight / 2, Math.max(this.map.gameWidth, this.map.gameHeight));
        this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 }, `☀ TERREMOTO PRIMORDIAL!`, fusion.color);
        break;
      }
      case 'eternal_hurricane': {
        // Wind+Wind: hit enemies within 1.5× range, push 3 tiles back (not to start), stun
        const extRange = 1.5;
        const hurricaneTargets = tower.findAllInRange(this.enemies, extRange);
        const pushPx = WIND_PUSH_PX * 3;
        for (const t of hurricaneTargets) {
          extra.push(createProjectile({
            towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
            targetEnemyId: t.id, damage: baseDmg, element: 'wind',
            color: fusion.color, isMagic: true,
          }));
          if (t.def.golemType !== 'wind') {
            // Push back 3 tiles but keep at least 1 cell from path origin
            t.distanceTraveled = Math.max(CELL_SIZE, t.distanceTraveled - pushPx);
            t.stunRemaining = Math.max(t.stunRemaining, 1.5);
          }
        }
        this.renderer.triggerAoe(tower.pixelX, tower.pixelY, tower.getRange(extRange));
        break;
      }
      default: {
        // Fallback: single target
        extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: primary.id, damage: baseDmg, element: fusion.primaryElement,
          color: fusion.color, isMagic: true,
          components: dualComponents,
        }));
      }
    }

    this.addFT({ x: tower.pixelX, y: tower.pixelY - 20 }, `${fusion.icon} ${fusion.name}`, fusion.color);
  }

  // ─── Boss Abilities ──────────────────────────────────────────────────────────
  private processBossAbilities(dt: number) {
    for (const e of this.enemies) {
      if (e.dead || !e.def.isBoss || !e.def.bossAbility) continue;

      if (!(e instanceof BossEnemy)) continue;

      switch (e.def.bossAbility) {
        case 'summon_adds': {
          // Goblin King: spawns 2 goblins at each 25% HP threshold (75%, 50%, 25%)
          const spawnTrigger = e.checkAddSpawn();
          if (spawnTrigger > 0) {
            const goblinDef = ENEMY_DEFS.find(d => d.id === 'goblin')!;
            for (let i = 0; i < 2; i++) {
              const add = createEnemy(goblinDef, this.waveManager.currentWave, 1);
              add.distanceTraveled = Math.max(0, e.distanceTraveled - 30 - i * 20);
              add.pos = { ...e.pos };
              this.enemies.push(add);
              this.waveManager.totalEnemiesThisWave++;
            }
            this.addFT(e.pos, '👑 Invocação!', '#44ff44');
          }
          break;
        }
        case 'fire_trail': {
          if (!('_trailTimer' in e)) (e as any)._trailTimer = 0;
          (e as any)._trailTimer -= dt;
          if ((e as any)._trailTimer <= 0) {
            (e as any)._trailTimer = 2.0;
            this.puddles.push({
              x: e.pos.x, y: e.pos.y, radius: 35,
              remaining: 6, slowAmount: -0.10,
            });
            this.addFT(e.pos, '🔥 Rastro!', '#ff4400');
          }
          break;
        }
        case 'shield_phase': {
          // Uses BossEnemy.tryTriggerShield() — idol check + shield state managed in subclass
          if (e.tryTriggerShield()) {
            this.addFT(e.pos, '🛡 ESCUDO ATIVO!', '#aa44ff');
          }
          break;
        }
      }
    }
  }

  // ─── Hit Resolution ──────────────────────────────────────────────────────────
  /** Returns earth golem within 80px of enemy that can absorb damage, or null */
  private findEarthGolemShield(enemy: BaseEnemy): BaseEnemy | null {
    return this.enemies.find(e =>
      !e.dead && e !== enemy && e.def.golemType === 'earth' &&
      Math.hypot(e.pos.x - enemy.pos.x, e.pos.y - enemy.pos.y) <= CFG_EARTH_GOLEM_SHIELD_RADIUS
    ) ?? null;
  }

  private onHit(proj: ProjectileData, enemy: BaseEnemy, extra: ProjectileData[]) {
    if (proj.isMiss) { this.addFT(enemy.pos, 'MISS', '#666666'); return; }
    if (proj.isMagic) { this.applyMagic(proj, enemy); return; }

    // Earth golem absorbs damage for nearby allies
    const shield = this.findEarthGolemShield(enemy);
    const actualTarget = shield ?? enemy;
    const tw = this.towers.find(t => t.id === proj.towerId);

    // Item damage multipliers
    const hunterMult = this.getItemHunterMult(actualTarget);
    const bossMult   = this.getItemBossMult(actualTarget);
    const itemMult   = hunterMult * bossMult;

    if (proj.components && proj.components.length > 0) {
      // Multi-element damage: apply each component separately
      let totalDealt = 0;
      const parts: string[] = [];
      for (const comp of proj.components) {
        const d = actualTarget.receiveDamage(comp.amount * itemMult, comp.element);
        totalDealt += d;
        if (d > 0) parts.push(`${Math.round(d)}${ELEMENT_COLORS[comp.element] === proj.color ? '' : comp.element[0]}`);
      }
      if (tw) { tw.totalDamageDealt += totalDealt; if (actualTarget.dead) tw.totalKills++; }
      const label = parts.join('+') || '0';
      if (shield) this.addFT(shield.pos, `🛡${label}`, '#aaaaff');
      else this.addFT(enemy.pos, proj.isCrit ? `${label} CRÍTICO!` : label,
        proj.isCrit ? '#ffff44' : proj.color);
      // Fire AoE splash (Asa do Dragão Caótico)
      if (this.hasFireAoeSplash() && proj.components.some(c => c.element === 'fire')) {
        this.applyFireAoeSplash(actualTarget, totalDealt * this.fireAoeSplashMult());
      }
    } else {
      // Single-element damage (original path)
      const dmg = actualTarget.receiveDamage(proj.damage * itemMult, proj.element);
      if (tw) { tw.totalDamageDealt += dmg; if (actualTarget.dead) tw.totalKills++; }
      if (shield) {
        this.addFT(shield.pos, `🛡${Math.round(dmg)}`, '#aaaaff');
      } else if (dmg === 0 && proj.element === 'fire' && actualTarget.def.golemType === 'fire') {
        this.addFT(enemy.pos, '🔥IMUNE', '#ff6600');
      } else {
        this.addFT(enemy.pos, proj.isCrit ? `${Math.round(dmg)} CRÍTICO!` : String(Math.round(dmg)),
          proj.isCrit ? '#ffff44' : proj.color);
      }
      // Fire AoE splash (Asa do Dragão Caótico)
      if (this.hasFireAoeSplash() && proj.element === 'fire') {
        this.applyFireAoeSplash(actualTarget, dmg * this.fireAoeSplashMult());
      }
    }
  }

  /** Splash 25% of fire damage to adjacent enemies (Asa do Dragão Caótico) */
  private applyFireAoeSplash(source: BaseEnemy, splashDmg: number) {
    if (splashDmg <= 0) return;
    const splashRadius = 60;
    for (const e of this.enemies) {
      if (e === source || e.dead) continue;
      if (Math.hypot(e.pos.x - source.pos.x, e.pos.y - source.pos.y) <= splashRadius) {
        e.receiveDamage(splashDmg, 'fire');
      }
    }
  }

  private applyMagic(proj: ProjectileData, target: BaseEnemy) {
    const tw = this.towers.find(t => t.id === proj.towerId);

    // Multi-element magic: resolve each component, then apply effects from primary element
    if (proj.components && proj.components.length > 0) {
      const itemMult = this.getItemHunterMult(target) * this.getItemBossMult(target);
      let totalDealt = 0;
      const parts: string[] = [];
      for (const comp of proj.components) {
        const d = target.receiveDamage(comp.amount * itemMult, comp.element);
        totalDealt += d;
        if (d > 0) parts.push(`${Math.round(d)}${ELEMENT_ICONS[comp.element]}`);
      }
      if (tw) { tw.totalDamageDealt += totalDealt; if (target.dead) tw.totalKills++; }

      // Apply element-specific effects for each component element
      const elements = proj.components.map(c => c.element);
      if (elements.includes('fire') && proj.burnFromMagic) {
        target.applyBurn(CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION);
      }
      if (elements.includes('fire') && this.hasFireMagmaTrail()) {
        this.burnZones.push({ x: target.pos.x, y: target.pos.y, radius: 50, remaining: 4, dmgPerSec: proj.damage * 0.20 });
      }
      if (elements.includes('fire') && this.hasFireAoeSplash()) {
        this.applyFireAoeSplash(target, totalDealt * this.fireAoeSplashMult());
      }
      if (elements.includes('water')) {
        const slowAmp = Math.round(this.getItemWaterSlowAmp());
        for (let i = 0; i < slowAmp; i++) target.addPermanentSlow();
        if (Math.random() < this.talentTree.waterPuddleChance()) {
          this.puddles.push({ x: target.pos.x, y: target.pos.y, radius: PUDDLE_RADIUS, remaining: PUDDLE_DURATION, slowAmount: CFG_PUDDLE_SLOW_AMOUNT });
        }
        if (this.hasWaterFreeze() && Math.random() < this.waterFreezeChance()) {
          target.stunRemaining = Math.max(target.stunRemaining, 1.2);
        }
      }
      if (elements.includes('wind') && target.def.golemType !== 'wind') {
        const windPushPx = WIND_PUSH_PX * 0.5 + this.getItemWindPushBonus() * 0.5;
        target.distanceTraveled = Math.max(0, target.distanceTraveled - windPushPx);
      }
      // Earth AoE is handled at the fusion level (fireFusionMagic already does AoE targeting)

      this.addFT(target.pos, `✨${parts.join('+')}`, proj.color);
      return;
    }

    // Single-element magic (original path)
    const c  = ELEMENT_COLORS[proj.element];

    // Item damage multipliers for magic
    const hunterMult = this.getItemHunterMult(target);
    const bossMult   = this.getItemBossMult(target);
    const itemMult   = hunterMult * bossMult;

    switch (proj.element) {
      case 'fire': {
        if (target.def.golemType === 'fire') {
          this.addFT(target.pos, '🔥IMUNE', '#ff6600');
          break;
        }
        const d = target.receiveDamage(proj.damage * itemMult, 'fire');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        if (proj.burnFromMagic) target.applyBurn(CFG_BURN_PCT_PER_SEC, CFG_BURN_DURATION);
        this.addFT(target.pos, `✨${Math.round(d)}`, c);
        // Coração de Magma: leave burn zone
        if (this.hasFireMagmaTrail()) {
          this.burnZones.push({ x: target.pos.x, y: target.pos.y, radius: 50, remaining: 4, dmgPerSec: proj.damage * 0.20 });
        }
        // Asa do Dragão Caótico: fire AoE splash
        if (this.hasFireAoeSplash()) this.applyFireAoeSplash(target, d * this.fireAoeSplashMult());
        break;
      }
      case 'water': {
        const d = target.receiveDamage(proj.damage * itemMult, 'water');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        // Medalhão da Maré Profunda: amplify slow stacks
        const slowAmp = this.getItemWaterSlowAmp();
        const slowStacks = Math.round(slowAmp);
        for (let i = 0; i < slowStacks; i++) target.addPermanentSlow();
        this.addFT(target.pos, `💧-5%vel×${slowStacks}(${target.permanentSlowStacks})`, '#66aaff');
        if (Math.random() < this.talentTree.waterPuddleChance()) {
          this.puddles.push({ x: target.pos.x, y: target.pos.y, radius: PUDDLE_RADIUS, remaining: PUDDLE_DURATION, slowAmount: CFG_PUDDLE_SLOW_AMOUNT });
        }
        // Coroa da Nevasca: freeze chance
        if (this.hasWaterFreeze() && Math.random() < this.waterFreezeChance()) {
          target.stunRemaining = Math.max(target.stunRemaining, 1.2);
          this.addFT(target.pos, `❄ CONGELADO!`, '#aaeeff');
        }
        break;
      }
      case 'earth': {
        const aoeR = EARTH_AOE_BASE * this.talentTree.earthAoERadiusMult() * (1 + this.getItemEarthRadiusBonus());
        const targets = this.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= aoeR);
        for (const t of targets) {
          const tMult = this.getItemHunterMult(t) * this.getItemBossMult(t);
          const d = t.receiveDamage(proj.damage * tMult, 'earth');
          if (tw) { tw.totalDamageDealt += d; if (t.dead) tw.totalKills++; }
          this.addFT(t.pos, `🌍${Math.round(d)}`, c);
          // Olho da Tempestade de Areia: slow + accuracy penalty
          if (this.hasEarthSandstorm()) {
            t.applyTempSlow(0.20, 5);
            (t as any)._sandstormAcc = { amount: 0.15, remaining: 5 };
          }
        }
        this.renderer.triggerAoe(target.pos.x, target.pos.y, aoeR);
        break;
      }
      case 'wind': {
        // Trombeta do Furacão: hit up to 3 aligned enemies
        const windTargets = this.hasWindChainMagic()
          ? this.findWindChainTargets(target, 3)
          : [target];
        const windDmgMult = this.hasWindChainMagic() ? this.windChainDmgMult() : 1;
        const windPushPx  = WIND_PUSH_PX + this.getItemWindPushBonus();
        const windStunDur = this.talentTree.windStunDuration() * this.getItemWindStunMult();

        for (const wt of windTargets) {
          const wtMult = this.getItemHunterMult(wt) * this.getItemBossMult(wt);
          const d = wt.receiveDamage(proj.damage * windDmgMult * wtMult, 'wind');
          if (tw) { tw.totalDamageDealt += d; if (wt.dead) tw.totalKills++; }
          if (wt.def.golemType !== 'wind') {
            wt.distanceTraveled = Math.max(0, wt.distanceTraveled - windPushPx);
            if (windStunDur > 0) wt.stunRemaining = Math.max(wt.stunRemaining, windStunDur);
            this.addFT(wt.pos, `💨-${Math.round(windPushPx / CELL_SIZE)}tiles`, '#ccee44');
          } else {
            this.addFT(wt.pos, `💨IMUNE`, '#ccee44');
          }
        }
        break;
      }
    }
  }

  /** Global explosion (Relicário do Cataclismo Elemental): 250% magic damage of strongest tower */
  private fireCataclysm() {
    if (this.enemies.length === 0) return;
    // Find tower with highest magicBaseDamage
    const strongest = this.towers.reduce<Tower | null>((best, t) => {
      if (!best) return t;
      const affM = t.computeAffinityMult(this.player.affinity);
      const bestAffM = best.computeAffinityMult(this.player.affinity);
      return t.getMagicDamage(this.player.stats, affM) > best.getMagicDamage(this.player.stats, bestAffM) ? t : best;
    }, null);
    if (!strongest) return;

    const catStacks = this.itemStacks('cataclysm_relic');
    const affM = strongest.computeAffinityMult(this.player.affinity);
    const baseMagic = strongest.getMagicDamage(this.player.stats, affM);
    const catDmg = baseMagic * 2.50 * catStacks;

    let hitCount = 0;
    for (const e of this.enemies) {
      if (!e.dead && !e.reachedEnd) {
        e.receiveDamage(catDmg, strongest.def.element);
        hitCount++;
      }
    }
    this.renderer.triggerAoe(this.map.gameWidth / 2, this.map.gameHeight / 2, Math.max(this.map.gameWidth, this.map.gameHeight));
    this.addFT({ x: this.map.gameWidth / 2, y: this.map.gameHeight / 2 }, `💥 CATACLISMO! ×${hitCount}`, '#ff6600');
  }

  /** Find up to N enemies aligned (within cone) with the primary wind target */
  private findWindChainTargets(primary: BaseEnemy, maxCount: number): BaseEnemy[] {
    const results: BaseEnemy[] = [primary];
    const towerRange = 200; // approximate
    // Sort all live enemies by proximity to primary along wind direction
    const others = this.enemies
      .filter(e => !e.dead && e !== primary && !e.reachedEnd)
      .sort((a, b) => {
        // Prefer enemies near the same Y-coordinate (path direction approximation)
        const da = Math.abs(a.pos.y - primary.pos.y) + Math.abs(a.pos.x - primary.pos.x) * 0.3;
        const db = Math.abs(b.pos.y - primary.pos.y) + Math.abs(b.pos.x - primary.pos.x) * 0.3;
        return da - db;
      });
    for (const e of others) {
      if (results.length >= maxCount) break;
      if (Math.hypot(e.pos.x - primary.pos.x, e.pos.y - primary.pos.y) <= towerRange) {
        results.push(e);
      }
    }
    return results;
  }

  private addFT(pos: Vec2, text: string, color: string) {
    this.floatingTexts.push({
      x: pos.x + (Math.random() - 0.5) * 18, y: pos.y - 20,
      text, color, life: 1.2, maxLife: 1.2,
    });
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
      getSynergyBonus: (t) => this.getSynergyBonus(t),
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
