// ─── BaseEntity — root of every in-world object ────────────────────────────────
// Towers and enemies both share: a unique ID, a canvas position, and a dead flag.
import type { Vec2 } from '../types';

let _globalEntityId = 1;
export function nextEntityId(): number { return _globalEntityId++; }
export function resetEntityIds()       { _globalEntityId = 1; }

export abstract class BaseEntity {
  abstract readonly id: number;
  abstract pos: Vec2;
  abstract dead: boolean;
}
