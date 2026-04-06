// ═══════════════════════════════════════════════════════════════════════════════
//  Fire Evolution Magic Behaviors
// ═══════════════════════════════════════════════════════════════════════════════

import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';
import { GameConfig } from '../config';

const cfg = GameConfig.get();

/**
 * Incineradora — Single heavy bolt at highest-HP enemy.
 * Applies strong burn. +50% damage if target is already burning.
 */
export class IncineratorMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    // Target highest HP enemy
    const target = inRange.reduce((a, b) => a.hp > b.hp ? a : b);
    const burning = target.effects.some(e => e.type === 'burn' && e.remaining > 0);
    const finalDmg = burning ? dmg * 1.5 : dmg;
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id, damage: finalDmg, element: 'fire',
      color: '#ff4400', isMagic: true, burnFromMagic: true,
    }));
    // Apply strong burn
    target.applyBurn(cfg.combat.burnPctPerSec * 2, cfg.combat.burnDuration * 1.5);
  }
}

/**
 * Lança-Chamas — Hits ALL enemies in range with weaker burn.
 * Damage per target is lower but covers many targets.
 */
export class FlamethrowerMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    const perTarget = dmg * 0.5; // reduced per target
    for (const t of inRange) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: perTarget, element: 'fire',
        color: '#ff8800', isMagic: true, burnFromMagic: true,
      }));
      t.applyBurn(cfg.combat.burnPctPerSec * 0.5, cfg.combat.burnDuration * 0.75);
    }
  }
}

/**
 * Fornalha Viva — Creates a persistent burn zone on ground centered on first enemy.
 * Burns enemies over time; burning enemies inside take 30% more zone damage.
 */
export class FurnaceMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    // Small direct hit
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id, damage: dmg * 0.3, element: 'fire',
      color: '#cc3300', isMagic: true, burnFromMagic: true,
    }));
    // Create persistent burn zone
    ctx.burnZones.push({
      x: target.pos.x, y: target.pos.y,
      radius: tower.getRange() * 0.4,
      remaining: 8,
      dmgPerSec: dmg * 0.12,
    });
  }
}
