// ════════════════════════════════════════════════════════════════════════════
//  Golem Anchor Behaviors — elemental aura/support mechanics for golem enemies
// ════════════════════════════════════════════════════════════════════════════

import type { EnemyBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

// ─── Fire Anchor (Golem de Fogo) ─────────────────────────────────────────────
// Offensive fire anchor: allies within 130 px are driven into a fiery rush
// (+12% speed) and are immune to burn.
// "Fúria Ígnea": constant speed pressure + burn cleanse.

export class FireAnchorBehavior implements EnemyBehavior {
  id = 'fire_anchor';
  private static RADIUS_SQ = 130 * 130;
  private static SPEED_BONUS = 1.12;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < FireAnchorBehavior.RADIUS_SQ) {
        // Fire fury — constant speed push
        ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, FireAnchorBehavior.SPEED_BONUS);
        // Strip burn effects
        ally.effects = ally.effects.filter(e => e.type !== 'burn');
      }
    }
  }
}

// ─── Water Anchor (Golem de Água) ────────────────────────────────────────────
// Periodically heals nearby allies and removes burn/slow.

export class WaterAnchorBehavior implements EnemyBehavior {
  id = 'water_anchor';
  private static INTERVAL  = 3.5;
  private static RADIUS_SQ = 110 * 110;
  private static HEAL_PCT  = 0.018; // 1.8 % maxHp

  private healTimers = new Map<number, number>();

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    let t = this.healTimers.get(enemy.id) ?? WaterAnchorBehavior.INTERVAL * 0.6;
    t -= dt;
    if (t > 0) { this.healTimers.set(enemy.id, t); return; }

    this.healTimers.set(enemy.id, WaterAnchorBehavior.INTERVAL);
    for (const ally of ctx.enemies) {
      if (ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < WaterAnchorBehavior.RADIUS_SQ) {
        ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * WaterAnchorBehavior.HEAL_PCT);
        ally.effects = ally.effects.filter(e => e.type !== 'burn');
      }
    }
    ctx.addFT(enemy.pos, '💧 Âncora', '#4488ff');
  }
}

// ─── Earth Anchor (Golem de Terra) ───────────────────────────────────────────
// Generates a stone ward that reduces incoming damage for nearby allies.

export class EarthAnchorBehavior implements EnemyBehavior {
  id = 'earth_anchor';
  private static RADIUS_SQ = 100 * 100;
  private static REDUCTION = 0.18; // 18 % less damage

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < EarthAnchorBehavior.RADIUS_SQ) {
        ally.tempDamageReduction = Math.max(ally.tempDamageReduction, EarthAnchorBehavior.REDUCTION);
      }
    }
  }
}

// ─── Wind Anchor (Golem de Vento) ─────────────────────────────────────────────
// Periodically sends a gust that accelerates nearby allies for a short window.

export class WindAnchorBehavior implements EnemyBehavior {
  id = 'wind_anchor';
  private static GUST_INTERVAL  = 3.0;
  private static GUST_DURATION  = 1.5;
  private static RADIUS_SQ      = 120 * 120;
  private static SPEED_BONUS    = 1.25;

  // Per-golem: { gustTimer, gustRemaining }
  private state = new Map<number, { gustTimer: number; gustRemaining: number }>();

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    let s = this.state.get(enemy.id);
    if (!s) { s = { gustTimer: WindAnchorBehavior.GUST_INTERVAL, gustRemaining: 0 }; this.state.set(enemy.id, s); }

    if (s.gustRemaining > 0) {
      s.gustRemaining -= dt;
      // Apply gust boost to nearby allies
      for (const ally of ctx.enemies) {
        if (ally === enemy || ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < WindAnchorBehavior.RADIUS_SQ) {
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, WindAnchorBehavior.SPEED_BONUS);
        }
      }
    } else {
      s.gustTimer -= dt;
      if (s.gustTimer <= 0) {
        s.gustTimer = WindAnchorBehavior.GUST_INTERVAL;
        s.gustRemaining = WindAnchorBehavior.GUST_DURATION;
        ctx.addFT(enemy.pos, '💨 Rajada!', '#aaffaa');
      }
    }
  }
}
