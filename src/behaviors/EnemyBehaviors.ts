import type { EnemyBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType } from '../types';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { createEnemy } from '../factories/EnemyFactory';
import { enemyRegistry } from '../registries';

/** Disabler aura radius in pixels */
const DISABLER_AURA_RADIUS = 120;
/** How long (in seconds) the disable effect lingers after leaving the aura */
const DISABLER_LINGER_DURATION = 0.5;
/** Secondary ally-effect radius for disablers */
const DISABLER_ALLY_RADIUS = 100;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

// ════════════════════════════════════════════════════════════════════════════
//  STANDARD ENEMY TACTICAL BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

// ─── Flight Instinct (Goblin) ─────────────────────────────────────────────────
// When isolated (< 2 allies within radius), the goblin picks up speed.

export class FlightInstinctBehavior implements EnemyBehavior {
  id = 'flight_instinct';
  private static ALLY_RADIUS_SQ = 90 * 90;
  private static ISOLATION_THRESHOLD = 2;
  private static SPEED_BONUS = 1.25;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    let nearbyAllies = 0;
    for (const other of ctx.enemies) {
      if (other === enemy || other.dead) continue;
      if (distSq(other.pos.x, other.pos.y, enemy.pos.x, enemy.pos.y) < FlightInstinctBehavior.ALLY_RADIUS_SQ) {
        nearbyAllies++;
        if (nearbyAllies >= FlightInstinctBehavior.ISOLATION_THRESHOLD) return;
      }
    }
    // Isolated — boost speed
    enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, FlightInstinctBehavior.SPEED_BONUS);
  }
}

// ─── Thick Hide (Troll) ───────────────────────────────────────────────────────
// After staying undamaged for 3 s the troll slowly regenerates up to 75 % HP.

export class ThickHideBehavior implements EnemyBehavior {
  id = 'thick_hide';
  private static REGEN_DELAY  = 3.0;   // seconds of quiet before regen starts
  private static REGEN_RATE   = 0.007; // 0.7 % maxHp/s
  private static REGEN_CAP    = 0.75;  // never regen above 75 % HP

  onUpdate(_ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (enemy.lastDamageTimer < ThickHideBehavior.REGEN_DELAY) return;
    const cap = enemy.maxHp * ThickHideBehavior.REGEN_CAP;
    if (enemy.hp >= cap) return;
    enemy.hp = Math.min(cap, enemy.hp + enemy.maxHp * ThickHideBehavior.REGEN_RATE * dt);
  }
}

// ─── Lateral Burst (Harpy) ────────────────────────────────────────────────────
// Periodically lunges forward, varying its pacing and making it harder to track.

export class LateralBurstBehavior implements EnemyBehavior {
  id = 'lateral_burst';
  private static INTERVAL_MIN = 2.5;
  private static INTERVAL_MAX = 4.0;
  private static BURST_DUR    = 0.65;
  private static SPEED_BONUS  = 1.38;

  private state = new Map<number, { cooldown: number; burstRemaining: number }>();

  onUpdate(_ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    let s = this.state.get(enemy.id);
    if (!s) {
      s = { cooldown: 1.5 + Math.random() * 2, burstRemaining: 0 };
      this.state.set(enemy.id, s);
    }
    if (s.burstRemaining > 0) {
      s.burstRemaining -= dt;
      enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, LateralBurstBehavior.SPEED_BONUS);
    } else {
      s.cooldown -= dt;
      if (s.cooldown <= 0) {
        s.cooldown = LateralBurstBehavior.INTERVAL_MIN +
          Math.random() * (LateralBurstBehavior.INTERVAL_MAX - LateralBurstBehavior.INTERVAL_MIN);
        s.burstRemaining = LateralBurstBehavior.BURST_DUR;
      }
    }
  }
}

// ─── Defensive Aura (Rocky Shielder) ─────────────────────────────────────────
// Allies directly behind or beside the shielder take less damage.

export class DefensiveAuraBehavior implements EnemyBehavior {
  id = 'defensive_aura';
  private static RADIUS_SQ = 85 * 85;
  private static REDUCTION = 0.20; // 20 % less damage

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < DefensiveAuraBehavior.RADIUS_SQ) {
        ally.tempDamageReduction = Math.max(ally.tempDamageReduction, DefensiveAuraBehavior.REDUCTION);
      }
    }
  }
}

