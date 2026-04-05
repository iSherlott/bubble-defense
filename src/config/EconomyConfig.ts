// ─── Economy Configuration ────────────────────────────────────────────────────
export class EconomyConfig {
  // Starting resources
  readonly baseLives   = 20;
  readonly initialGold = 300;

  // Tower costs
  readonly baseTowerCost = 80;

  // Per-enemy kill reward scaling
  readonly rewardScalePerWave = 0.025; // +2.5% gold per wave (was 4%: reduced to curb mid/late inflation)
  readonly xpScalePerWave     = 0.03;  // +3% XP per wave
}
