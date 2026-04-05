// ─── TowerFactory — creates the appropriate tower subclass from definition ────

import type { TowerDef, FusionDef } from '../types';
import { BaseTower }   from '../entities/BaseTower';
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
): BaseTower {
  if (fusionDef) return new FusionTower(def, gridX, gridY, fusionDef);
  return new SingleTower(def, gridX, gridY, slotIndex);
}

export function resetTowerIds() { resetEntityIds(); }