// ─── Tidal Rite (Tide Shaman) ────────────────────────────────────────────────
// Periodically heals nearby allies and strips burn effects from them.

export class TidalRiteBehavior implements EnemyBehavior {
  id = 'tidal_rite';
  private static INTERVAL  = 3.2;
  private static RADIUS_SQ = 120 * 120;
  private static HEAL_PCT  = 0.025; // 2.5 % maxHp per pulse

  private healTimer = new Map<number, number>();

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    let t = this.healTimer.get(enemy.id) ?? TidalRiteBehavior.INTERVAL * 0.5;
    t -= dt;
    if (t > 0) { this.healTimer.set(enemy.id, t); return; }

    // Pulse
    this.healTimer.set(enemy.id, TidalRiteBehavior.INTERVAL);
    for (const ally of ctx.enemies) {
      if (ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < TidalRiteBehavior.RADIUS_SQ) {
        ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * TidalRiteBehavior.HEAL_PCT);
        // Strip burn
        ally.effects = ally.effects.filter(e => e.type !== 'burn');
      }
    }
    ctx.addFT(enemy.pos, '💧 Rito!', '#44aaff');
  }
}

// ─── Upcurrent (Storm Ranger) ─────────────────────────────────────────────────
// The storm ranger's slipstream accelerates nearby allies.

export class UpcurrentBehavior implements EnemyBehavior {
  id = 'upcurrent';
  private static RADIUS_SQ = 100 * 100;
  private static SPEED_BONUS = 1.15;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < UpcurrentBehavior.RADIUS_SQ) {
        ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, UpcurrentBehavior.SPEED_BONUS);
      }
    }
  }
}

// ─── Reactive Shadow (Shadow Golem / Dark Golem) ─────────────────────────────
// Reads the element most used by nearby towers and resists it by ~35 %.

export class ReactiveShadowBehavior implements EnemyBehavior {
  id = 'reactive_shadow';
  private static SCAN_RADIUS_SQ = 160 * 160;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    const counts: Record<ElementType, number> = { fire: 0, water: 0, earth: 0, wind: 0 };
    for (const tower of ctx.towers) {
      if (distSq(tower.pixelX, tower.pixelY, enemy.pos.x, enemy.pos.y) < ReactiveShadowBehavior.SCAN_RADIUS_SQ) {
        counts[tower.def.element]++;
      }
    }
    let dominant: ElementType = 'fire';
    let max = 0;
    (Object.keys(counts) as ElementType[]).forEach(el => {
      if (counts[el] > max) { max = counts[el]; dominant = el; }
    });
    if (max > 0) enemy.resistedElement = dominant;
  }
}

// ─── Elemental Trail (Dragon) ─────────────────────────────────────────────────
// The dragon leaves sustain zones that speed nearby allies.

export class ElementalTrailBehavior implements EnemyBehavior {
  id = 'elemental_trail';
  private static INTERVAL = 2.8;
  private static TRAIL_DURATION = 4.5;
  private static TRAIL_RADIUS = 42;

  /** Per-dragon: list of active trail points */
  private trails = new Map<number, Array<{ x: number; y: number; remaining: number }>>();
  private trailTimers = new Map<number, number>();

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    // Drop new trail point
    let timer = this.trailTimers.get(enemy.id) ?? 0;
    timer -= dt;
    if (timer <= 0) {
      timer = ElementalTrailBehavior.INTERVAL;
      const list = this.trails.get(enemy.id) ?? [];
      list.push({ x: enemy.pos.x, y: enemy.pos.y, remaining: ElementalTrailBehavior.TRAIL_DURATION });
      this.trails.set(enemy.id, list);
    }
    this.trailTimers.set(enemy.id, timer);

