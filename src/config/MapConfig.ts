// ─── Map & Layout Configuration ───────────────────────────────────────────────
export interface MapTierDef {
  cols: number; rows: number;
  minSegH: number; maxSegH: number;
  maxSegV: number;
}

export class MapConfig {
  // Layout
  readonly cellSize  = 40;
  readonly sidebarW  = 240;
  readonly waveBarH  = 32;

  // Map expansion cost
  readonly expandCost = 300;

  // Tier progression: one entry per tier; tier unlocks every 10 waves
  readonly tiers: MapTierDef[] = [
    { cols: 22, rows: 14, minSegH: 3, maxSegH: 5, maxSegV: 4 },  // tier 0 – waves 1-9
    { cols: 26, rows: 16, minSegH: 3, maxSegH: 6, maxSegV: 5 },  // tier 1 – waves 10-19
    { cols: 30, rows: 18, minSegH: 3, maxSegH: 7, maxSegV: 6 },  // tier 2 – waves 20-29
    { cols: 34, rows: 20, minSegH: 3, maxSegH: 8, maxSegV: 6 },  // tier 3 – waves 30+
  ];

  /** Returns the map tier index for a given wave number */
  tierAt(wave: number): number {
    return Math.min(Math.floor(wave / 10), this.tiers.length - 1);
  }

  /** Returns the MapTierDef for a given wave */
  tierDefAt(wave: number): MapTierDef {
    return this.tiers[this.tierAt(wave)];
  }
}
