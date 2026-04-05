import type { MapData } from '../../systems/MapGenerator';
import type { MapSliceState } from '../GameState';

/**
 * MapSlice — typed operations on map domain state.
 * Covers map data, tier, and seed.
 * Accessed via StateStore.mapMgr.
 */
export class MapSlice {
  constructor(private s: MapSliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get data(): MapData { return this.s.data; }
  get tier(): number  { return this.s.tier; }
  get seed(): number  { return this.s.seed; }

  get cols(): number        { return this.s.data.cols; }
  get rows(): number        { return this.s.data.rows; }
  get gameWidth(): number   { return this.s.data.gameWidth; }
  get gameHeight(): number  { return this.s.data.gameHeight; }
  get pathCells(): Set<string> { return this.s.data.pathCells; }

  isPathCell(col: number, row: number): boolean {
    return this.s.data.pathCells.has(`${col},${row}`);
  }

  isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.s.data.cols && row >= 0 && row < this.s.data.rows;
  }

  // ─── Mutate ────────────────────────────────────────────────────────────────
  setMap(data: MapData, tier: number, seed: number): void {
    this.s.data = data;
    this.s.tier = tier;
    this.s.seed = seed;
  }

  nextSeed(): number {
    const next = (this.s.seed * 1103515245 + 12345) & 0xffffff;
    this.s.seed = next;
    return next;
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): MapSliceState { return this.s; }
}
