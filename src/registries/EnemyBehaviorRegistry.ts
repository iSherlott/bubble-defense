// ─── Enemy Behavior Registry ─────────────────────────────────────────────────
// Maps behavior IDs → EnemyBehavior instances.
// Behaviors register themselves here; registerAll wires them to enemies automatically.

import type { EnemyBehavior } from '../behaviors/types';

const behaviors = new Map<string, EnemyBehavior>();

/** Register an enemy behavior by its ID. */
export function registerEnemyBehavior(behavior: EnemyBehavior): void {
  if (behaviors.has(behavior.id)) {
    console.warn(`[EnemyBehaviorRegistry] Behavior '${behavior.id}' already registered — overwriting.`);
  }
  behaviors.set(behavior.id, behavior);
}

/** Retrieve a registered behavior by ID. */
export function getEnemyBehavior(id: string): EnemyBehavior | undefined {
  return behaviors.get(id);
}

/** Check whether a behavior ID has been registered. */
export function hasEnemyBehavior(id: string): boolean {
  return behaviors.has(id);
}
