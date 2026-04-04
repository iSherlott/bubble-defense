// ─── Save Migration System ──────────────────────────────────────────────────
// Each migration transforms save data from version N to version N+1.
// Add a new entry to MIGRATIONS when the save format changes.

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationFn> = {
  // Example: when version 2 is introduced, add:
  // 1: (data) => {
  //   // transform v1 data into v2 shape
  //   data.version = 2;
  //   return data;
  // },
};

/** The latest save version supported by the current code. */
export const CURRENT_SAVE_VERSION = 1;

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