    // Tick and apply trail effects
    const list = this.trails.get(enemy.id);
    if (!list) return;
    const rSq = ElementalTrailBehavior.TRAIL_RADIUS * ElementalTrailBehavior.TRAIL_RADIUS;
    for (let i = list.length - 1; i >= 0; i--) {
      const pt = list[i];
      pt.remaining -= dt;
      if (pt.remaining <= 0) { list.splice(i, 1); continue; }
      // Allies within trail zone get a moderate speed boost
      for (const ally of ctx.enemies) {
        if (ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, pt.x, pt.y) < rSq) {
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, 1.18);
        }
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  GOLEM ANCHOR BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

// ─── Fire Anchor (Golem de Fogo) ─────────────────────────────────────────────
// Generates an ember aura that pushes nearby allies slightly faster.

export class FireAnchorBehavior implements EnemyBehavior {
  id = 'fire_anchor';
  private static RADIUS_SQ = 130 * 130;
  private static SPEED_BONUS = 1.12;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < FireAnchorBehavior.RADIUS_SQ) {
        ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, FireAnchorBehavior.SPEED_BONUS);
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

// ════════════════════════════════════════════════════════════════════════════
//  LEGACY BOSS BEHAVIORS (kept for registry compatibility — no longer on bosses)
// ════════════════════════════════════════════════════════════════════════════

export class SummonAddsBehavior implements EnemyBehavior {
  id = 'summon_adds';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const spawnTrigger = enemy.checkAddSpawn();
    if (spawnTrigger > 0) {
      const goblinDef = enemyRegistry.getDef('goblin')!;
      for (let i = 0; i < 2; i++) {
        const add = createEnemy(goblinDef, ctx.waveManager.currentWave, 1);
        add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 30 - i * 20);
        add.pos = { ...enemy.pos };
        ctx.enemies.push(add);
        ctx.waveManager.totalEnemiesThisWave++;
      }
      ctx.addFT(enemy.pos, '👑 Invocação!', '#44ff44');
    }
  }
}

export class FireTrailBehavior implements EnemyBehavior {
  id = 'fire_trail';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    enemy.trailTimer -= dt;
    if (enemy.trailTimer <= 0) {
      enemy.trailTimer = 2.0;
      ctx.burnZones.push({
        x: enemy.pos.x, y: enemy.pos.y, radius: 35,
        remaining: 6, dmgPerSec: enemy.maxHp * 0.02,
      });
      ctx.addFT(enemy.pos, '🔥 Rastro!', '#ff4400');
    }
  }
}

export class ShieldPhaseBehavior implements EnemyBehavior {
  id = 'shield_phase';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    if (enemy.tryTriggerShield()) {
      ctx.addFT(enemy.pos, '🛡 ESCUDO ATIVO!', '#aa44ff');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  DISABLER AURA (updated with per-element secondary ally effects)
// ════════════════════════════════════════════════════════════════════════════

export class DisablerAuraBehavior implements EnemyBehavior {
  id = 'disabler_aura';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    const element = enemy.def.disablerElement;
    if (!element) return;

    // ── Primary: disable matching towers ──────────────────────────────────
    for (const tower of ctx.towers) {
      const towerElement = tower.def.element;
      const fusionMatch = tower.fusionDef && (
        tower.fusionDef.primaryElement === element ||
        tower.fusionDef.secondaryElement === element
      );
      if (towerElement !== element && !fusionMatch) continue;

      const dx = tower.pixelX - enemy.pos.x;
      const dy = tower.pixelY - enemy.pos.y;
      if (dx * dx + dy * dy <= DISABLER_AURA_RADIUS * DISABLER_AURA_RADIUS) {
        tower.disabledTimer = Math.max(tower.disabledTimer, DISABLER_LINGER_DURATION);
      }
    }

    // ── Secondary: element-specific ally buffs ─────────────────────────────
    const rSq = DISABLER_ALLY_RADIUS * DISABLER_ALLY_RADIUS;
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) >= rSq) continue;

      switch (element) {
        case 'fire':
          // Anulador de Fogo: push allies forward faster
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, 1.10);
          break;
        case 'water':
          // Anulador de Água: strip slow effects (debuff cleanse)
          ally.effects = ally.effects.filter(e => e.type !== 'slow');
          break;
        case 'earth':
          // Anulador de Terra: light damage shield
          ally.tempDamageReduction = Math.max(ally.tempDamageReduction, 0.12);
          break;
        case 'wind':
          // Anulador de Vento: mobility and push resistance
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, 1.10);
          break;
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  BOSS BEHAVIORS — 5 UNIQUE ENCOUNTER SCRIPTS
// ════════════════════════════════════════════════════════════════════════════

// ─── Colosso da Forja (boss_forge_colossus) ───────────────────────────────────
// Slow pressure boss. Drops lava fissures. Enters rage at 50 % HP.

