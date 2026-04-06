// ─── FusionTower — result of merging two max-level towers on the same cell ────
// Overrides effectiveMagicBarMax to honour fusionDef.magicBarMaxMult.
// Created by Game.ts when the player triggers a fusion; replaces both slots
// and inherits the primary tower's stats.

import type { TowerDef, FusionDef, FusionTier } from '../../types';
import { BaseTower } from '../BaseTower';

export class FusionTower extends BaseTower {
  /** Tier at which this fusion was performed */
  fusionTier: FusionTier;
  /** Power scalar applied to all fusion effects (0.75 early, 1.25 late) */
  fusionPowerScalar: number;

  constructor(def: TowerDef, gridX: number, gridY: number, fusion: FusionDef, tier: FusionTier, powerScalar: number) {
    super(def, gridX, gridY, 0);
    this.fusionDef = fusion;
    this.fusionTier = tier;
    this.fusionPowerScalar = powerScalar;
  }

  /** Fused magic bar max applies the fusion multiplier (e.g. ×2 for wind+wind). */
  override get effectiveMagicBarMax(): number {
    return this.def.magicBarMax * (this.fusionDef?.magicBarMaxMult ?? 1);
  }
}
