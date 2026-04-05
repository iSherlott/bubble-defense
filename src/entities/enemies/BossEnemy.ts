// ─── BossEnemy — boss with optional shield phase and add-spawn mechanics ──────
// Boss abilities:
//   'summon_adds'  – spawns minions at 75%, 50%, 25% HP thresholds
//   'shield_phase' – becomes invulnerable at 50% HP for a few seconds
//   'fire_trail'   – leaves a burning trail (handled by Game.ts)

import type { EnemyDef, ElementType, Vec2 } from '../../types';
import { BaseEnemy } from '../BaseEnemy';

export class BossEnemy extends BaseEnemy {
  // summon_adds tracking
  addsSpawned: number;   // how many 25%-threshold triggers fired

  // shield_phase tracking
  private _shieldActive = false;
  shieldTimer: number;
  shieldTriggered: boolean;

  /**
   * Generic per-boss phase state used by behavior classes.
   * Key naming convention: '<behaviorPrefix>_<field>'.
   * All values are numbers (0 = false/inactive, positive = timer or flag).
   */
  phaseData: Record<string, number> = {};

  override get shieldActive(): boolean { return this._shieldActive; }
  set shieldActive(v: boolean) { this._shieldActive = v; }

  constructor(def: EnemyDef, wave = 1, eliteMult = 1) {
    super(def, wave, eliteMult);
    this.addsSpawned    = 0;
    this._shieldActive  = false;
    this.shieldTimer    = 0;
    this.shieldTriggered = false;
  }

  override receiveDamage(baseDamage: number, element: ElementType): number {
    // Shield phase: immune to all damage
    if (this.shieldActive) return 0;
    return super.receiveDamage(baseDamage, element);
  }

  override update(dt: number, waypoints: Vec2[], totalLength: number) {
    if (this.dead || this.reachedEnd) return;

    // Shield countdown
    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }

    super.update(dt, waypoints, totalLength);
  }

  /** Attempt to trigger shield phase at 50% HP — call from Game.ts on damage */
  tryTriggerShield(): boolean {
    if (!this.hasBehavior('shield_phase')) return false;
    if (this.shieldTriggered) return false;
    if (this.hp / this.maxHp <= 0.5) {
      this.shieldActive    = true;
      this.shieldTimer     = 4.0;  // 4 seconds of immunity
      this.shieldTriggered = true;
      return true;
    }
    return false;
  }

  /** Returns which add-spawn threshold (1,2,3) just triggered, or 0 if none */
  checkAddSpawn(): number {
    if (!this.hasBehavior('summon_adds')) return 0;
    const ratio = this.hp / this.maxHp;
    const threshold = Math.ceil(ratio / 0.25);  // 3→75%, 2→50%, 1→25%
    const needed = 3 - this.addsSpawned;        // thresholds not yet triggered
    if (needed > 0 && threshold < needed) {
      this.addsSpawned++;
      return needed;
    }
    return 0;
  }

  /** Check if this boss has a specific behavior attached via def */
  private hasBehavior(id: string): boolean {
    return this.def.behaviorIds?.includes(id) || this.def.bossAbility === id;
  }
}
