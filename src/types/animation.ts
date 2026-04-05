// ─── Animation Pipeline Types ─────────────────────────────────────────────────

// ─── Design-time: defines HOW an animation looks ──────────────────────────────

/** A pluggable animation definition registered by ID. Each def owns its draw(). */
export interface AnimationDefinition {
  /** Unique identifier (e.g. 'aoe_flash', 'chain_lightning', 'frost_nova') */
  readonly id: string;
  /** Default duration in seconds (can be overridden per-request) */
  readonly defaultDuration: number;
  /** Draw this animation onto the canvas. Called every frame while alive. */
  draw(ctx: CanvasRenderingContext2D, instance: AnimationInstance): void;
}

// ─── Runtime: a live animation being ticked by AnimationSystem ────────────────

/** Runtime state for one active animation. Created by AnimationSystem.request(). */
export interface AnimationInstance {
  /** Back-reference to the definition (carries draw logic) */
  readonly def: AnimationDefinition;
  /** Source position */
  sourceX: number;
  sourceY: number;
  /** Target position (for directed animations) */
  targetX: number;
  targetY: number;
  /** Duration in seconds */
  duration: number;
  /** Radius for area-effect animations */
  radius: number;
  /** Elapsed time in seconds */
  elapsed: number;
  /** 0..1 progress through the animation */
  progress: number;
  /** Primary color */
  color: string;
  /** Secondary color */
  secondaryColor: string;
  /** Arbitrary animation-specific data */
  payload: Record<string, unknown>;
}

// ─── Request DTO: emitted by behaviors/systems to trigger animations ──────────

/** Request to play an animation (emitted by behaviors/systems) */
export interface AnimationRequest {
  /** Animation type identifier — must match a registered AnimationDefinition.id */
  id: string;
  /** Source position */
  sourceX: number;
  sourceY: number;
  /** Target position (for directed animations like beams) */
  targetX?: number;
  targetY?: number;
  /** Duration override in seconds (falls back to def.defaultDuration) */
  duration?: number;
  /** Radius for area-effect animations */
  radius?: number;
  /** Primary color override */
  color?: string;
  /** Secondary color override */
  secondaryColor?: string;
  /** Arbitrary animation-specific data */
  payload?: Record<string, unknown>;
}
