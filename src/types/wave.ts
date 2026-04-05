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

/**
 * Hints that bias wave composition toward specific enemy archetypes.
 * When a wave falls in [fromWave, toWave], the listed preferredTypeIds are
 * always included first when the pool has enough types. Remaining slots are
 * filled randomly from the full available pool.
 */
export interface ArchetypeHint {
  fromWave: number;
  toWave: number;
  /** Enemy type IDs that are prioritised for this wave range */
  preferredTypeIds: string[];
  /** Human-readable archetype label (for debugging / UI previews) */
  label?: string;
}

/** Complete wave composition configuration */
export interface WaveRules {
  /** Enemy pool — sorted ascending by fromWave */
  spawnPool: SpawnPoolEntry[];
  /** Type-count brackets — sorted ascending by minWave */
  typeCountBrackets: TypeCountRule[];
  /** Every N waves is a boss wave */
  bossEveryN: number;
  /** Optional archetype hints that guide wave composition for specific ranges */
  archetypeHints?: ArchetypeHint[];
}
