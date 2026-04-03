// ─── SingleTower — one-element tower placed in slot 0 or 1 ────────────────────
import type { TowerDef } from '../../types';
import { BaseTower } from '../BaseTower';

export class SingleTower extends BaseTower {
  constructor(def: TowerDef, gridX: number, gridY: number, slotIndex: 0 | 1 = 0) {
    super(def, gridX, gridY, slotIndex);
  }
}
