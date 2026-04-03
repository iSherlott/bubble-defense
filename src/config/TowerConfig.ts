// ─── Tower Upgrade & Magic Configuration ─────────────────────────────────────
export class TowerConfig {
  // Upgrade progression
  readonly upgradeMultStep     = 0.1;     // damage/speed added per upgrade step
  readonly maxLevel            = 10;      // max upgrade count (display level = count+1)

  // Dual-magic unlock
  readonly dualMagicBaseChance = 0.0001;  // base chance per upgrade
  readonly dualMagicLuckBonus  = 0.001;   // extra chance per luck point
}
