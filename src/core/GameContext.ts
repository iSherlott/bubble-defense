import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ProjectileData, Puddle, Vec2, OwnedItem, ItemDropAnim } from '../types';
import type { Player } from '../player/Player';
import type { SkillTree } from '../player/SkillTree';
import type { WaveManager } from '../game/WaveManager';
import type { MapData } from '../game/MapGenerator';
import type { AnimationSystem } from '../systems/AnimationSystem';

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
 *
 * Convention: entity arrays and scalar state are directly mutable by systems.
 * Readonly references (map, player, talentTree, waveManager, animations) should
 * only be replaced by Game itself during lifecycle transitions (new game, load).
 */

/** Grouped item-related runtime state */
export interface ItemState {
  titanShieldCharges: number;
  titanShieldWaves: number;
  cataclysmTimer: number;
  lastTronoWave: number;
  lastItemWave: number;
}

export interface IGameContext {
  // Entity arrays (mutable by systems)
  enemies: BaseEnemy[];
  towers: BaseTower[];
  projectiles: ProjectileData[];
  puddles: Puddle[];
  burnZones: BurnZone[];
  floatingTexts: FloatingText[];

  // Game scalars (mutable by systems)
  gold: number;
  lives: number;
  score: number;
  items: OwnedItem[];

  // Item-specific runtime state (grouped)
  readonly itemState: ItemState;

  // Immutable references (set only by Game during lifecycle)
  readonly map: MapData;
  readonly player: Player;
  readonly talentTree: SkillTree;
  readonly waveManager: WaveManager;
  readonly animations: AnimationSystem;

  // Item drop animation
  itemDropAnim: ItemDropAnim | null;

  // Screen transition
  screen: string;

  // Actions
  addFT(pos: Vec2, text: string, color: string): void;
  triggerAoeFlash(x: number, y: number, radius: number): void;
}
