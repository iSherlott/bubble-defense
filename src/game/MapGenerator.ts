import type { Vec2 } from '../types';
import { CELL_SIZE, MAP_TIERS, MapTierDef } from '../constants';

export interface MapData {
  cols: number;
  rows: number;
  tier: number;
  waypoints: Vec2[];
  pathCells: Set<string>;
  totalLength: number;
  gameWidth: number;
  gameHeight: number;
}

// Seeded LCG random
function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s + 0x6D2B79F5 | 0, 0x9e3779b9) | 0;
    const t = (s ^ (s >>> 16)) >>> 0;
    return t / 0xffffffff;
  };
}

export function computePathLength(waypoints: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += Math.hypot(
      waypoints[i].x - waypoints[i-1].x,
      waypoints[i].y - waypoints[i-1].y,
    );
  }
  return total;
}

export function generateMap(seed: number, tier: number): MapData {
  const cfg: MapTierDef = MAP_TIERS[Math.min(tier, MAP_TIERS.length - 1)];
  const { cols, rows } = cfg;
  const rng = seededRng(seed);

  // Grid-space path points (col, row)
  const pts: { col: number; row: number }[] = [];

  // Start row in middle third
  const startRow = Math.floor(rows / 3 + rng() * (rows / 3));
  let cx = 0;
  let cy = startRow;
  pts.push({ col: cx, row: cy });

  let turns = 0;
  while (cx < cols - 4) {
    // Horizontal advance
    const advance = cfg.minSegH + Math.floor(rng() * (cfg.maxSegH - cfg.minSegH + 1));
    cx = Math.min(cx + advance, cols - 3);
    pts.push({ col: cx, row: cy });

    if (cx >= cols - 3) break;

    // Vertical move — bias back toward centre to avoid hugging edges
    const distToTop    = cy - 1;
    const distToBottom = rows - 2 - cy;
    // Push slightly away from nearest edge
    let dirBias = 0;
    if (distToTop < 3)    dirBias =  1;
    if (distToBottom < 3) dirBias = -1;

    const dir = dirBias !== 0 ? dirBias : (rng() < 0.5 ? 1 : -1);
    const vDist = 2 + Math.floor(rng() * cfg.maxSegV);
    const nextCy = Math.max(1, Math.min(rows - 2, cy + dir * vDist));

    if (nextCy !== cy) {
      pts.push({ col: cx, row: nextCy });
      cy = nextCy;
      turns++;
    }
  }

  // Ensure we reach the far right
  if (pts[pts.length - 1].col < cols - 1) {
    pts.push({ col: cols - 1, row: cy });
  }

  // Convert grid points to pixel waypoints
  const toPixel = (col: number, row: number): Vec2 => ({
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  });

  const waypoints: Vec2[] = [
    { x: -20, y: toPixel(0, startRow).y },           // off-screen entry
    ...pts.map(p => toPixel(p.col, p.row)),
    { x: cols * CELL_SIZE + 20, y: toPixel(0, cy).y }, // off-screen exit
  ];

  // Build path cell set from grid point segments
  const pathCells = new Set<string>();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.col === b.col) {
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        pathCells.add(`${a.col},${r}`);
    } else {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
        pathCells.add(`${c},${a.row}`);
    }
  }

  const gameWidth  = cols * CELL_SIZE;
  const gameHeight = rows * CELL_SIZE;

  return {
    cols, rows, tier,
    waypoints,
    pathCells,
    totalLength: computePathLength(waypoints),
    gameWidth,
    gameHeight,
  };
}

/**
 * Extend an existing map to the next tier.
 * Existing path + towers are fully preserved; a new segment is appended to the right.
 */
