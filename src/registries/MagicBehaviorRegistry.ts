import type { MagicBehavior } from '../behaviors/types';

// ─── MagicBehaviorRegistry — global catalog of MagicBehavior by ID ────────────
const behaviors = new Map<string, MagicBehavior>();

export function registerMagicBehavior(id: string, behavior: MagicBehavior): void {
  if (behaviors.has(id)) console.warn(`[MagicBehaviorRegistry] Overwriting behavior '${id}'`);
  behaviors.set(id, behavior);
}

export function getMagicBehavior(id: string): MagicBehavior | undefined {
  return behaviors.get(id);
}

export function hasMagicBehavior(id: string): boolean {
  return behaviors.has(id);
}
