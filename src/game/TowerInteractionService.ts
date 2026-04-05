// ─── TowerInteractionService — tower upgrade, fusion ──────────────────────────
// Extracted from Game.ts to isolate upgrade/fusion logic.

import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import { FusionTower } from '../entities/towers/FusionTower';
import { fusionRegistry } from '../registries';
import { UPGRADE_MULT_STEP, DUAL_MAGIC_BASE_CHANCE, DUAL_MAGIC_LUCK_BONUS } from '../constants';

export class TowerInteractionService {

  /** Apply a random upgrade (damage or speed) to a tower */
  upgradeTower(ctx: IGameContext, tower: BaseTower): void {
    if (tower.isMaxLevel) return;
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
  }

  /** Check if a cell with 2 max-level towers can fuse */
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

  /** Perform fusion on a cell */
  fuseTowers(ctx: IGameContext, col: number, row: number): void {
    if (!this.canFuse(ctx.towers, col, row)) return;
    const here = ctx.towers.filter(t => t.gridX === col && t.gridY === row);
    const primary = here.find(t => !t.isSecondary)!;
    const secondary = here.find(t => t.isSecondary)!;
    const fusion = fusionRegistry.getDef(primary.def.element, secondary.def.element);
    if (!fusion) return;

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
  }
}
