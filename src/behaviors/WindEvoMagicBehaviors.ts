// ═══════════════════════════════════════════════════════════════════════════════
//  Wind Evolution Magic Behaviors
// ═══════════════════════════════════════════════════════════════════════════════

import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';

/**
 * Arpão Tempestivo — Fires 3 rapid magic bolts at different targets.
 * +30% damage against fast enemies (speed > 2.5).
 */
export class HarpoonMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    // Pick up to 3 different targets
    const targets = inRange.slice(0, 3);
    // Fill remaining slots if fewer than 3 targets
    while (targets.length < 3 && inRange.length > 0) {
      targets.push(inRange[0]);
    }
    for (const t of targets) {
      const isFast = t.baseSpeed > 2.5;
      const finalDmg = isFast ? dmg * 1.3 : dmg;
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: finalDmg * 0.5, element: 'wind',
        color: '#ccee44', isMagic: true,
      }));
    }
  }
}

/**
 * Tempestade de Lâminas — Ricochet: hits primary, then bounces to up to 3 more enemies.
 * 20% damage falloff per bounce.
 */
export class BladeStormMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    const maxBounces = 3;
    const hitSet = new Set<number>();
    let currentTarget = inRange[0];
    let currentDmg = dmg;
    // First hit
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: currentTarget.id, damage: currentDmg, element: 'wind',
      color: '#aaddaa', isMagic: true,
    }));
    hitSet.add(currentTarget.id);
    // Bounces
    for (let b = 0; b < maxBounces; b++) {
      currentDmg *= 0.8; // 20% falloff
      // Find nearest unhit enemy to current target
      let nearest = null;
      let nearDist = Infinity;
      for (const e of inRange) {
        if (hitSet.has(e.id)) continue;
        const d = Math.hypot(e.pos.x - currentTarget.pos.x, e.pos.y - currentTarget.pos.y);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (!nearest) break;
      extra.push(createProjectile({
        towerId: tower.id, startX: currentTarget.pos.x, startY: currentTarget.pos.y,
        targetEnemyId: nearest.id, damage: currentDmg, element: 'wind',
        color: '#aaddaa', isMagic: true,
      }));
      hitSet.add(nearest.id);
      currentTarget = nearest;
    }
  }
}

/**
 * Ciclone Tático — Creates wind projectiles for ALL enemies in range.
 * Push is handled by projectile hit (via CombatSystem wind resolution + applyPush).
 * Applies temp slow on impact. Every 3rd cast, slow is stronger.
 * No direct push here — avoids double-push exploit.
 */
export class TacticalCycloneMagicBehavior implements MagicBehavior {
  private castCount = 0;

  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    this.castCount++;
    const isStrongCast = this.castCount % 3 === 0;
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    for (const t of inRange) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: dmg * 0.35, element: 'wind',
        color: '#77ccaa', isMagic: true,
      }));
      // Only apply slow here; push comes from projectile hit resolution
      if (t.def.golemType !== 'wind') {
        t.applyTempSlow(isStrongCast ? 0.18 : 0.12, 2);
      }
    }
    const label = isStrongCast ? '💨 CICLONE FORTE!' : '💨 Ciclone';
    ctx.addFT({ x: tower.pixelX, y: tower.pixelY - 20 }, label, '#77ccaa');
  }
}
