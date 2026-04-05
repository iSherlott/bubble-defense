// ─── Animation Types ──────────────────────────────────────────────────────────

/** Request to play an animation (emitted by behaviors/systems) */
export interface AnimationRequest {
  /** Animation type identifier (e.g. 'chain_lightning', 'aoe_explosion', 'beam') */
  id: string;
  /** Source position */
  sourceX: number;
  sourceY: number;
  /** Target position (for directed animations like beams, projectiles) */
  targetX?: number;
  targetY?: number;
  /** Duration in seconds */
  duration: number;
  /** Radius for area-effect animations */
  radius?: number;
  /** Primary color */
  color?: string;
  /** Secondary color (for gradients, trails) */
  secondaryColor?: string;
  /** Arbitrary animation-specific data (jumps, phases, intensity, etc.) */
  payload?: Record<string, unknown>;
}

/** Active animation being tracked by the AnimationSystem */
export interface ActiveAnimation {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  duration: number;
  radius: number;
  /** Elapsed time in seconds */
  elapsed: number;
  /** 0..1 progress through the animation */
  progress: number;
  color: string;
  secondaryColor: string;
  payload: Record<string, unknown>;
}

/** Interface for consuming animations (used by renderers) */
export interface IAnimationProvider {
  /** Get all currently active animations */
  getActive(): ReadonlyArray<ActiveAnimation>;
  /** Get active animations filtered by type */
  getByType(id: string): ReadonlyArray<ActiveAnimation>;
}
