// ─── TowerFactory — creates the appropriate tower subclass from definition ────

import type { TowerDef, FusionDef, FusionTier } from '../types';
import type { BaseTower }   from '../entities/BaseTower';
import { SingleTower } from '../entities/towers/SingleTower';
import { FusionTower } from '../entities/towers/FusionTower';
import { resetEntityIds } from '../entities/BaseEntity';

/** Creates a SingleTower or FusionTower depending on whether a fusionDef is supplied. */
export function createTower(
  def: TowerDef,
  gridX: number,
  gridY: number,
  slotIndex: 0 | 1 = 0,
  fusionDef?: FusionDef,
  fusionTier?: FusionTier,
  fusionPowerScalar?: number,
): BaseTower {
  if (fusionDef) return new FusionTower(def, gridX, gridY, fusionDef, fusionTier ?? 'late', fusionPowerScalar ?? 1);
  return new SingleTower(def, gridX, gridY, slotIndex);
}

export function resetTowerIds() { resetEntityIds(); }
