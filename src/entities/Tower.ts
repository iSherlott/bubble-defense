import type { TowerDef, ElementType, Stats, FusionDef } from '../types';
import type { Enemy } from './Enemy';
import { CELL_SIZE, OPPOSITE_ELEMENT, MAX_TOWER_LEVEL } from '../constants';

let _nextTowerId = 1;
export function resetTowerIds() { _nextTowerId = 1; }

export class Tower {
  readonly id: number;
  readonly def: TowerDef;
  readonly gridX: number;
  readonly gridY: number;
  readonly pixelX: number;
  readonly pixelY: number;
  readonly slotIndex: 0 | 1;  // 0 = left/first, 1 = right/second on same cell

  // Upgrade system
  damageMult: number;    // starts 1.0, each upgrade to damage adds UPGRADE_MULT_STEP
  speedMult: number;     // starts 1.0, each upgrade to speed adds UPGRADE_MULT_STEP
  upgradeCount: number;
  upgradeHistory: Array<'damage'|'speed'>;  // which stat each upgrade boosted
  dualMagic: boolean;    // fires magic twice when bar is full

  // Economy tracking
  placedCost: number;    // gold spent when first placed
  goldSpent: number;     // total gold spent (place + upgrades)

  // Slot role
  isSecondary: boolean;  // slot 1 tower: only fires magic

  // Fusion
  fusionDef: FusionDef | null;

  // State
  cooldown: number;
  magicBar: number;
  totalDamageDealt: number;
  totalKills: number;

  constructor(def: TowerDef, gridX: number, gridY: number, slotIndex: 0 | 1 = 0) {
    this.id = _nextTowerId++;
    this.def = def;
    this.gridX = gridX;
    this.gridY = gridY;

    // Slot offset: 2 towers on same cell rendered at ±9px
    const offsetX = slotIndex === 0 ? -9 : 9;
    this.pixelX = gridX * CELL_SIZE + CELL_SIZE / 2 + offsetX;
    this.pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;

    this.slotIndex = slotIndex;
    this.damageMult = 1.0;
    this.speedMult  = 1.0;
    this.upgradeCount = 0;
    this.upgradeHistory = [];
    this.dualMagic = false;

    this.placedCost  = def.baseCost;
    this.goldSpent   = def.baseCost;
    this.isSecondary = slotIndex === 1;

    this.fusionDef = null;

    this.cooldown = 0;
    this.magicBar = 0;
    this.totalDamageDealt = 0;
    this.totalKills = 0;
  }

  // ─── Level ──────────────────────────────────────────────────────────────────
  get level(): number { return this.upgradeCount + 1; }
  get isMaxLevel(): boolean { return this.upgradeCount >= MAX_TOWER_LEVEL; }

  // ─── Derived stats ──────────────────────────────────────────────────────────
  getFireRate(stats: Stats, talentSpeedBonus: number): number {
    return this.def.baseFireRate * this.speedMult * ((1 + stats.agility * 0.05) + talentSpeedBonus);
  }

  getRange(): number {
    return this.def.baseRange;
  }

  getDamage(stats: Stats, talentDamageBonus: number, affinityMult: number): number {
    return this.def.baseDamage
      * this.damageMult
      * (1 + stats.strength * 0.05 + talentDamageBonus)
      * affinityMult;
  }

  getMagicDamage(stats: Stats, affinityMult: number): number {
    return this.def.magicBaseDamage * (1 + stats.intelligence * 0.10) * affinityMult;
  }

  /** Effective magic bar gain per shot (talent T4 applies +25% gain rate) */
  getEffectiveMagicBarGain(talentMagicSpeedBonus: number): number {
    return this.def.magicBarGain * (1 + talentMagicSpeedBonus);
  }

  // ─── Targeting ──────────────────────────────────────────────────────────────
  /** Returns enemy closest to end of path within range */
  findTarget(enemies: Enemy[]): Enemy | null {
    const range = this.getRange();
    let best: Enemy | null = null;
    let bestDist = -Infinity;
    for (const e of enemies) {
      if (e.dead || e.reachedEnd || e.stunRemaining > 0) continue;
      const dx = e.pos.x - this.pixelX, dy = e.pos.y - this.pixelY;
      if (dx*dx + dy*dy <= range*range && e.distanceTraveled > bestDist) {
        bestDist = e.distanceTraveled;
        best = e;
      }
    }
    return best;
  }

  /** Returns ALL enemies within range, sorted highest → lowest distanceTraveled */
  findAllInRange(enemies: Enemy[]): Enemy[] {
    const range = this.getRange();
    return enemies
      .filter(e => {
        if (e.dead || e.reachedEnd) return false;
        const dx = e.pos.x - this.pixelX, dy = e.pos.y - this.pixelY;
        return dx*dx + dy*dy <= range*range;
      })
      .sort((a, b) => b.distanceTraveled - a.distanceTraveled);
  }

  /** Fire magic: pick first, middle, last enemy in range (for fire tower) */
  findFireMagicTargets(enemies: Enemy[]): Enemy[] {
    const inRange = this.findAllInRange(enemies);
    if (inRange.length === 0) return [];
    if (inRange.length <= 3) return inRange;
    const first  = inRange[0];
    const mid    = inRange[Math.floor((inRange.length - 1) / 2)];
    const last   = inRange[inRange.length - 1];
    // Deduplicate in case of overlap
    const targets = [first];
    if (mid.id !== first.id) targets.push(mid);
    if (last.id !== first.id && last.id !== mid.id) targets.push(last);
    return targets;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  update(dt: number) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  canShoot(stats: Stats, talentSpeedBonus: number): boolean {
    return this.cooldown <= 0;
  }

  /** Call when tower fires a normal shot. Returns true if magic bar is full. */
  onNormalShot(stats: Stats, talentSpeedBonus: number, talentMagicSpeedBonus: number): boolean {
    this.cooldown = 1 / this.getFireRate(stats, talentSpeedBonus);
    this.magicBar = Math.min(this.def.magicBarMax, this.magicBar + this.getEffectiveMagicBarGain(talentMagicSpeedBonus));
    return this.magicBar >= this.def.magicBarMax;
  }

  consumeMagicBar() {
    this.magicBar = 0;
  }

  magicBarRatio(): number {
    return this.magicBar / this.def.magicBarMax;
  }

  // ─── Affinity ───────────────────────────────────────────────────────────────
  computeAffinityMult(affinity: ElementType): number {
    if (this.def.element === affinity) return 2.0;
    if (this.def.element === OPPOSITE_ELEMENT[affinity]) return 0.5;
    return 1.0;
  }
}
