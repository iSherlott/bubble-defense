// ─── GolemEnemy — elemental golem with element-specific immunity ──────────────
// golemType === 'fire'  → immune to any fire damage / burn
// golemType === 'water' → heals inside own puddles (handled by Game.ts)
// golemType === 'earth' → absorbs damage in a radius around self (Game.ts)
// golemType === 'wind'  → immune to wind push (Game.ts checks cfg.windGolemPushImmune)

import type { EnemyDef, ElementType } from '../../types';
import { BaseEnemy } from '../BaseEnemy';

export class GolemEnemy extends BaseEnemy {
  constructor(def: EnemyDef, wave = 1, eliteMult = 1) {
    super(def, wave, eliteMult);
  }

  override receiveDamage(baseDamage: number, element: ElementType): number {
    // Fire golem: immune to any fire-component damage
    if (this.def.golemType === 'fire' && element === 'fire') return 0;
    return super.receiveDamage(baseDamage, element);
  }

  override applyBurn(percentPerSec: number, duration: number) {
    // Fire golem cannot be burned
    if (this.def.golemType === 'fire') return;
    super.applyBurn(percentPerSec, duration);
  }
}
