// ─── Enemy Scaling & Wave Composition ────────────────────────────────────────
export class EnemyConfig {
  // HP scaling per wave
  readonly hpScalePerWave    = 0.10;  // +10% HP (linear part)
  readonly hpCompoundRate    = 0.03;  // 3% compound growth after threshold
  readonly hpCompoundStart   = 10;   // wave where compound scaling begins

  // Speed & agility scaling
  readonly speedScalePerWave = 0.02;  // +2% speed per wave
  readonly agilityScale      = 0.03;  // +3% agility per wave

  // Wave composition
  readonly waveBaseCount     = 6;     // enemies at wave 1
  readonly waveCountPerWave  = 0.5;   // additional enemies per wave

  // Elite units
  readonly eliteStartWave    = 20;
  readonly eliteBaseMult     = 2;
  readonly eliteMaxMult      = 10;
  readonly eliteScaleWaves   = 30;    // waves to ramp from base to max elite mult
}