export class ForgeColossusBehavior implements EnemyBehavior {
  id = 'boss_forge_colossus';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const pd = enemy.phaseData;

    // Init
    if (pd['fc_init'] !== 1) {
      pd['fc_init'] = 1;
      pd['fc_fissureTimer'] = 3.5;
      pd['fc_rageActive'] = 0;
    }

    // Rage transition at 50 % HP
    if (pd['fc_rageActive'] === 0 && enemy.hp / enemy.maxHp <= 0.5) {
      pd['fc_rageActive'] = 1;
      ctx.addFT(enemy.pos, '💥 FÚRIA DA FORJA!', '#ff6600');
    }

    const inRage    = pd['fc_rageActive'] === 1;
    const interval  = inRage ? 1.8 : 3.5;
    const radius    = inRage ? 52  : 36;
    const dmgRate   = inRage ? 0.030 : 0.015;
    const duration  = inRage ? 8   : 5;

    pd['fc_fissureTimer'] -= dt;
    if (pd['fc_fissureTimer'] <= 0) {
      pd['fc_fissureTimer'] = interval;
      ctx.burnZones.push({
        x: enemy.pos.x, y: enemy.pos.y,
        radius, remaining: duration,
        dmgPerSec: enemy.maxHp * dmgRate,
      });
      if (inRage) ctx.addFT(enemy.pos, '🌋 Fissura!', '#ff4400');
    }
  }
}

// ─── Leviatã das Marés (boss_tidal_leviathan) ─────────────────────────────────
// Sustain + terrain control. Alternates between Protected and Vulnerable phases.
// Creates large heal-over-time zones for allies.

export class TidalLeviathanBehavior implements EnemyBehavior {
  id = 'boss_tidal_leviathan';
  private static PROTECTED_DUR   = 6.0;  // s in protected phase (50 % dmg reduction)
  private static VULNERABLE_DUR  = 4.0;  // s in vulnerable phase
  private static SELF_HEAL_RATE  = 0.004; // 0.4 % maxHp/s while in protected phase
  private static ALLY_HEAL_INTERVAL = 5.0;
  private static ALLY_HEAL_PCT   = 0.02;
  private static ALLY_RADIUS_SQ  = 130 * 130;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const pd = enemy.phaseData;

    // Init
    if (pd['tl_init'] !== 1) {
      pd['tl_init'] = 1;
      pd['tl_phase'] = 0; // 0 = protected, 1 = vulnerable
      pd['tl_phaseTimer'] = TidalLeviathanBehavior.PROTECTED_DUR;
      pd['tl_allyHealTimer'] = TidalLeviathanBehavior.ALLY_HEAL_INTERVAL;
    }

    // Phase timer
    pd['tl_phaseTimer'] -= dt;
    if (pd['tl_phaseTimer'] <= 0) {
      if (pd['tl_phase'] === 0) {
        pd['tl_phase'] = 1;
        pd['tl_phaseTimer'] = TidalLeviathanBehavior.VULNERABLE_DUR;
        ctx.addFT(enemy.pos, '🌊 Vulnerável!', '#88ddff');
      } else {
        pd['tl_phase'] = 0;
        pd['tl_phaseTimer'] = TidalLeviathanBehavior.PROTECTED_DUR;
        ctx.addFT(enemy.pos, '🛡 Protegido!', '#2266ff');
      }
    }

    // Protected phase: 50 % damage reduction + self-heal
    if (pd['tl_phase'] === 0) {
      enemy.tempDamageReduction = Math.max(enemy.tempDamageReduction, 0.50);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * TidalLeviathanBehavior.SELF_HEAL_RATE * dt);
    }

    // Ally heal pulse
    pd['tl_allyHealTimer'] -= dt;
    if (pd['tl_allyHealTimer'] <= 0) {
      pd['tl_allyHealTimer'] = TidalLeviathanBehavior.ALLY_HEAL_INTERVAL;
      for (const ally of ctx.enemies) {
        if (ally === enemy || ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < TidalLeviathanBehavior.ALLY_RADIUS_SQ) {
          ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * TidalLeviathanBehavior.ALLY_HEAL_PCT);
          ally.effects = ally.effects.filter(e => e.type !== 'burn');
        }
      }
      ctx.addFT(enemy.pos, '💧 Pulso das Marés', '#44aaff');
    }
  }
}

