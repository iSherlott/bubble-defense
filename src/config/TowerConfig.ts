// ─── Tower Upgrade & Magic Configuration ─────────────────────────────────────
export class TowerConfig {
  // Upgrade progression
  readonly upgradeMultStep     = 0.1;     // damage/speed added per upgrade step
  readonly maxLevel            = 20;      // max upgrade count (display level = count+1)

  // Evolution & Fusion decision point (both at upgradeCount=10, display level 11)
  readonly evolutionLevel          = 10;    // upgradeCount at which evolution becomes available (display level 11)
  readonly evolutionCostMult       = 3;     // evolution costs baseCost × this (e.g. 80 × 3 = 240g)
  readonly postEvolutionCostMult   = 1.5;   // upgrade cost multiplier after evolving (50% more expensive)

  // Fusion
  readonly earlyFusionLevel        = 10;    // upgradeCount for early fusion (display level 11)
  readonly lateFusionLevel         = 20;    // upgradeCount for late fusion (display level 21 = max)
  readonly earlyFusionPowerScalar  = 0.75;  // 75% effectiveness for early fusion
  readonly lateFusionPowerScalar   = 1.25;  // 125% effectiveness for late fusion

  // Dual-magic unlock
  readonly dualMagicBaseChance = 0.0001;  // base chance per upgrade
  readonly dualMagicLuckBonus  = 0.001;   // extra chance per luck point
}
