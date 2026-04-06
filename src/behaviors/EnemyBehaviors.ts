import type { EnemyBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType } from '../types';

// Re-export split modules for backward compatibility with existing imports
export {
  FireAnchorBehavior, WaterAnchorBehavior,
  EarthAnchorBehavior, WindAnchorBehavior,
} from './GolemAnchorBehaviors';

export {
  SummonAddsBehavior, FireTrailBehavior, ShieldPhaseBehavior,
  ForgeColossusBehavior, TidalLeviathanBehavior, StormQueenBehavior,
  AbyssGuardianBehavior, PrismaticAvatarBehavior,
} from './BossBehaviors';

/** Disabler aura radius in pixels */
const DISABLER_AURA_RADIUS = 120;
/** How long (in seconds) the disable effect lingers after leaving the aura */
const DISABLER_LINGER_DURATION = 0.5;
/** Secondary ally-effect radius for disablers */
const DISABLER_ALLY_RADIUS = 100;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STANDARD ENEMY TACTICAL BEHAVIORS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ Flight Instinct (Goblin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // Isolated â€” boost speed
    enemy.tempSpeedBoost = Math.max(enemy.tempSpeedBoost, FlightInstinctBehavior.SPEED_BONUS);
  }
}

// â”€â”€â”€ Thick Hide (Troll) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Lateral Burst (Harpy) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Defensive Aura (Rocky Shielder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Tidal Rite (Tide Shaman) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    ctx.addFT(enemy.pos, 'ðŸ’§ Rito!', '#44aaff');
  }
}

// â”€â”€â”€ Upcurrent (Storm Ranger) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The storm ranger creates an interference field that boosts nearby allies' evasion.
// "InterferÃªncia Tempestuosa": allies within 90 px gain +50% agility (dodge support).

export class UpcurrentBehavior implements EnemyBehavior {
  id = 'upcurrent';
  private static RADIUS_SQ = 90 * 90;
  private static AGILITY_BONUS = 0.50;

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) < UpcurrentBehavior.RADIUS_SQ) {
        ally.tempAgilityBoost = Math.max(ally.tempAgilityBoost, UpcurrentBehavior.AGILITY_BONUS);
      }
    }
  }
}

// â”€â”€â”€ Reactive Shadow (Shadow Golem / Dark Golem) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Elemental Trail (Dragon) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The dragon leaves territorial ash zones along its path.
// "Rastro de Cinzas": allies inside ash zones gain +15% agility (evasion).
// Creates "evasion corridors" â€” a territorial hazard that makes enemies harder to hit.

export class ElementalTrailBehavior implements EnemyBehavior {
  id = 'elemental_trail';
  private static INTERVAL = 2.8;
  private static TRAIL_DURATION = 5.0;
  private static TRAIL_RADIUS = 42;
  private static AGILITY_BONUS = 0.15;

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

    // Tick and apply trail effects â€” allies in ash zones gain agility
    const list = this.trails.get(enemy.id);
    if (!list) return;
    const rSq = ElementalTrailBehavior.TRAIL_RADIUS * ElementalTrailBehavior.TRAIL_RADIUS;
    for (let i = list.length - 1; i >= 0; i--) {
      const pt = list[i];
      pt.remaining -= dt;
      if (pt.remaining <= 0) { list.splice(i, 1); continue; }
      for (const ally of ctx.enemies) {
        if (ally.dead) continue;
        if (distSq(ally.pos.x, ally.pos.y, pt.x, pt.y) < rSq) {
          ally.tempAgilityBoost = Math.max(ally.tempAgilityBoost, ElementalTrailBehavior.AGILITY_BONUS);
        }
      }
    }
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DISABLER AURA (updated with per-element secondary ally effects)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export class DisablerAuraBehavior implements EnemyBehavior {
  id = 'disabler_aura';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    const element = enemy.def.disablerElement;
    if (!element) return;

    // â”€â”€ Primary: disable matching towers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Secondary: element-specific ally buffs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const rSq = DISABLER_ALLY_RADIUS * DISABLER_ALLY_RADIUS;
    for (const ally of ctx.enemies) {
      if (ally === enemy || ally.dead) continue;
      if (distSq(ally.pos.x, ally.pos.y, enemy.pos.x, enemy.pos.y) >= rSq) continue;

      switch (element) {
        case 'fire':
          // Anulador de Fogo: offensive pressure â€” allies gain +12% speed
          ally.tempSpeedBoost = Math.max(ally.tempSpeedBoost, 1.12);
          break;
        case 'water':
          // Anulador de Ãgua: strip slow effects (debuff cleanse)
          ally.effects = ally.effects.filter(e => e.type !== 'slow');
          break;
        case 'earth':
          // Anulador de Terra: defensive stabilisation â€” 15% damage shield
          ally.tempDamageReduction = Math.max(ally.tempDamageReduction, 0.15);
          break;
        case 'wind':
          // Anulador de Vento: strip stun and grant push immunity (anti-CC)
          ally.stunRemaining = 0;
          break;
      }
    }
  }
}

