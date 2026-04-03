// ─── Economy Configuration ────────────────────────────────────────────────────
export class EconomyConfig {
  // Starting resources
  readonly baseLives   = 20;
  readonly initialGold = 300;

  // Tower costs
  readonly baseTowerCost = 80;

  // Per-enemy kill reward scaling
  readonly rewardScalePerWave = 0.04;  // +4% gold per wave
  readonly xpScalePerWave     = 0.03;  // +3% XP per wave
}
