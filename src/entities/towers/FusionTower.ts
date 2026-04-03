// ─── FusionTower — result of merging two max-level towers on the same cell ────
// Overrides effectiveMagicBarMax to honour fusionDef.magicBarMaxMult.
// Created by Game.ts when the player triggers a fusion; replaces both slots
// and inherits the primary tower's stats.

import type { TowerDef, FusionDef } from '../../types';
import { BaseTower } from '../BaseTower';

export class FusionTower extends BaseTower {
  constructor(def: TowerDef, gridX: number, gridY: number, fusion: FusionDef) {
    super(def, gridX, gridY, 0);
    this.fusionDef = fusion;
  }

  /** Fused magic bar max applies the fusion multiplier (e.g. ×2 for wind+wind). */
  override get effectiveMagicBarMax(): number {
    return this.def.magicBarMax * (this.fusionDef?.magicBarMaxMult ?? 1);
  }
}
