// ─── AnimationRegistry — global catalog of animation definitions ──────────────

import type { AnimationDefinition } from '../types/animation';

const defs = new Map<string, AnimationDefinition>();

/** Register an animation definition. Throws if the ID is already taken. */
export function registerAnimation(def: AnimationDefinition): void {
  if (defs.has(def.id)) throw new Error(`Animation '${def.id}' already registered`);
  defs.set(def.id, def);
}

/** Retrieve a registered animation definition by ID. Returns undefined if not found. */
export function getAnimationDef(id: string): AnimationDefinition | undefined {
  return defs.get(id);
}

/** Check whether an animation ID has been registered. */
export function hasAnimationDef(id: string): boolean {
  return defs.has(id);
}
