// ─── BaseTower — common tower state, upgrade system, targeting, and stats ─────
// Subclasses:
//   SingleTower  — normal one-element tower (slot 0 or 1)
//   FusionTower  — two-tower fusion with combined magic bar max

import type { TowerDef, ElementType, Stats, FusionDef, EvolutionDef } from '../types';
import type { BaseEnemy } from './BaseEnemy';
import { BaseEntity, nextEntityId } from './BaseEntity';
import { GameConfig } from '../config';

const CELL_SIZE = GameConfig.get().map.cellSize;

export abstract class BaseTower extends BaseEntity {
  readonly id: number;
  readonly def: TowerDef;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  slotIndex: 0 | 1;

  // dead is required by BaseEntity but towers never die in the traditional sense;
  // they are removed explicitly — so this always stays false.
  dead = false;
  pos = { x: 0, y: 0 };  // kept in sync with pixelX/Y for BaseEntity contract

  // Upgrade state
  damageMult: number;
  speedMult: number;
  upgradeCount: number;
  upgradeHistory: Array<'damage' | 'speed'>;
  dualMagic: boolean;

  // Economy
  placedCost: number;
  goldSpent: number;
  isSecondary: boolean;

  // Fusion
  fusionDef: FusionDef | null;

  // Evolution
  evolutionDef: EvolutionDef | null;

  // Runtime
  cooldown: number;
  magicBar: number;
  totalDamageDealt: number;
  totalKills: number;

  /** Remaining seconds this tower is disabled by a disabler enemy aura */
  disabledTimer: number;

  constructor(def: TowerDef, gridX: number, gridY: number, slotIndex: 0 | 1 = 0) {
    super();
    this.id = nextEntityId();
    this.def = def;
    this.gridX = gridX;
    this.gridY = gridY;
    this.slotIndex = slotIndex;

    // Two towers share a cell: rendered at ±9px
    const offsetX = slotIndex === 0 ? -9 : 9;
    this.pixelX = gridX * CELL_SIZE + CELL_SIZE / 2 + offsetX;
    this.pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.pos = { x: this.pixelX, y: this.pixelY };

    this.damageMult   = 1.0;
    this.speedMult    = 1.0;
    this.upgradeCount = 0;
    this.upgradeHistory = [];
    this.dualMagic = false;

    this.placedCost  = def.baseCost;
    this.goldSpent   = def.baseCost;
    this.isSecondary = slotIndex === 1;

    this.fusionDef = null;
    this.evolutionDef = null;

    this.cooldown = 0;
    this.magicBar = 0;
    this.totalDamageDealt = 0;
    this.totalKills = 0;
    this.disabledTimer = 0;
  }

  // ─── Level ──────────────────────────────────────────────────────────────────
  get level(): number { return this.upgradeCount + 1; }
  get isMaxLevel(): boolean { return this.upgradeCount >= GameConfig.get().tower.maxLevel; }

  /** Tower is eligible for evolution: reached evolution level, not yet evolved, not fused */
  get needsEvolution(): boolean {
    return this.upgradeCount >= GameConfig.get().tower.evolutionLevel
      && !this.evolutionDef
      && !this.fusionDef;
  }

  // ─── Magic bar ──────────────────────────────────────────────────────────────
  /** Subclasses may override to apply magicBarMaxMult from fusionDef */
  get effectiveMagicBarMax(): number {
    return this.def.magicBarMax
      * (this.fusionDef?.magicBarMaxMult ?? 1)
      * (this.evolutionDef?.magicBarMaxMult ?? 1);
  }

  magicBarRatio(): number {
    return this.magicBar / this.effectiveMagicBarMax;
  }

  // ─── Derived combat stats ────────────────────────────────────────────────────
  /** Evolution fire rate multiplier (1.0 if not evolved) */
  private get evoFireRateMult(): number { return this.evolutionDef?.fireRateMult ?? 1; }
  /** Evolution range multiplier (1.0 if not evolved) */
  private get evoRangeMult(): number { return this.evolutionDef?.rangeMult ?? 1; }
  /** Evolution damage multiplier (1.0 if not evolved) */
  private get evoDamageMult(): number { return this.evolutionDef?.damageMult ?? 1; }
  /** Evolution magic damage multiplier (1.0 if not evolved) */
  private get evoMagicDamageMult(): number { return this.evolutionDef?.magicDamageMult ?? 1; }

