// ─── Enemy Render Profiles ───────────────────────────────────────────────────
// Maps an enemy def to a draw function instead of hardcoded if/else chains.

/** Signature for a draw function that renders an enemy body shape */
export type EnemyDrawFn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  isBoss: boolean,
) => void;

const registry = new Map<string, EnemyDrawFn>();

export function registerEnemyRenderProfile(id: string, fn: EnemyDrawFn): void {
  registry.set(id, fn);
}

export function getEnemyRenderProfile(id: string): EnemyDrawFn | undefined {
  return registry.get(id);
}

/** Fallback: filled circle */
export const defaultDrawFn: EnemyDrawFn = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};
