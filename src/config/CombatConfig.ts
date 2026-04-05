// ─── Combat & Special Effects Configuration ───────────────────────────────────
export class CombatConfig {
  // Hit/miss
  readonly minHitChance = 0.25;

  // Wind magic
  readonly windPushCells = 2;  // tiles pushed back by wind magic (was 3)

  // Earth magic
  readonly earthAoeRadius = 80;  // px radius for AoE explosion

  // Fire burn
  readonly burnPctPerSec  = 1.0;  // % of maxHP per second
  readonly burnDuration   = 5.0;  // seconds

  // Water puddle / slows
  readonly puddleRadius     = 40;    // px
  readonly puddleDuration   = 8;    // seconds
  readonly puddleSlowAmount = 0.05; // fraction (5%)
  readonly puddleChance     = 0.25; // chance to spawn on magic hit (with talent)
  readonly permSlowPerStack  = 0.08; // multiplicative slow per stack (diminishing)
  readonly maxPermSlowStacks = 25;

  // Golem special abilities
  readonly waterGolemPuddleRegen  = 0.0001; // HP%/s while in own puddle
  readonly earthGolemShieldRadius = 80;     // px radius for damage absorption
  readonly windGolemPushImmune    = true;   // immune to wind push

  // Synergy bonus when 2 towers share a cell
  readonly synergyDamageBonus = 0.15;  // +15%
}
