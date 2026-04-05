import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';

// ─── Fire Magic: 3-target (first, middle, last in range) ────────────────────

export class FireMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const burnOnMag = ctx.talentTree.fireBurnOnMagic();
    for (const t of tower.findFireMagicTargets(ctx.enemies)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: dmg, element: 'fire',
        color: '#ff8833', isMagic: true, burnFromMagic: burnOnMag,
      }));
    }
  }
}

// ─── Water Magic: single target slow ─────────────────────────────────────────

export class WaterMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const t = tower.findTarget(ctx.enemies);
    if (t) extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: t.id, damage: dmg, element: 'water',
      color: '#44ccff', isMagic: true,
    }));
  }
}

// ─── Earth Magic: AoE damage ─────────────────────────────────────────────────

export class EarthMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const t = tower.findTarget(ctx.enemies);
    if (t) extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: t.id, damage: dmg, element: 'earth',
      color: '#aabb44', isMagic: true,
    }));
  }
}

// ─── Wind Magic: single target push ──────────────────────────────────────────

export class WindMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const t = tower.findTarget(ctx.enemies);
    if (t) extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: t.id, damage: dmg, element: 'wind',
      color: '#eeff44', isMagic: true,
    }));
  }
}
