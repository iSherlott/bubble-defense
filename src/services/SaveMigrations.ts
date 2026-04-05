// ─── Save Migration System ──────────────────────────────────────────────────
// Each migration transforms save data from version N to version N+1.
// Add a new entry to MIGRATIONS when the save format changes.

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationFn> = {
  1: (data) => {
    // v1 → v2: add evolutionId to saved towers
    const towers = data.towers as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(towers)) {
      for (const t of towers) {
        if (t.evolutionId === undefined) t.evolutionId = null;
      }
    }
    data.version = 2;
    return data;
  },
};

/** The latest save version supported by the current code. */
export const CURRENT_SAVE_VERSION = 2;

/**
 * Apply all necessary migrations to bring `data` up to CURRENT_SAVE_VERSION.
 * Returns the migrated data or null if migration is impossible.
 */
export function migrateSaveData(data: Record<string, unknown>): Record<string, unknown> | null {
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > CURRENT_SAVE_VERSION) return null; // future version

  while (version < CURRENT_SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return null; // no migration path
    data = migrate(data);
    version = typeof data.version === 'number' ? data.version : version + 1;
  }

  return data;
}