export function extendMap(existing: MapData, seed: number, newTier: number): MapData {
  const cfg = MAP_TIERS[Math.min(newTier, MAP_TIERS.length - 1)];
  if (cfg.cols <= existing.cols) return { ...existing, tier: newTier };

  const newRows = Math.max(existing.rows, cfg.rows);
  const rng = seededRng(seed);

  // Find exit row from existing path (last real waypoint before off-screen exit)
  const exitWp = existing.waypoints[existing.waypoints.length - 2];
  const exitRow = Math.round((exitWp.y - CELL_SIZE / 2) / CELL_SIZE);

  // Build new segment starting at (existing.cols-1, exitRow) → (cfg.cols-1, finalRow)
  // Always force at least one vertical turn regardless of how narrow the extension is.
  const pts: { col: number; row: number }[] = [{ col: existing.cols - 1, row: exitRow }];
  let cx = existing.cols - 1, cy = exitRow;
  const newColSpan = cfg.cols - existing.cols;  // how many columns we're adding

  // Split into 2 horizontal segments with a forced vertical turn between them
  const mid1 = existing.cols - 1 + Math.max(1, Math.floor(newColSpan * (0.35 + rng() * 0.3)));
  const midCol = Math.min(mid1, cfg.cols - 2);

  // First horizontal segment → midpoint
  cx = midCol;
  pts.push({ col: cx, row: cy });

  // Vertical turn at midpoint
  const distToTop    = cy - 1;
  const distToBottom = newRows - 2 - cy;
  let dirBias = 0;
  if (distToTop < 3)    dirBias =  1;
  if (distToBottom < 3) dirBias = -1;
  const dir  = dirBias !== 0 ? dirBias : (rng() < 0.5 ? 1 : -1);
  const vDist = 2 + Math.floor(rng() * cfg.maxSegV);
  const nextCy = Math.max(1, Math.min(newRows - 2, cy + dir * vDist));
  if (nextCy !== cy) {
    pts.push({ col: cx, row: nextCy });
    cy = nextCy;
  }

  // Second horizontal segment → end; optionally add more segments if enough room
  while (cx < cfg.cols - 3) {
    const advance = 2 + Math.floor(rng() * 4);
    cx = Math.min(cx + advance, cfg.cols - 3);
    pts.push({ col: cx, row: cy });
    if (cx >= cfg.cols - 3) break;

    const dTop = cy - 1, dBot = newRows - 2 - cy;
    let db2 = 0;
    if (dTop < 3) db2 = 1;
    if (dBot < 3) db2 = -1;
    const d2  = db2 !== 0 ? db2 : (rng() < 0.5 ? 1 : -1);
    const vd2 = 2 + Math.floor(rng() * cfg.maxSegV);
    const nc2 = Math.max(1, Math.min(newRows - 2, cy + d2 * vd2));
    if (nc2 !== cy) { pts.push({ col: cx, row: nc2 }); cy = nc2; }
  }
  if (pts[pts.length - 1].col < cfg.cols - 1) pts.push({ col: cfg.cols - 1, row: cy });

  const toPixel = (col: number, row: number): Vec2 => ({
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  });

  // Merge waypoints: existing (drop last off-screen exit) + new segment + new exit
  const existingWps = existing.waypoints.slice(0, -1);
  const newSegWps   = pts.slice(1).map(p => toPixel(p.col, p.row));
  const newExit: Vec2 = { x: cfg.cols * CELL_SIZE + 20, y: toPixel(cfg.cols - 1, cy).y };
  const waypoints = [...existingWps, ...newSegWps, newExit];

  // Merge path cells: preserve existing, add new segment
  const pathCells = new Set(existing.pathCells);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.col === b.col) {
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        pathCells.add(`${a.col},${r}`);
    } else {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
        pathCells.add(`${c},${a.row}`);
    }
  }

  return {
    cols: cfg.cols, rows: newRows, tier: newTier,
    waypoints, pathCells,
    totalLength: computePathLength(waypoints),
    gameWidth:  cfg.cols * CELL_SIZE,
    gameHeight: newRows  * CELL_SIZE,
  };
}

export function positionOnPath(waypoints: Vec2[], dist: number): Vec2 {
  let remaining = dist;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1], b = waypoints[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLen;
  }
  return { ...waypoints[waypoints.length - 1] };
}
