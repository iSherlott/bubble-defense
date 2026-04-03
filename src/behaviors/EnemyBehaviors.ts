import type { EnemyBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { createEnemy } from '../entities/Enemy';
import { enemyRegistry } from '../registries';

// ─── Summon Adds (Goblin King) ───────────────────────────────────────────────

export class SummonAddsBehavior implements EnemyBehavior {
  id = 'summon_adds';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    const spawnTrigger = enemy.checkAddSpawn();
    if (spawnTrigger > 0) {
      const goblinDef = enemyRegistry.getDef('goblin')!;
      for (let i = 0; i < 2; i++) {
        const add = createEnemy(goblinDef, ctx.waveManager.currentWave, 1);
        add.distanceTraveled = Math.max(0, enemy.distanceTraveled - 30 - i * 20);
        add.pos = { ...enemy.pos };
        ctx.enemies.push(add);
        ctx.waveManager.totalEnemiesThisWave++;
      }
      ctx.addFT(enemy.pos, '👑 Invocação!', '#44ff44');
    }
  }
}

// ─── Fire Trail (Chaos Dragon) ───────────────────────────────────────────────

export class FireTrailBehavior implements EnemyBehavior {
  id = 'fire_trail';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    enemy._trailTimer -= dt;
    if (enemy._trailTimer <= 0) {
      enemy._trailTimer = 2.0;
      // Create a burn zone that damages towers' targets (hazard fire zone)
      ctx.burnZones.push({
        x: enemy.pos.x, y: enemy.pos.y, radius: 35,
        remaining: 6, dmgPerSec: enemy.maxHp * 0.02,
      });
      ctx.addFT(enemy.pos, '🔥 Rastro!', '#ff4400');
    }
  }
}

// ─── Shield Phase (Shadow Titan) ─────────────────────────────────────────────

export class ShieldPhaseBehavior implements EnemyBehavior {
  id = 'shield_phase';

  onUpdate(ctx: IGameContext, enemy: BaseEnemy, _dt: number): void {
    if (!(enemy instanceof BossEnemy)) return;
    if (enemy.tryTriggerShield()) {
      ctx.addFT(enemy.pos, '🛡 ESCUDO ATIVO!', '#aa44ff');
    }
  }
}
