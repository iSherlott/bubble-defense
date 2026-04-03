// ─── StandardEnemy — regular path-walking enemy, no special overrides ─────────
import type { EnemyDef } from '../../types';
import { BaseEnemy } from '../BaseEnemy';

export class StandardEnemy extends BaseEnemy {
  constructor(def: EnemyDef, wave = 1, eliteMult = 1) {
    super(def, wave, eliteMult);
  }
}
