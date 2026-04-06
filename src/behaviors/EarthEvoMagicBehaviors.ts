// ═══════════════════════════════════════════════════════════════════════════════
//  Earth Evolution Magic Behaviors
// ═══════════════════════════════════════════════════════════════════════════════

import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';
import { GameConfig } from '../config';

const cfg = GameConfig.get();

/**
 * Balista Rochosa — Heavy piercing bolt. Hits primary target with full damage,
 * then pierces to hit one more enemy behind for 60% damage.
 */
export class BallistaMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const inRange = tower.findAllInRange(ctx.enemies);
    if (inRange.length === 0) return;
    // Target highest HP (anti-elite focus)
    const target = inRange.reduce((a, b) => a.hp > b.hp ? a : b);
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id, damage: dmg, element: 'earth',
      color: '#886622', isMagic: true,
    }));
    // Pierce: find a second enemy near the primary target (behind it)
    const pierce = inRange.find(e => e.id !== target.id &&
      Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= 80);
    if (pierce) {
      extra.push(createProjectile({
        towerId: tower.id, startX: target.pos.x, startY: target.pos.y,
        targetEnemyId: pierce.id, damage: dmg * 0.6, element: 'earth',
        color: '#886622', isMagic: true,
      }));
    }
  }
}

/**
 * Pedreira — Broader AoE hit on all enemies in range.
 * Each hit applies 2% permanent slow (micro-stagger).
 */
export class QuarryMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    // Wider AoE than standard earth
    const aoeR = cfg.combat.earthAoeRadius * 1.4;
    const targets = ctx.enemies.filter(e =>
      !e.dead && Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= aoeR
    );
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: dmg * 0.8, element: 'earth',
        color: '#668833', isMagic: true,
      }));
      // Micro-stagger: small permanent slow
      t.addPermanentSlow();
    }
  }
}

/**
 * Monólito — Instead of dealing significant damage, buffs nearby towers.
 * Applies +15% damage and +10% fire rate to all towers within range for 5 seconds.
 * Does a small AoE hit for flavor.
 */
export class MonolithMagicBehavior implements MagicBehavior {
  /** Map of towerId → remaining buff time */
  static activeBuffs = new Map<number, { damageBuff: number; speedBuff: number; remaining: number }>();

  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    // Small AoE damage for flavor
    const target = tower.findTarget(ctx.enemies);
    if (target) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: target.id, damage: dmg, element: 'earth',
        color: '#556644', isMagic: true,
      }));
    }
    // Buff nearby towers
    const range = tower.getRange();
    let buffCount = 0;
    for (const t of ctx.towers) {
      if (t.id === tower.id) continue;
      const dx = t.pixelX - tower.pixelX, dy = t.pixelY - tower.pixelY;
      if (dx * dx + dy * dy <= range * range) {
        MonolithMagicBehavior.activeBuffs.set(t.id, {
          damageBuff: 0.15,
          speedBuff: 0.10,
          remaining: 5.0,
        });
        buffCount++;
      }
    }
    if (buffCount > 0) {
      ctx.addFT({ x: tower.pixelX, y: tower.pixelY - 20 },
        `🗿 +15%dmg +10%vel → ${buffCount} torres`, '#99cc44');
    }
  }

  /** Call from CombatSystem each frame to tick down buffs */
  static updateBuffs(dt: number): void {
    for (const [id, buff] of MonolithMagicBehavior.activeBuffs) {
      buff.remaining -= dt;
      if (buff.remaining <= 0) MonolithMagicBehavior.activeBuffs.delete(id);
    }
  }

  /** Get active buff for a tower (used by CombatSystem for damage/speed calc) */
  static getBuff(towerId: number): { damageBuff: number; speedBuff: number } | null {
    return MonolithMagicBehavior.activeBuffs.get(towerId) ?? null;
  }
}
