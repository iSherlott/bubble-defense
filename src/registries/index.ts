import { TowerRegistry } from './TowerRegistry';
import { EnemyRegistry } from './EnemyRegistry';
import { FusionRegistry } from './FusionRegistry';
import { ItemRegistry } from './ItemRegistry';
import { EvolutionRegistry } from './EvolutionRegistry';

// ─── Global Registry Instances ─────────────────────────────────────────────
export const towerRegistry = new TowerRegistry();
export const enemyRegistry = new EnemyRegistry();
export const fusionRegistry = new FusionRegistry();
export const itemRegistry = new ItemRegistry();
export const evolutionRegistry = new EvolutionRegistry();

// ─── Re-exports ─────────────────────────────────────────────────────────────
export { TowerRegistry } from './TowerRegistry';
export type { TowerBlueprint } from './TowerRegistry';
export { EnemyRegistry } from './EnemyRegistry';
export type { EnemyBlueprint } from './EnemyRegistry';
export { FusionRegistry } from './FusionRegistry';
export type { FusionBlueprint } from './FusionRegistry';
export { ItemRegistry } from './ItemRegistry';
export { EvolutionRegistry } from './EvolutionRegistry';
export { registerEnemyBehavior, getEnemyBehavior, hasEnemyBehavior } from './EnemyBehaviorRegistry';
export { registerMagicBehavior, getMagicBehavior, hasMagicBehavior } from './MagicBehaviorRegistry';
