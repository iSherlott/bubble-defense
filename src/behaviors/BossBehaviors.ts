// ════════════════════════════════════════════════════════════════════════════
//  Boss Behaviors — unique encounter scripts for each boss enemy
//  Also contains legacy boss behaviors kept for registry compatibility.
// ════════════════════════════════════════════════════════════════════════════

import type { EnemyBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType } from '../types';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { createEnemy } from '../factories/EnemyFactory';
import { enemyRegistry } from '../registries';

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
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
