// ─── TowerService — single source of truth for tower lifecycle ─────────────────
// Unified from TowerPlacementService + TowerInteractionService.
// API: canPlace, placeTower, canUpgrade, upgradeTower, canFuse, fuseTowers,
//      sellTower, moveTower, towersAt, towerCost, towerUpgradeCost.

import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { OwnedItem } from '../types';
import { createTower } from '../factories/TowerFactory';
import { towerRegistry, fusionRegistry, evolutionRegistry } from '../registries';
import { GameConfig } from '../config';
import { UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS, MAP_EXPAND_COST } from '../constants';
import { FusionTower } from '../entities/towers/FusionTower';
import type { ItemSystem } from '../systems/ItemSystem';

export class TowerService {
  constructor(private itemSystem: ItemSystem) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  /** All towers occupying a grid cell */
  towersAt(towers: BaseTower[], col: number, row: number): BaseTower[] {
    return towers.filter(t => t.gridX === col && t.gridY === row);
  }

  /** Dynamic purchase cost: baseCost × (count+1), minus item discount */
  towerCost(typeId: string, towers: BaseTower[], items: OwnedItem[]): number {
    const count = towers.filter(t => t.def.id === typeId).length;
    const def = towerRegistry.getDef(typeId);
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(items))));
  }

  /** Per-tower upgrade cost: baseCost × (1 + upgCount × 0.2), minus item discount.
   *  After evolution, an extra multiplier is applied (postEvolutionCostMult). */
  towerUpgradeCost(tower: BaseTower | undefined, items: OwnedItem[]): number {
    if (!tower) return 50;
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.2));
    const evoMul = tower.evolutionDef ? GameConfig.get().tower.postEvolutionCostMult : 1;
    return Math.max(1, Math.round(base * evoMul * (1 - this.itemSystem.getDiscount(items))));
  }

  /** Is the cell full? (max 2 towers per cell) */
  isCellFull(towers: BaseTower[], col: number, row: number): boolean {
    return this.towersAt(towers, col, row).length >= 2;
  }

  /** Total gold cost to move all towers in a cell */
  getMoveCost(towers: BaseTower[]): number {
    return towers.reduce((s, t) => s + Math.round(t.placedCost * GameConfig.get().movement.moveCostMult), 0);
  }

  /** Refund amount when selling a tower (50% of gold spent) */
  getSellRefund(tower: BaseTower): number {
    return Math.floor(tower.goldSpent / 2);
  }

  /** Discounted map expansion cost, accounting for item discounts */
  getMapExpandCost(items: OwnedItem[]): number {
    return Math.round(MAP_EXPAND_COST * (1 - this.itemSystem.getDiscount(items)));
  }

  /** Can a tower be placed at this cell? (bounds, path, gold, occupancy, slot integrity) */
  canPlace(ctx: IGameContext, typeId: string, col: number, row: number, slot: 0 | 1): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (!towerRegistry.has(typeId)) return false;
    if (this.isCellFull(ctx.towers, col, row)) return false;

    // Slot integrity: slot 1 requires a primary tower (slot 0) already present
    if (slot === 1) {
      const here = this.towersAt(ctx.towers, col, row);
      const hasPrimary = here.some(t => !t.isSecondary);
      if (!hasPrimary) return false;
    }

    const cost = slot === 1
      ? this.towerCost(typeId, ctx.towers, ctx.items) * 2
      : this.towerCost(typeId, ctx.towers, ctx.items);
    return ctx.gold >= cost;
  }

  /** Can this tower be upgraded? (not maxed, enough gold, not needing evolution) */
  canUpgrade(ctx: IGameContext, tower: BaseTower): boolean {
    if (tower.isMaxLevel) return false;
    if (tower.needsEvolution) return false;
    const cost = this.towerUpgradeCost(tower, ctx.items);
    return ctx.gold >= cost;
  }

  /** Can the two towers on a cell fuse? */
  canFuse(towers: BaseTower[], col: number, row: number): boolean {
    const here = towers.filter(t => t.gridX === col && t.gridY === row);
    if (here.length !== 2) return false;
    const primary = here.find(t => !t.isSecondary);
    const secondary = here.find(t => t.isSecondary);
    if (!primary || !secondary) return false;
    if (!primary.isMaxLevel || !secondary.isMaxLevel) return false;
    if (primary.fusionDef) return false;
    return fusionRegistry.has(primary.def.element, secondary.def.element);
  }

  // ─── Commands ──────────────────────────────────────────────────────────────

  /**
   * Place a tower on the board.
   * slot 0 = primary, slot 1 = secondary (costs 2×, marked isSecondary).
   */
  placeTower(ctx: IGameContext, typeId: string, col: number, row: number, slot: 0 | 1): boolean {
    if (!this.canPlace(ctx, typeId, col, row, slot)) return false;
    const def = towerRegistry.getDef(typeId);
    const cost = slot === 1
      ? this.towerCost(def.id, ctx.towers, ctx.items) * 2
      : this.towerCost(def.id, ctx.towers, ctx.items);
    ctx.gold -= cost;
    const t = createTower(def, col, row, slot);
    t.placedCost = cost;
    t.goldSpent  = cost;
    if (slot === 1) t.isSecondary = true;
    ctx.towers.push(t);
    return true;
  }

  /**
   * Upgrade a tower (random damage/speed). Deducts gold, tracks goldSpent.
   * Returns false if the tower can't be upgraded.
   */
  upgradeTower(ctx: IGameContext, tower: BaseTower): boolean {
    if (!this.canUpgrade(ctx, tower)) return false;

    const cost = this.towerUpgradeCost(tower, ctx.items);
    ctx.gold -= cost;
    tower.goldSpent += cost;

    const stat: 'damage' | 'speed' = Math.random() < 0.5 ? 'damage' : 'speed';
    if (stat === 'damage') tower.damageMult += UPGRADE_MULT_STEP;
    else                   tower.speedMult  += UPGRADE_MULT_STEP;
    tower.upgradeCount++;
    tower.upgradeHistory.push(stat);

    const statLabel = stat === 'damage' ? '⚔ Dano' : '⚡ Vel';
    const lvlMsg = tower.isMaxLevel ? `★ Nível MÁX!` : `Nível ${tower.level}`;
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
    return true;
  }

  /** Evolution cost: baseCost × evolutionCostMult, minus item discount */
  evolutionCost(tower: BaseTower, items: OwnedItem[]): number {
    const base = tower.def.baseCost * GameConfig.get().tower.evolutionCostMult;
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(items))));
  }

  /** Apply an evolution to a tower. Costs gold (evolutionCostMult × baseCost). */
  evolveTower(ctx: IGameContext, tower: BaseTower, evolutionId: string): boolean {
    if (!tower.needsEvolution) return false;
    const evoDef = evolutionRegistry.get(evolutionId);
    if (!evoDef) return false;
    if (evoDef.element !== tower.def.element) return false;

    const cost = this.evolutionCost(tower, ctx.items);
    if (ctx.gold < cost) return false;
    ctx.gold -= cost;
    tower.goldSpent += cost;

    tower.evolutionDef = evoDef;

    ctx.addFT(
      { x: tower.pixelX, y: tower.pixelY - 30 },
      `${evoDef.icon} EVOLUÇÃO: ${evoDef.name}!`, evoDef.color,
    );
    ctx.addFT(
      { x: tower.pixelX, y: tower.pixelY - 50 },
      evoDef.roleLabel, '#ddddff',
    );
    return true;
  }

  /** Fuse the two towers on a cell into a FusionTower */
  fuseTowers(ctx: IGameContext, col: number, row: number): boolean {
    if (!this.canFuse(ctx.towers, col, row)) return false;
    const here = ctx.towers.filter(t => t.gridX === col && t.gridY === row);
    const primary = here.find(t => !t.isSecondary)!;
    const secondary = here.find(t => t.isSecondary)!;
    const fusion = fusionRegistry.getDef(primary.def.element, secondary.def.element);
    if (!fusion) return false;

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
    ft.cooldown       = primary.cooldown;
    ft.magicBar       = primary.magicBar;
    ft.evolutionDef   = primary.evolutionDef;

    ctx.towers = ctx.towers.filter(t => t.id !== primary.id && t.id !== secondary.id);
    ctx.towers.push(ft);

    ctx.addFT(
      { x: ft.pixelX, y: ft.pixelY - 30 },
      `${fusion.icon} FUSÃO: ${fusion.name}!`, fusion.color,
    );
    ctx.addFT(
      { x: ft.pixelX, y: ft.pixelY - 50 },
      fusion.description, '#ddddff',
    );
    return true;
  }

  /** Sell a tower and refund 50% of gold spent. Promotes secondary to primary if needed. */
  sellTower(ctx: IGameContext, tower: BaseTower): void {
    const refund = Math.floor(tower.goldSpent / 2);
    ctx.gold += refund;
    ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, `+${refund}g 🏷`, '#ffdd44');
    ctx.towers = ctx.towers.filter(t => t.id !== tower.id);

    // If we sold the primary (slot 0), promote the remaining secondary to primary
    if (!tower.isSecondary) {
      const remaining = this.towersAt(ctx.towers, tower.gridX, tower.gridY);
      const orphan = remaining.find(t => t.isSecondary);
      if (orphan) {
        orphan.isSecondary = false;
        orphan.slotIndex = 0;
      }
    }
  }

  /** Move all towers from source cell to destination. Returns false if blocked. */
  moveTower(ctx: IGameContext, tower: BaseTower, col: number, row: number): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (col === tower.gridX && row === tower.gridY) return false;

    const cellTowers = this.towersAt(ctx.towers, tower.gridX, tower.gridY);
    const destTowers = this.towersAt(ctx.towers, col, row);

    // Destination must have room for all towers being moved
    if (destTowers.length + cellTowers.length > 2) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, 'Célula ocupada', '#ff6666');
      return false;
    }

    let totalMoveCost = this.getMoveCost(cellTowers);
    if (ctx.gold < totalMoveCost) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, `Sem ouro (${totalMoveCost}g)`, '#ff6666');
      return false;
    }
    ctx.gold -= totalMoveCost;

    for (const t of cellTowers) {
      t.moveTo(col, row, t.slotIndex);
    }
    ctx.addFT(
      { x: cellTowers[0].pixelX, y: cellTowers[0].pixelY },
      `Movido (-${totalMoveCost}g)`, '#aaccff',
    );
    return true;
  }
}
