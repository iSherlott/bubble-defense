// ─── Wave/Spawn Types ────────────────────────────────────────────────────────
// Data-driven spawn rules consumed by WaveManager.

/** Defines which enemy types are available from a given wave number onward */
export interface SpawnPoolEntry {
  typeId: string;
  /** Wave number from which this enemy type becomes available */
  fromWave: number;
}

/** How many distinct enemy types appear in a wave, by wave range */
export interface TypeCountRule {
  /** Minimum wave (inclusive) */
  minWave: number;
  /** Maximum concurrent types to pick */
  maxTypes: number;
}

/** Complete wave composition configuration */
export interface WaveRules {
  /** Enemy pool — sorted ascending by fromWave */
  spawnPool: SpawnPoolEntry[];
  /** Type-count brackets — sorted ascending by minWave */
  typeCountBrackets: TypeCountRule[];
  /** Every N waves is a boss wave */
  bossEveryN: number;
}
