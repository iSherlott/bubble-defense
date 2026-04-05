import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ProjectileData, Puddle, Vec2, OwnedItem, ItemDropAnim } from '../types';
import type { Player } from '../player/Player';
import type { SkillTree } from '../player/SkillTree';
import type { WaveManager } from '../game/WaveManager';
import type { MapData } from '../game/MapGenerator';

// ─── Shared Types (moved from Game.ts) ──────────────────────────────────────

export interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

export interface BurnZone {
  x: number; y: number; radius: number; remaining: number; dmgPerSec: number;
}

// ─── Game Context Interface ─────────────────────────────────────────────────
/**
 * Shared game context that all systems can read/write.
 * Implemented by the Game class.
 */
export interface IGameContext {
  // Entity arrays
  enemies: BaseEnemy[];
  towers: BaseTower[];
  projectiles: ProjectileData[];
  puddles: Puddle[];
  burnZones: BurnZone[];
  floatingTexts: FloatingText[];

  // Game state
  gold: number;
  lives: number;
  score: number;
  items: OwnedItem[];

  // Special item state
  titanShieldCharges: number;
  titanShieldWaves: number;
  cataclysmTimer: number;
  _lastTronoWave: number;
  lastItemWave: number;

  // References
  readonly map: MapData;
  readonly player: Player;
  readonly talentTree: SkillTree;
  readonly waveManager: WaveManager;

  // Item drop animation
  itemDropAnim: ItemDropAnim | null;

  // Screen
  screen: string;

  /**
   * Request a screen transition through the state machine (respects guards).
   * Prefer this over direct `ctx.screen = ...` assignments.
   */
  requestScreen(to: import('../types').GameScreen): void;

  // Actions
  addFT(pos: Vec2, text: string, color: string): void;
  triggerAoeFlash(x: number, y: number, radius: number): void;
}
