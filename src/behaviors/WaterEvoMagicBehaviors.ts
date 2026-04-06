// ═══════════════════════════════════════════════════════════════════════════════
//  Water Evolution Magic Behaviors
// ═══════════════════════════════════════════════════════════════════════════════

import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';

/**
 * Criomante — Double slow stacks on hit. Every 3rd magic cast on same target freezes briefly.
 * Bosses/elites get half-duration freeze.
 */
export class CryomancerMagicBehavior implements MagicBehavior {
  private hitCounts = new Map<number, number>();

  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id, damage: dmg, element: 'water',
      color: '#88ddff', isMagic: true,
    }));
    // Double slow stacks
    target.addPermanentSlow();
    target.addPermanentSlow();
    // Freeze on every 3rd hit
    const prevHits = this.hitCounts.get(target.id) ?? 0;
    const newHits = prevHits + 1;
    this.hitCounts.set(target.id, newHits);
    if (newHits >= 3) {
      this.hitCounts.set(target.id, 0);
      const freezeDur = (target.def.isBoss || target.def.isElite) ? 0.5 : 1.0;
      target.stunRemaining = Math.max(target.stunRemaining, freezeDur);
      ctx.addFT(target.pos, '❄ CONGELADO!', '#aaeeff');
    }
    // Clean up dead enemies periodically
    if (this.hitCounts.size > 100) {
      for (const [id] of this.hitCounts) {
        if (!ctx.enemies.some(e => e.id === id && !e.dead)) this.hitCounts.delete(id);
      }
    }
  }
}

/**
 * Maré Pressurizada — Small splash AoE with moderate slow.
 * Damage + control balanced.
 */
export class PressureTideMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    // Find all enemies near the primary target (splash radius)
    const splashR = 60;
    const splashed = ctx.enemies.filter(e =>
      !e.dead && !e.reachedEnd &&
      Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= splashR
    );
    for (const t of splashed) {
      const dist = Math.hypot(t.pos.x - target.pos.x, t.pos.y - target.pos.y);
      const falloff = t === target ? 1.0 : Math.max(0.5, 1 - dist / splashR);
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: dmg * falloff, element: 'water',
        color: '#2288cc', isMagic: true,
      }));
      t.addPermanentSlow();
    }
  }
}

/**
 * Poço Abissal — Creates a vortex zone that applies slow and vulnerability.
 * Enemies inside take 15% more damage from all sources.
 */
export class AbyssalWellMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    // Light direct damage
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id, damage: dmg * 0.5, element: 'water',
      color: '#0066aa', isMagic: true,
    }));
    // Create debuff puddle with heavy slow
    const zoneRadius = tower.getRange() * 0.35;
    ctx.puddles.push({
      x: target.pos.x, y: target.pos.y,
      radius: zoneRadius,
      remaining: 10,
      slowAmount: 0.12,
    });
    // Apply vulnerability via temporary damage reduction (inverted: negative = more damage)
    const inZone = ctx.enemies.filter(e =>
      !e.dead && !e.reachedEnd &&
      Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= zoneRadius
    );
    for (const e of inZone) {
      e.tempDamageReduction = Math.min(e.tempDamageReduction, -0.15);
      e.addPermanentSlow();
    }
    ctx.addFT(target.pos, '🌀 Vulnerável -15% res', '#0066aa');
  }
}