// ─── Rainha da Tempestade (boss_storm_queen) ──────────────────────────────────
// Chaos and acceleration. Summons harpies. Periodic speed bursts to wave.
// Enters storm frenzy at 40 % HP.

export class StormQueenBehavior implements EnemyBehavior {
  id = 'boss_storm_queen';
  private static SUMMON_INTERVAL       = 9.0;
  private static SUMMON_FRENZY_INTERVAL = 5.0;
  private static BURST_INTERVAL = 4.0;
  private static BURST_RADIUS_SQ       = 140 * 140;
  private static BURST_SPEED  = 1.28;
  private static SELF_SPEED   = 1.20;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const pd = enemy.phaseData;

    if (pd['sq_init'] !== 1) {
      pd['sq_init'] = 1;
      pd['sq_summonTimer'] = StormQueenBehavior.SUMMON_INTERVAL;
      pd['sq_burstTimer']  = StormQueenBehavior.BURST_INTERVAL;
      pd['sq_frenzy']      = 0;
    }

    // Frenzy at 40 % HP
    if (pd['sq_frenzy'] === 0 && enemy.hp / enemy.maxHp <= 0.4) {
      pd['sq_frenzy'] = 1;
      ctx.addFT(enemy.pos, '⚡ FÚRIA DA TEMPESTADE!', '#ffee44');
    }

    const inFrenzy = pd['sq_frenzy'] === 1;
    const summonInt = inFrenzy ? StormQueenBehavior.SUMMON_FRENZY_INTERVAL : StormQueenBehavior.SUMMON_INTERVAL;

    // Always fast
    enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, StormQueenBehavior.SELF_SPEED);

    // Summon harpies
    pd['sq_summonTimer'] -= dt;
    if (pd['sq_summonTimer'] <= 0) {
      pd['sq_summonTimer'] = summonInt;
      const harpyDef = enemyRegistry.getDef('harpy');
      if (harpyDef) {
        const count = inFrenzy ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const add = createEnemy(harpyDef, ctx.waveManager.currentWave, 1);
          add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 25 - i * 15);
          add.pos = { ...enemy.pos };
          ctx.enemies.push(add);
          ctx.waveManager.totalEnemiesThisWave++;
        }
        ctx.addFT(enemy.pos, '🌪 Convoca Harpias!', '#bbff44');
      }
    }

    // Speed burst pulse to nearby allies
    pd['sq_burstTimer'] -= dt;
    if (pd['sq_burstTimer'] <= 0) {
      pd['sq_burstTimer'] = StormQueenBehavior.BURST_INTERVAL;
      for (const ally of ctx.enemies) {
        if (ally === enemy || ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < StormQueenBehavior.BURST_RADIUS_SQ) {
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, StormQueenBehavior.BURST_SPEED);
        }
      }
    }
  }
}

// ─── Guardião do Abismo (boss_abyss_guardian) ─────────────────────────────────
// Reads the dominant element nearby and resists it. Summons shadow adds at HP thresholds.

export class AbyssGuardianBehavior implements EnemyBehavior {
  id = 'boss_abyss_guardian';
  private static SCAN_RADIUS_SQ  = 170 * 170;
  private static RESIST_SCAN_CD  = 2.5; // Re-evaluate dominant element every 2.5 s
  private static RESIST_AMOUNT   = 0.40; // 40 % reduction to dominant element
  private static SUMMON_INTERVAL = 12.0;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const pd = enemy.phaseData;

    if (pd['ag_init'] !== 1) {
      pd['ag_init'] = 1;
      pd['ag_scanTimer']    = 0;
      pd['ag_summonTimer']  = AbyssGuardianBehavior.SUMMON_INTERVAL;
      pd['ag_threshFired']  = 0; // bitmask: bit0=75%, bit1=50%, bit2=25%
    }

