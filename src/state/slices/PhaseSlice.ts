import type { PhaseSliceState } from '../GameState';

/**
 * PhaseSlice — typed operations on game-flow state.
 * Covers pause, speed, wave automation, and debug mode.
 * Accessed via StateStore.phaseMgr.
 */
export class PhaseSlice {
  constructor(private s: PhaseSliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get paused(): boolean       { return this.s.paused; }
  get autoWave(): boolean     { return this.s.autoWave; }
  get gameSpeed(): 1 | 2      { return this.s.gameSpeed; }
  get debugMode(): boolean    { return this.s.debugMode; }

  // ─── Pause ─────────────────────────────────────────────────────────────────
  pause(): void    { this.s.paused = true; }
  resume(): void   { this.s.paused = false; }
  togglePause(): void { this.s.paused = !this.s.paused; }

  // ─── Auto wave ─────────────────────────────────────────────────────────────
  enableAutoWave(): void   { this.s.autoWave = true; }
  disableAutoWave(): void  { this.s.autoWave = false; }
  toggleAutoWave(): void   { this.s.autoWave = !this.s.autoWave; }

  // ─── Speed ─────────────────────────────────────────────────────────────────
  setSpeed(speed: 1 | 2): void { this.s.gameSpeed = speed; }
  toggleSpeed(): void { this.s.gameSpeed = this.s.gameSpeed === 1 ? 2 : 1; }

  // ─── Debug ─────────────────────────────────────────────────────────────────
  enableDebug(): void  { this.s.debugMode = true; }
  disableDebug(): void { this.s.debugMode = false; }
  toggleDebug(): void  { this.s.debugMode = !this.s.debugMode; }

  // ─── Reset ─────────────────────────────────────────────────────────────────
  reset(): void {
    this.s.paused    = false;
    this.s.autoWave  = false;
    this.s.gameSpeed = 1;
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): PhaseSliceState { return this.s; }
}
