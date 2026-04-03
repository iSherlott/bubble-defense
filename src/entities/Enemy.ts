// ─── Enemy — factory + backward-compat re-export ─────────────────────────────
// New code should use createEnemy(). Existing code using `new Enemy(def,wave)`
// still works because Enemy is an alias for BaseEnemy.

import type { EnemyDef }   from '../types';
import { resetEntityIds }   from './BaseEntity';
import { BaseEnemy }        from './BaseEnemy';
import { StandardEnemy }    from './enemies/StandardEnemy';
import { BossEnemy }        from './enemies/BossEnemy';
import { GolemEnemy }       from './enemies/GolemEnemy';

export { BaseEnemy } from './BaseEnemy';
export { StandardEnemy } from './enemies/StandardEnemy';
export { BossEnemy }     from './enemies/BossEnemy';
export { GolemEnemy }    from './enemies/GolemEnemy';

// ─── Factory ──────────────────────────────────────────────────────────────────
/** Creates the appropriate enemy subclass based on the definition's flags. */
export function createEnemy(def: EnemyDef, wave = 1, eliteMult = 1): BaseEnemy {
  if (def.isBoss)    return new BossEnemy(def, wave, eliteMult);
  if (def.golemType) return new GolemEnemy(def, wave, eliteMult);
  return new StandardEnemy(def, wave, eliteMult);
}

// ─── Backward compat ──────────────────────────────────────────────────────────
// Code written before the hierarchy existed used `new Enemy(def, wave, mult)`.
// That still works — Enemy is just a StandardEnemy (safe default).
export { StandardEnemy as Enemy };

// Reset ID counter — keeps WaveManager.reset() working
export function resetEnemyIds() { resetEntityIds(); }
