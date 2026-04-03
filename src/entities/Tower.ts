// ─── Tower — factory + backward-compat re-export ──────────────────────────────
// New code should use createTower(). Existing code using `new Tower(def,x,y,slot)`
// still works because Tower is an alias for SingleTower.

import type { TowerDef, FusionDef } from '../types';
import { resetEntityIds }   from './BaseEntity';
import { BaseTower }        from './BaseTower';
import { SingleTower }      from './towers/SingleTower';
import { FusionTower }      from './towers/FusionTower';

export { BaseTower }     from './BaseTower';
export { SingleTower }   from './towers/SingleTower';
export { FusionTower }   from './towers/FusionTower';

// ─── Factory ──────────────────────────────────────────────────────────────────
/** Creates a SingleTower or FusionTower depending on whether a fusionDef is supplied. */
export function createTower(
  def: TowerDef,
  gridX: number,
  gridY: number,
  slotIndex: 0 | 1 = 0,
  fusionDef?: FusionDef,
): BaseTower {
  if (fusionDef) return new FusionTower(def, gridX, gridY, fusionDef);
  return new SingleTower(def, gridX, gridY, slotIndex);
}

// ─── Backward compat ──────────────────────────────────────────────────────────
// Code written before the hierarchy used `new Tower(def, gridX, gridY, slotIndex)`.
export { SingleTower as Tower };

export function resetTowerIds() { resetEntityIds(); }
