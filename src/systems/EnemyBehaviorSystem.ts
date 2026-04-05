import type { IGameContext } from '../core/GameContext';
import { enemyRegistry } from '../registries';

/**
 * EnemyBehaviorSystem — processes enemy-specific abilities using behaviors from the registry.
 * Runs on ANY enemy that has registered behaviors (bosses, specials, etc.).
 */
export class EnemyBehaviorSystem {

  update(ctx: IGameContext, dt: number): void {
    // Reset per-frame transient modifiers BEFORE any behavior can set them.
    // This ensures anchor/aura effects expire when the source dies or moves away.
    for (const e of ctx.enemies) {
      if (!e.dead) {
        e.tempDamageReduction = 0;
        e.tempSpeedBoost      = 1;
        e.resistedElement     = null;
      }
    }

    for (const e of ctx.enemies) {
      if (e.dead) continue;

      // Look up behaviors from registry
      const blueprint = enemyRegistry.get(e.def.id);
      if (blueprint) {
        for (const behavior of blueprint.behaviors) {
          behavior.onUpdate?.(ctx, e, dt);
        }
      }
    }
  }
}