  getFireRate(stats: Stats, talentSpeedBonus: number): number {
    return this.def.baseFireRate * this.speedMult * this.evoFireRateMult
      * ((1 + stats.agility * 0.05) + talentSpeedBonus);
  }

  getRange(mult = 1.0): number {
    return this.def.baseRange * this.evoRangeMult * mult;
  }

  getDamage(stats: Stats, talentDamageBonus: number, affinityMult: number): number {
    return this.def.baseDamage
      * this.damageMult
      * this.evoDamageMult
      * (1 + stats.strength * 0.05 + talentDamageBonus)
      * affinityMult;
  }

  getMagicDamage(stats: Stats, affinityMult: number): number {
    return this.def.magicBaseDamage * this.evoMagicDamageMult
      * (1 + stats.intelligence * 0.10) * affinityMult;
  }

  getEffectiveMagicBarGain(talentMagicSpeedBonus: number): number {
    return this.def.magicBarGain * (1 + talentMagicSpeedBonus);
  }

  // ─── Targeting ──────────────────────────────────────────────────────────────
  findTarget(enemies: BaseEnemy[], rangeMult = 1.0): BaseEnemy | null {
    const range = this.getRange(rangeMult);
    let best: BaseEnemy | null = null;
    let bestDist = -Infinity;
    for (const e of enemies) {
      if (e.dead || e.reachedEnd || e.stunRemaining > 0) continue;
      const dx = e.pos.x - this.pixelX, dy = e.pos.y - this.pixelY;
      if (dx * dx + dy * dy <= range * range && e.distanceTraveled > bestDist) {
        bestDist = e.distanceTraveled;
        best = e;
      }
    }
    return best;
  }

  findAllInRange(enemies: BaseEnemy[], rangeMult = 1.0): BaseEnemy[] {
    const range = this.getRange(rangeMult);
    return enemies
      .filter(e => {
        if (e.dead || e.reachedEnd) return false;
        const dx = e.pos.x - this.pixelX, dy = e.pos.y - this.pixelY;
        return dx * dx + dy * dy <= range * range;
      })
      .sort((a, b) => b.distanceTraveled - a.distanceTraveled);
  }

  findFireMagicTargets(enemies: BaseEnemy[]): BaseEnemy[] {
    const inRange = this.findAllInRange(enemies);
    if (inRange.length === 0) return [];
    if (inRange.length <= 3) return inRange;
    const first = inRange[0];
    const mid   = inRange[Math.floor((inRange.length - 1) / 2)];
    const last  = inRange[inRange.length - 1];
    const targets = [first];
    if (mid.id !== first.id) targets.push(mid);
    if (last.id !== first.id && last.id !== mid.id) targets.push(last);
    return targets;
  }

  // ─── Shooting ───────────────────────────────────────────────────────────────
  update(dt: number) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.disabledTimer > 0) this.disabledTimer -= dt;
  }

  canShoot(): boolean {
    return this.cooldown <= 0 && this.disabledTimer <= 0;
  }

  /** Whether the tower is currently disabled by a disabler enemy aura */
  get isDisabled(): boolean {
    return this.disabledTimer > 0;
  }

  onNormalShot(stats: Stats, talentSpeedBonus: number, talentMagicSpeedBonus: number): boolean {
    this.cooldown = 1 / this.getFireRate(stats, talentSpeedBonus);
    const max = this.effectiveMagicBarMax;
    this.magicBar = Math.min(max, this.magicBar + this.getEffectiveMagicBarGain(talentMagicSpeedBonus));
    return this.magicBar >= max;
  }

  consumeMagicBar() {
    this.magicBar = 0;
  }

  // ─── Relocation ─────────────────────────────────────────────────────────────
  moveTo(gridX: number, gridY: number, slot: 0 | 1) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.slotIndex = slot;
    const offsetX = slot === 0 ? -9 : 9;
    this.pixelX = gridX * CELL_SIZE + CELL_SIZE / 2 + offsetX;
    this.pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.pos = { x: this.pixelX, y: this.pixelY };
  }

  // ─── Affinity ───────────────────────────────────────────────────────────────
  computeAffinityMult(affinity: ElementType): number {
    if (this.def.element === affinity) return 2.0;
    return 1.0;  // affinity is bonus-only — no penalty for off-element
  }
}
