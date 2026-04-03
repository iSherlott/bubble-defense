import type { IGameContext } from '../core/GameContext';
import { enemyRegistry } from '../registries';
import { BossEnemy } from '../entities/enemies/BossEnemy';

/**
 * BossSystem — processes boss-specific abilities using behaviors from the registry.
 * Extracted from Game.ts processBossAbilities().
 */
export class BossSystem {

  update(ctx: IGameContext, dt: number): void {
    for (const e of ctx.enemies) {
      if (e.dead || !e.def.isBoss) continue;

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
