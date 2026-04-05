import { BASE_LIVES } from '../../constants';
import type { ResourceSliceState } from '../GameState';

/**
 * ResourceSlice — typed operations on economy state.
 * Covers gold, lives, and score.
 * Accessed via StateStore.resourceMgr.
 */
export class ResourceSlice {
  constructor(private s: ResourceSliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get gold(): number  { return this.s.gold; }
  get lives(): number { return this.s.lives; }
  get score(): number { return this.s.score; }

  canAfford(amount: number): boolean { return this.s.gold >= amount; }

  // ─── Gold ──────────────────────────────────────────────────────────────────
  earnGold(amount: number): void  { this.s.gold += amount; }
  spendGold(amount: number): void { this.s.gold = Math.max(0, this.s.gold - amount); }
  setGold(amount: number): void   { this.s.gold = amount; }

  // ─── Lives ─────────────────────────────────────────────────────────────────
  loseLife(amount = 1): void {
    this.s.lives = Math.max(0, this.s.lives - amount);
  }

  gainLife(amount: number): void {
    this.s.lives = Math.min(BASE_LIVES, this.s.lives + amount);
  }

  healFull(): void  { this.s.lives = BASE_LIVES; }
  setLives(n: number): void { this.s.lives = n; }

  get isGameOver(): boolean { return this.s.lives <= 0; }

  // ─── Score ─────────────────────────────────────────────────────────────────
  addScore(amount: number): void { this.s.score += amount; }
  setScore(amount: number): void { this.s.score = amount; }

  // ─── Reset ─────────────────────────────────────────────────────────────────
  reset(gold: number, lives: number): void {
    this.s.gold  = gold;
    this.s.lives = lives;
    this.s.score = 0;
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): ResourceSliceState { return this.s; }
}
