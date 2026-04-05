// ─── Tower Upgrade & Magic Configuration ─────────────────────────────────────
export class TowerConfig {
  // Upgrade progression
  readonly upgradeMultStep     = 0.1;     // damage/speed added per upgrade step
  readonly maxLevel            = 20;      // max upgrade count (display level = count+1)

  // Evolution
  readonly evolutionLevel          = 9;     // upgradeCount at which evolution becomes available (display level 10)
  readonly evolutionCostMult       = 3;     // evolution costs baseCost × this (e.g. 80 × 3 = 240g)
  readonly postEvolutionCostMult   = 1.5;   // upgrade cost multiplier after evolving (50% more expensive)

  // Dual-magic unlock
  readonly dualMagicBaseChance = 0.0001;  // base chance per upgrade
  readonly dualMagicLuckBonus  = 0.001;   // extra chance per luck point
}
