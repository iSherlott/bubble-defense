// ─── GameConfig — singleton factory that groups all domain configs ─────────────
// Usage:
//   import { GameConfig } from '../config';
//   const damage = GameConfig.get().combat.earthAoeRadius;
//
// Each sub-config is a plain class with readonly fields so the values are
// clear, grouped by domain, and easily extensible without touching game logic.

import { MapConfig }      from './MapConfig';
import { EconomyConfig }  from './EconomyConfig';
import { CombatConfig }   from './CombatConfig';
import { EnemyConfig }    from './EnemyConfig';
import { TowerConfig }    from './TowerConfig';
import { MovementConfig } from './MovementConfig';
import { PlayerConfig }   from './PlayerConfig';

export class GameConfig {
  private static _instance: GameConfig | null = null;

  readonly map      = new MapConfig();
  readonly economy  = new EconomyConfig();
  readonly combat   = new CombatConfig();
  readonly enemy    = new EnemyConfig();
  readonly tower    = new TowerConfig();
  readonly movement = new MovementConfig();
  readonly player   = new PlayerConfig();

  private constructor() {}

  /** Returns the shared singleton instance */
  static get(): GameConfig {
    if (!GameConfig._instance) GameConfig._instance = new GameConfig();
    return GameConfig._instance;
  }
}

// Re-export individual config classes so callers can type-hint them
export { MapConfig, EconomyConfig, CombatConfig, EnemyConfig, TowerConfig, MovementConfig, PlayerConfig };
export type { MapTierDef } from './MapConfig';