    // Periodic re-scan for dominant tower element
    pd['ag_scanTimer'] -= dt;
    if (pd['ag_scanTimer'] <= 0) {
      pd['ag_scanTimer'] = AbyssGuardianBehavior.RESIST_SCAN_CD;
      const counts: Record<string, number> = { fire: 0, water: 0, earth: 0, wind: 0 };
      for (const tower of ctx.towers) {
        if (distSq(tower.pixelX, tower.pixelY, enemy.pos.x, enemy.pos.y) < AbyssGuardianBehavior.SCAN_RADIUS_SQ) {
          counts[tower.def.element] = (counts[tower.def.element] ?? 0) + 1;
        }
      }
      let dominant: ElementType = 'fire'; let max = 0;
      (Object.keys(counts) as ElementType[]).forEach(el => { if (counts[el] > max) { max = counts[el]; dominant = el; } });
      if (max > 0) {
        // Encode dominant as index: fire=1 water=2 earth=3 wind=4
        const idx = { fire: 1, water: 2, earth: 3, wind: 4 }[dominant] ?? 0;
        if (pd['ag_dominantIdx'] !== idx) {
          pd['ag_dominantIdx'] = idx;
          ctx.addFT(enemy.pos, '🌑 Sombra Adaptativa!', '#9944ff');
        }
      }
    }

    // Apply elemental resistance
    const idxToEl: Record<number, ElementType> = { 1: 'fire', 2: 'water', 3: 'earth', 4: 'wind' };
    const dominant = idxToEl[pd['ag_dominantIdx'] ?? 0];
    if (dominant) {
      enemy.resistedElement = dominant;
      enemy.tempDamageReduction = Math.max(enemy.tempDamageReduction, AbyssGuardianBehavior.RESIST_AMOUNT);
    }

    // HP threshold summons (75%, 50%, 25%)
    const ratio = enemy.hp / enemy.maxHp;
    const mask  = pd['ag_threshFired'];
    const thresholds: Array<{ bit: number; pct: number; count: number }> = [
      { bit: 1, pct: 0.75, count: 1 },
      { bit: 2, pct: 0.50, count: 2 },
      { bit: 4, pct: 0.25, count: 2 },
    ];
    for (const th of thresholds) {
      if (!(mask & th.bit) && ratio <= th.pct) {
        pd['ag_threshFired'] = mask | th.bit;
        const golemDef = enemyRegistry.getDef('golem');
        if (golemDef) {
          for (let i = 0; i < th.count; i++) {
            const add = createEnemy(golemDef, Math.max(1, ctx.waveManager.currentWave - 5), 1.5);
            add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 40 - i * 25);
            add.pos = { ...enemy.pos };
            ctx.enemies.push(add);
            ctx.waveManager.totalEnemiesThisWave++;
          }
        }
        ctx.addFT(enemy.pos, '👁 Sombras Invocadas!', '#aa44ff');
      }
    }

    // Periodic timed summon
    pd['ag_summonTimer'] -= dt;
    if (pd['ag_summonTimer'] <= 0) {
      pd['ag_summonTimer'] = AbyssGuardianBehavior.SUMMON_INTERVAL;
      const goblinDef = enemyRegistry.getDef('goblin');
      if (goblinDef) {
        const add = createEnemy(goblinDef, ctx.waveManager.currentWave, 1);
        add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 35);
        add.pos = { ...enemy.pos };
        ctx.enemies.push(add);
        ctx.waveManager.totalEnemiesThisWave++;
      }
    }
  }
}

// ─── Avatar Prismático (boss_prismatic_avatar) ────────────────────────────────
// Cycles through 4 elemental phases (12 s each) then enters a mixed final phase.
// Each phase changes its speed, damage reduction, and special ability.

export class PrismaticAvatarBehavior implements EnemyBehavior {
  id = 'boss_prismatic_avatar';
  private static PHASE_DURATION = 12.0;
  // Phases: 0=fire, 1=water, 2=earth, 3=wind, 4=final
  private static PHASE_NAMES = ['🔥 Fase do Fogo', '💧 Fase da Água', '🌍 Fase da Terra', '💨 Fase do Vento', '✨ Fase Final'];
  private static PHASE_COLORS = ['#ff6600', '#2288ff', '#99bb44', '#ddff44', '#ff88ff'];
  private static TRAIL_INTERVAL = 3.0;
  private static SUMMON_INTERVAL = 8.0;
  private static ALLY_RADIUS_SQ = 140 * 140;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const pd = enemy.phaseData;

    if (pd['pa_init'] !== 1) {
      pd['pa_init'] = 1;
      pd['pa_phase'] = 0;
      pd['pa_phaseTimer'] = PrismaticAvatarBehavior.PHASE_DURATION;
      pd['pa_trailTimer'] = PrismaticAvatarBehavior.TRAIL_INTERVAL;
      pd['pa_summonTimer'] = PrismaticAvatarBehavior.SUMMON_INTERVAL;
      pd['pa_finalTriggered'] = 0;
    }

