import type { Vec2 } from '../../types';
import type { Tower } from '../../entities/Tower';
import type { TowerSliceState } from '../GameState';

/**
 * TowerSlice — typed operations on tower domain state.
 * Accessed via StateStore.towerMgr.
 */
export class TowerSlice {
  constructor(private s: TowerSliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get all(): Tower[]                              { return this.s.towers; }
  get selectedType(): string                      { return this.s.selectedType; }
  get movingTower(): Tower | null                 { return this.s.movingTower; }
  get upgradePopup(): { col: number; row: number } | null { return this.s.upgradePopup; }
  get hoveredCell(): Vec2 | null                  { return this.s.hoveredCell; }

  at(col: number, row: number): Tower[] {
    return this.s.towers.filter(t => t.gridX === col && t.gridY === row);
  }

  // ─── Mutate ────────────────────────────────────────────────────────────────
  add(tower: Tower): void {
    this.s.towers.push(tower);
  }

  remove(id: number): void {
    this.s.towers = this.s.towers.filter(t => t.id !== id);
  }

  replaceAll(towers: Tower[]): void {
    this.s.towers = towers;
  }

  select(typeId: string): void {
    this.s.selectedType = typeId;
  }

  toggleSelect(typeId: string): void {
    this.s.selectedType = this.s.selectedType === typeId ? '' : typeId;
  }

  clearSelection(): void {
    this.s.selectedType = '';
  }

  startMove(tower: Tower): void {
    this.s.movingTower = tower;
  }

  cancelMove(): void {
    this.s.movingTower = null;
  }

  openPopup(col: number, row: number): void {
    this.s.upgradePopup = { col, row };
  }

  closePopup(): void {
    this.s.upgradePopup = null;
  }

  setHover(cell: Vec2 | null): void {
    this.s.hoveredCell = cell;
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): TowerSliceState { return this.s; }
}
