// ─── TowerPlacementService — tower placement, cost, sell, move ─────────────────
// Extracted from Game.ts to isolate tower placement logic.

import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { OwnedItem } from '../types';
import { createTower } from '../entities/Tower';
import { towerRegistry } from '../registries';
import { GameConfig } from '../config';
import type { ItemSystem } from '../systems/ItemSystem';

export class TowerPlacementService {
  constructor(private itemSystem: ItemSystem) {}

  /** Find all towers at a grid cell */
  towersAt(towers: BaseTower[], col: number, row: number): BaseTower[] {
    return towers.filter(t => t.gridX === col && t.gridY === row);
  }

  /** Cost = baseCost × (count of that type already placed + 1), minus item discount */
  towerCost(typeId: string, towers: BaseTower[], items: OwnedItem[]): number {
    const count = towers.filter(t => t.def.id === typeId).length;
    const def = towerRegistry.getDef(typeId);
    const base = def.baseCost * (count + 1);
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(items))));
  }

  /** Per-tower upgrade cost: baseCost × (1 + upgradeCount × 0.2), minus item discount */
  towerUpgradeCost(tower: BaseTower | undefined, items: OwnedItem[]): number {
    if (!tower) return 50;
    const base = Math.round(tower.def.baseCost * (1 + tower.upgradeCount * 0.2));
    return Math.max(1, Math.round(base * (1 - this.itemSystem.getDiscount(items))));
  }

  /** Place a tower on the board. Returns false if placement fails. */
  placeTower(ctx: IGameContext, typeId: string, col: number, row: number, slot: 0 | 1): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (!towerRegistry.has(typeId)) return false;
    const def = towerRegistry.getDef(typeId);
    const cost = this.towerCost(def.id, ctx.towers, ctx.items);
    if (ctx.gold < cost) return false;
    ctx.gold -= cost;
    const t = createTower(def, col, row, slot);
    t.placedCost = cost;
    t.goldSpent  = cost;
    ctx.towers.push(t);
    return true;
  }

  /** Place a second tower on an occupied cell (costs 2×) */
  placeSecondTower(ctx: IGameContext, typeId: string, col: number, row: number): boolean {
    const cost = this.towerCost(typeId, ctx.towers, ctx.items) * 2;
    if (ctx.gold < cost) return false;
    ctx.gold -= cost;
    const def = towerRegistry.getDef(typeId);
    const t = createTower(def, col, row, 1);
    t.placedCost = cost;
    t.goldSpent  = cost;
    t.isSecondary = true;
    ctx.towers.push(t);
    return true;
  }

  /** Sell a tower and refund 50% of gold spent */
  sellTower(ctx: IGameContext, tower: BaseTower): void {
    const refund = Math.floor(tower.goldSpent / 2);
    ctx.gold += refund;
    ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, `+${refund}g 🏷`, '#ffdd44');
    ctx.towers = ctx.towers.filter(t => t.id !== tower.id);
  }

  /** Move all towers from a cell to another cell. Returns false if blocked. */
  moveTower(ctx: IGameContext, tower: BaseTower, col: number, row: number): boolean {
    const { cols, rows, pathCells } = ctx.map;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    if (pathCells.has(`${col},${row}`)) return false;
    if (col === tower.gridX && row === tower.gridY) return false;

    const cellTowers = this.towersAt(ctx.towers, tower.gridX, tower.gridY);
    const destTowers = this.towersAt(ctx.towers, col, row);

    if (destTowers.length > 0) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY }, 'Célula ocupada', '#ff6666');
      return false;
    }

    let totalMoveCost = 0;
    for (const t of cellTowers) {
      totalMoveCost += Math.round(t.placedCost * GameConfig.get().movement.moveCostMult);
    }
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
