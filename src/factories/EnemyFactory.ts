// ─── EnemyFactory — creates the appropriate enemy subclass from definition ────

import type { EnemyDef }   from '../types';
import { resetEntityIds }   from '../entities/BaseEntity';
import { StandardEnemy }    from '../entities/enemies/StandardEnemy';
import { BossEnemy }        from '../entities/enemies/BossEnemy';
import { GolemEnemy }       from '../entities/enemies/GolemEnemy';

/** Creates the appropriate enemy subclass based on the definition's flags. */
export function createEnemy(def: EnemyDef, wave = 1, eliteMult = 1) {
  if (def.isBoss)    return new BossEnemy(def, wave, eliteMult);
  if (def.golemType) return new GolemEnemy(def, wave, eliteMult);
  return new StandardEnemy(def, wave, eliteMult);
}

export function resetEnemyIds() { resetEntityIds(); }