    // Trigger final phase at 25 % HP
    if (pd['pa_finalTriggered'] === 0 && enemy.hp / enemy.maxHp <= 0.25) {
      pd['pa_finalTriggered'] = 1;
      pd['pa_phase'] = 4;
      pd['pa_phaseTimer'] = 9999; // stays until dead
      ctx.addFT(enemy.pos, '✨ FORMA FINAL!', '#ff88ff');
    }

    if (pd['pa_finalTriggered'] === 0) {
      // Normal phase cycling
      pd['pa_phaseTimer'] -= dt;
      if (pd['pa_phaseTimer'] <= 0) {
        pd['pa_phase'] = (pd['pa_phase'] + 1) % 4;
        pd['pa_phaseTimer'] = PrismaticAvatarBehavior.PHASE_DURATION;
        const name  = PrismaticAvatarBehavior.PHASE_NAMES[pd['pa_phase']];
        const color = PrismaticAvatarBehavior.PHASE_COLORS[pd['pa_phase']];
        ctx.addFT(enemy.pos, name, color);
      }
    }

    const phase = pd['pa_phase'];

    // ── Phase-specific mechanics ──────────────────────────────────────────
    if (phase === 0) {
      // Fire: fast, drops burn zones
      enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, 1.18);
      pd['pa_trailTimer'] -= dt;
      if (pd['pa_trailTimer'] <= 0) {
        pd['pa_trailTimer'] = PrismaticAvatarBehavior.TRAIL_INTERVAL;
        ctx.burnZones.push({ x: enemy.pos.x, y: enemy.pos.y, radius: 38, remaining: 6, dmgPerSec: enemy.maxHp * 0.02 });
      }
    } else if (phase === 1) {
      // Water: protected + self-heal
      enemy.tempDamageReduction = Math.max(enemy.tempDamageReduction, 0.45);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.003 * dt);
    } else if (phase === 2) {
      // Earth: very tanky, slow
      enemy.tempDamageReduction = Math.max(enemy.tempDamageReduction, 0.62);
      // Also reduce own speed slightly
      enemy.tempSpeedBoost = Math.min(enemy.tempSpeedBoost, 0.80);
    } else if (phase === 3) {
      // Wind: fast + summon
      enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, 1.22);
      pd['pa_summonTimer'] -= dt;
      if (pd['pa_summonTimer'] <= 0) {
        pd['pa_summonTimer'] = PrismaticAvatarBehavior.SUMMON_INTERVAL;
        const harpyDef = enemyRegistry.getDef('harpy');
        if (harpyDef) {
          const add = createEnemy(harpyDef, ctx.waveManager.currentWave, 1);
          add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 30);
          add.pos = { ...enemy.pos };
          ctx.enemies.push(add);
          ctx.waveManager.totalEnemiesThisWave++;
          ctx.addFT(enemy.pos, '💨 Eco Tempestuoso!', '#ddff44');
        }
      }
    } else if (phase === 4) {
      // Final: mix of all — moderate on everything, but boost nearby allies massively
      enemy.tempDamageReduction = Math.max(enemy.tempDamageReduction, 0.25);
      enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, 1.12);
      for (const ally of ctx.enemies) {
        if (ally === enemy || ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < PrismaticAvatarBehavior.ALLY_RADIUS_SQ) {
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, 1.20);
          ally.tempDamageReduction = Math.max(ally.tempDamageReduction, 0.15);
        }
      }
      // Periodic summon in final phase
      pd['pa_summonTimer'] -= dt;
      if (pd['pa_summonTimer'] <= 0) {
        pd['pa_summonTimer'] = 6.0;
        const goblinDef = enemyRegistry.getDef('goblin');
        if (goblinDef) {
          for (let i = 0; i < 2; i++) {
            const add = createEnemy(goblinDef, ctx.waveManager.currentWave, 1);
            add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 25 - i * 15);
            add.pos = { ...enemy.pos };
            ctx.enemies.push(add);
            ctx.waveManager.totalEnemiesThisWave++;
          }
          ctx.addFT(enemy.pos, '✨ Manifestação!', '#ff88ff');
        }
      }
    }
  }
}
