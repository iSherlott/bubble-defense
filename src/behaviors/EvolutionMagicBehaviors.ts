// ═══════════════════════════════════════════════════════════════════════════════
//  Evolution Magic Behaviors — unique magic cast for each tower evolution
// ═══════════════════════════════════════════════════════════════════════════════

import type { MagicBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';
import { GameConfig } from '../config';

const cfg = GameConfig.get();

// ═══════════════════════════════════════════════════════════════════════════════
//  FOGO
// ═══════════════════════════════════════════════════════════════════════════════

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
    if (inRange.length > 0) {
      ctx.triggerAoeFlash(tower.pixelX, tower.pixelY, tower.getRange() * 0.5);
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
    ctx.triggerAoeFlash(target.pos.x, target.pos.y, tower.getRange() * 0.4);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ÁGUA
// ═══════════════════════════════════════════════════════════════════════════════

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
    ctx.triggerAoeFlash(target.pos.x, target.pos.y, splashR);
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
    ctx.triggerAoeFlash(target.pos.x, target.pos.y, zoneRadius);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TERRA
// ═══════════════════════════════════════════════════════════════════════════════

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
    ctx.triggerAoeFlash(target.pos.x, target.pos.y, aoeR);
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
    ctx.triggerAoeFlash(tower.pixelX, tower.pixelY, range * 0.3);
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

// ═══════════════════════════════════════════════════════════════════════════════
//  VENTO
// ═══════════════════════════════════════════════════════════════════════════════

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
    ctx.triggerAoeFlash(tower.pixelX, tower.pixelY, tower.getRange() * 0.5);
  }
}
