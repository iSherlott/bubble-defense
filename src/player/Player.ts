import type { Stats, StatKey, ElementType, ArchetypeDef } from '../types';
import { XP_TABLE, MAX_LEVEL, TALENT_POINT_EVERY,
  MIN_STAT_VALUE, STARTING_STAT_TOTAL, ARCHETYPE_DEFS } from '../constants';
import {
  CFG_STRENGTH_DMG_BONUS, CFG_INTEL_MAGIC_BONUS, CFG_AGILITY_FIRERATE,
  CFG_LUCK_CRIT_CHANCE, CFG_LUCK_CRIT_MULT, CFG_LUCK_GOLD_BONUS,
  CFG_MIN_HIT_CHANCE, CFG_VITALITY_REGEN_PER_POINT,
} from '../settings';

export class Player {
  level: number;
  xp: number;
  stats: Stats;
  talentPoints: number;
  affinity: ElementType;
  pendingLevelUp: boolean;
  archetypeId: string;
  bonusPoints: number;  // remaining manual distribution points

  constructor() {
    this.level = 0;
    this.xp = 0;
    this.talentPoints = 0;
    this.affinity = 'fire';
    this.pendingLevelUp = false;
    this.archetypeId = '';
    this.bonusPoints = 0;
    this.stats = this.defaultStats();
  }

  private defaultStats(): Stats {
    return { strength: 0, intelligence: 0, dexterity: 0, agility: 0, luck: 0, vitality: 0 };
  }

  // ─── Starting Stat Generation ─────────────────────────────────────────────
  /**
   * Applies archetype base stats + sets bonus points for manual distribution.
   * Total = archetype base (45 pts) + 5 bonus pts the player can distribute.
   */
  applyArchetype(archetypeId: string): void {
    const arch = ARCHETYPE_DEFS.find(a => a.id === archetypeId);
    if (!arch) return;
    this.archetypeId = archetypeId;
    this.stats = { ...arch.baseStats };
    // Sum of base stats is ~45; remaining up to STARTING_STAT_TOTAL goes to bonusPoints
    const baseSum = Object.values(arch.baseStats).reduce((s, v) => s + v, 0);
    this.bonusPoints = Math.max(0, STARTING_STAT_TOTAL - baseSum);
  }

  /** Distribute one bonus point into a stat */
  spendBonusPoint(stat: StatKey): boolean {
    if (this.bonusPoints <= 0) return false;
    this.stats[stat]++;
    this.bonusPoints--;
    return true;
  }

  /**
   * Legacy: Generates random stats. Kept as fallback.
   */
  generateStartingStats(): void {
    const keys: StatKey[] = ['strength','intelligence','dexterity','agility','luck','vitality'];
    const s: Stats = { strength: MIN_STAT_VALUE, intelligence: MIN_STAT_VALUE,
      dexterity: MIN_STAT_VALUE, agility: MIN_STAT_VALUE,
      luck: MIN_STAT_VALUE, vitality: MIN_STAT_VALUE };
    let remaining = STARTING_STAT_TOTAL - keys.length * MIN_STAT_VALUE;
    while (remaining > 0) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      s[key]++;
      remaining--;
    }
    this.stats = s;
  }

  // ─── XP & Leveling ────────────────────────────────────────────────────────
  xpToNextLevel(): number {
    if (this.level >= MAX_LEVEL) return Infinity;
    return XP_TABLE[this.level];
  }

  /** Returns true if leveled up */
  addXp(amount: number): boolean {
    if (this.level >= MAX_LEVEL) return false;
    this.xp += amount;
    if (this.xp >= this.xpToNextLevel()) {
      this.xp -= this.xpToNextLevel();
      this.level++;
      this.pendingLevelUp = true;

      // Talent point every TALENT_POINT_EVERY levels
      if (this.level % TALENT_POINT_EVERY === 0) {
        this.talentPoints++;
      }
      return true;
    }
    return false;
  }

  chooseStat(stat: StatKey) {
    this.stats[stat]++;
    this.pendingLevelUp = false;
  }

  // ─── Derived Stats ────────────────────────────────────────────────────────
  /** Lives regenerated per wave: floor(vitality × CFG_VITALITY_REGEN_PER_POINT) */
  vitalityRegen(): number {
    return Math.floor(this.stats.vitality * CFG_VITALITY_REGEN_PER_POINT);
  }

  /** Crit chance as a fraction (0.0 – 1.0) */
  critChance(): number {
    return Math.min(1.0, this.stats.luck * CFG_LUCK_CRIT_CHANCE);
  }

  /** Crit damage multiplier: 1 + luck × CFG_LUCK_CRIT_MULT */
  critMultiplier(): number {
    return 1 + this.stats.luck * CFG_LUCK_CRIT_MULT;
  }

  /** Hit chance against a given enemy agility — smooth curve with diminishing returns */
  hitChance(enemyAgility: number): number {
    const ratio = this.stats.dexterity / Math.max(1, enemyAgility);
    // Exponential curve: approaches 1.0 asymptotically. k=1.5 gives ~78% at ratio=1, ~95% at ratio=2
    return Math.min(1.0, Math.max(CFG_MIN_HIT_CHANCE, 1 - Math.exp(-1.5 * ratio)));
  }

  /** Gold multiplier from Luck */
  goldMultiplier(): number {
    return 1 + this.stats.luck * CFG_LUCK_GOLD_BONUS;
  }

  /** Physical damage multiplier from Strength */
  strengthMult(): number {
    return 1 + this.stats.strength * CFG_STRENGTH_DMG_BONUS;
  }

  /** Magic damage multiplier from Intelligence */
  intelligenceMult(): number {
    return 1 + this.stats.intelligence * CFG_INTEL_MAGIC_BONUS;
  }

  /** Fire rate multiplier from Agility */
  agilityFireRateMult(): number {
    return 1 + this.stats.agility * CFG_AGILITY_FIRERATE;
  }

  // ─── Serialization ────────────────────────────────────────────────────────
  toJSON() {
    return {
      level: this.level,
      xp: this.xp,
      stats: { ...this.stats },
      talentPoints: this.talentPoints,
      affinity: this.affinity,
      archetypeId: this.archetypeId,
    };
  }

  fromJSON(data: { level: number; xp: number; stats: Stats; talentPoints: number; affinity: ElementType; archetypeId?: string }) {
    this.level = data.level;
    this.xp = data.xp;
    this.stats = { ...data.stats };
    this.talentPoints = data.talentPoints;
    this.affinity = data.affinity;
    this.archetypeId = data.archetypeId ?? '';
    this.pendingLevelUp = false;
  }
}
