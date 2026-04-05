import type { Vec2, OwnedItem } from '../types';
import { Tower, FusionTower, createTower } from '../entities/Tower';
import type { MapData } from '../game/MapGenerator';
import type { Player } from '../player/Player';
import { towerRegistry, fusionRegistry } from '../registries';
import { GameConfig } from '../config';
import { UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS } from '../constants';
import type { ItemSystem } from '../systems/ItemSystem';

// ── Context the service reads/writes ─────────────────────────────────────────
export interface PlacementContext {
  towers: Tower[];
  gold: number;
  map: MapData;
  player: Player;
  items: OwnedItem[];
  selectedTowerType: string;
  addFT(pos: Vec2, text: string, color: string): void;
}

// ─────────────────────────────────────────────────────────────────────────────

export class TowerPlacementService {
  constructor(private itemSystem: ItemSystem) {}

  // ── Query helpers ───────────────────────────────────────────────────────────
  towersAt(ctx: PlacementContext, col: number, row: number): Tower[] {
    return ctx.towers.filter(t => t.gridX === col && t.gridY === row);
  }

  towerCost(ctx: PlacementContext, typeId: string): number {
    const count = ctx.towers.filter(t => t.def.id === typeId).length;
    const def = towerRegistry.getDef(typeId);
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(ctx.items))));
  }

  towerUpgradeCost(ctx: PlacementContext, tower?: Tower): number {
    if (!tower) return 50;
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.2));
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(ctx.items))));
  }

  canFuse(ctx: PlacementContext, col: number, row: number): boolean {
    const here = this.towersAt(ctx, col, row);
    if (here.length !== 2) return false;
    const primary   = here.find(t => !t.isSecondary);
    const secondary = here.find(t =>  t.isSecondary);
    if (!primary || !secondary) return false;
    if (!primary.isMaxLevel || !secondary.isMaxLevel) return false;
    if (primary.fusionDef) return false;
    return fusionRegistry.has(primary.def.element, secondary.def.element);
  }

  // ── Normalize ───────────────────────────────────────────────────────────────
  /** Ensures slot consistency after any operation that changes towers in a cell. */
  normalizeCell(ctx: PlacementContext, col: number, row: number) {
    const here = this.towersAt(ctx, col, row);
    if (here.length === 1) {
      here[0].isSecondary = false;
      here[0].moveTo(col, row, 0);
    } else if (here.length === 2) {
      here[0].isSecondary = false;
      here[0].moveTo(col, row, 0);
      here[1].isSecondary = true;
      here[1].moveTo(col, row, 1);
    }
  }

  // ── Mutation operations ─────────────────────────────────────────────────────
  place(ctx: PlacementContext, col: number, row: number): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (!ctx.selectedTowerType) return false;
    if (!towerRegistry.has(ctx.selectedTowerType)) return false;
    const def = towerRegistry.getDef(ctx.selectedTowerType);
    const cost = this.towerCost(ctx, def.id);
    if (ctx.gold < cost) return false;
    ctx.gold -= cost;
    const t = createTower(def, col, row, 0);
    t.placedCost = cost;
    t.goldSpent  = cost;
    ctx.towers.push(t);
    return true;
  }

  placeSecond(ctx: PlacementContext, col: number, row: number, typeId: string): boolean {
    if (!towerRegistry.has(typeId)) return false;
    const def  = towerRegistry.getDef(typeId);
    const cost = this.towerCost(ctx, typeId) * 2;
    if (ctx.gold < cost) return false;
    ctx.gold -= cost;
    const t = createTower(def, col, row, 1);
    t.placedCost  = cost;
    t.goldSpent   = cost;
    t.isSecondary = true;
    ctx.towers.push(t);
    this.normalizeCell(ctx, col, row);
    return true;
  }

  sell(ctx: PlacementContext, tower: Tower): void {
    const refund = Math.floor(tower.goldSpent / 2);
    ctx.gold += refund;
    ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, `+${refund}g 🏷`, '#ffdd44');
    const col = tower.gridX, row = tower.gridY;
    ctx.towers = ctx.towers.filter(t => t.id !== tower.id);
    this.normalizeCell(ctx, col, row);
  }

  move(ctx: PlacementContext, tower: Tower, col: number, row: number): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (col === tower.gridX && row === tower.gridY) return false;
    if (this.towersAt(ctx, col, row).length > 0) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, 'Célula ocupada', '#ff6666');
      return false;
    }

    const srcCol = tower.gridX, srcRow = tower.gridY;
    const cellTowers = this.towersAt(ctx, srcCol, srcRow);
    const totalMoveCost = cellTowers.reduce(
      (s, t) => s + Math.round(t.placedCost * GameConfig.get().movement.moveCostMult), 0,
    );
    if (ctx.gold < totalMoveCost) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, `Sem ouro (${totalMoveCost}g)`, '#ff6666');
      return false;
    }
    ctx.gold -= totalMoveCost;

    for (const t of cellTowers) t.moveTo(col, row, t.slotIndex);
    this.normalizeCell(ctx, col, row);
    ctx.addFT(
      { x: cellTowers[0].pixelX, y: cellTowers[0].pixelY },
      `Movido (-${totalMoveCost}g)`, '#aaccff',
    );
    return true;
  }

  upgrade(ctx: PlacementContext, tower: Tower): void {
    if (tower.isMaxLevel) return;
    const stat: 'damage' | 'speed' = Math.random() < 0.5 ? 'damage' : 'speed';
    if (stat === 'damage') tower.damageMult += UPGRADE_MULT_STEP;
    else                   tower.speedMult  += UPGRADE_MULT_STEP;
    tower.upgradeCount++;
    tower.upgradeHistory.push(stat);

    const lvlMsg = tower.isMaxLevel ? '★ Nível MÁX!' : `Nível ${tower.level}`;
    const statLabel = stat === 'damage' ? '⚔ Dano' : '⚡ Vel';
    ctx.addFT(
      { x: tower.pixelX, y: tower.pixelY - 24 },
      `${lvlMsg} +${statLabel}`,
      stat === 'damage' ? '#ff8888' : '#88ccff',
    );

    if (!tower.dualMagic) {
      const chance = DUAL_MAGIC_BASE_CHANCE + ctx.player.stats.luck * DUAL_MAGIC_LUCK_BONUS;
      if (Math.random() < chance) {
        tower.dualMagic = true;
        ctx.addFT({ x: tower.pixelX, y: tower.pixelY - 30 }, '✨ DUAL MAGIA!', '#ffff44');
      }
    }
  }

  fuse(ctx: PlacementContext, col: number, row: number): boolean {
    if (!this.canFuse(ctx, col, row)) return false;
    const here      = this.towersAt(ctx, col, row);
    const primary   = here.find(t => !t.isSecondary)!;
    const secondary = here.find(t =>  t.isSecondary)!;
    const fusion    = fusionRegistry.getDef(primary.def.element, secondary.def.element);
    if (!fusion) return false;

    const ft = new FusionTower(primary.def, col, row, fusion);
    ft.damageMult      = primary.damageMult;
    ft.speedMult       = primary.speedMult;
    ft.upgradeCount    = primary.upgradeCount;
    ft.upgradeHistory  = [...primary.upgradeHistory];
    ft.dualMagic       = primary.dualMagic;
    ft.placedCost      = primary.placedCost;
    ft.goldSpent       = primary.goldSpent + secondary.goldSpent;
    ft.totalDamageDealt = primary.totalDamageDealt + secondary.totalDamageDealt;
    ft.totalKills      = primary.totalKills + secondary.totalKills;
    ft.isSecondary     = false;

    ctx.towers = ctx.towers.filter(t => t.id !== primary.id && t.id !== secondary.id);
    ctx.towers.push(ft);

    ctx.addFT({ x: ft.pixelX, y: ft.pixelY - 30 }, `${fusion.icon} FUSÃO: ${fusion.name}!`, fusion.color);
    ctx.addFT({ x: ft.pixelX, y: ft.pixelY - 50 }, fusion.description, '#ddddff');
    return true;
  }
}
