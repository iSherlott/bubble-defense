// ─── Enemy Scaling & Wave Composition ────────────────────────────────────────
export class EnemyConfig {
  // HP scaling per wave
  readonly hpScalePerWave    = 0.055; // +5.5% HP (linear part)
  readonly hpCompoundRate    = 0.012; // 1.2% compound growth after threshold
  readonly hpCompoundStart   = 28;    // wave where compound scaling begins

  // Speed & agility scaling
  readonly speedScalePerWave = 0.009; // +0.9% speed per wave
  readonly agilityScale      = 0.012; // +1.2% agility per wave

  // Wave composition
  readonly waveBaseCount     = 6;     // enemies at wave 1
  readonly waveCountPerWave  = 0.5;   // additional enemies per wave

  // Elite units
  readonly eliteStartWave    = 20;
  readonly eliteBaseMult     = 1.5;
  readonly eliteMaxMult      = 3.5;
  readonly eliteScaleWaves   = 40;    // waves to ramp from base to max elite mult
}
