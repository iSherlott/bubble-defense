import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { IGameContext } from '../core/GameContext';
import type { ProjectileData, ElementType, FusionDef } from '../types';

// ─── Tower Magic Strategy ─────────────────────────────────────────────────────

/** Strategy for element-specific magic attacks (fire/water/earth/wind) */
export interface MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void;
}

// ─── Fusion Magic Strategy ────────────────────────────────────────────────────

/** Strategy for fusion-specific magic attacks */
export interface FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void;
}

// ─── Enemy Behavior (Composable) ──────────────────────────────────────────────

/** Composable behavior for enemies (boss abilities, special mechanics) */
export interface EnemyBehavior {
  id: string;
  onUpdate?(ctx: IGameContext, enemy: BaseEnemy, dt: number): void;
}

// ─── Item Effect (Composable) ─────────────────────────────────────────────────

/** Composable effect for items — each item registers one of these */
export interface ItemEffect {
  id: string;

  // Additive modifier hooks (return the bonus amount to add)
  modifyDamage?(element: ElementType, stacks: number): number;
  modifySpeed?(element: ElementType, stacks: number): number;
  modifyRange?(element: ElementType, stacks: number): number;
  modifyMagicCharge?(element: ElementType, stacks: number): number;
  modifyGoldPerKill?(stacks: number): number;
  modifyCost?(stacks: number): number;
  modifySlowAura?(stacks: number): number;
  modifyWindPush?(stacks: number): number;
  modifyWindStun?(stacks: number): number;
  modifyWaterSlow?(stacks: number): number;
  modifyEarthRadius?(stacks: number): number;

  // Multiplicative damage modifiers (return multiplier, e.g. 1.18)
  modifyHunterDmg?(enemy: BaseEnemy, stacks: number): number;
  modifyBossDmg?(enemy: BaseEnemy, stacks: number): number;

  // Flag-based effects
  hasEffect?(effectId: string): boolean;
  getEffectChance?(effectId: string, stacks: number): number;
  getEffectValue?(effectId: string, stacks: number): number;

  // Event hooks
  onWaveStart?(ctx: IGameContext, stacks: number): void;
  onWaveComplete?(ctx: IGameContext, stacks: number): void;
}
