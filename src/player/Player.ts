import type { Stats, StatKey, ElementType } from '../types';
import { XP_TABLE, MAX_LEVEL, TALENT_POINT_EVERY,
  MIN_STAT_VALUE, STARTING_STAT_TOTAL } from '../constants';
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

  constructor() {
    this.level = 0;
    this.xp = 0;
    this.talentPoints = 0;
    this.affinity = 'fire';
    this.pendingLevelUp = false;
    this.stats = this.defaultStats();
  }

  private defaultStats(): Stats {
    return { strength: 0, intelligence: 0, dexterity: 0, agility: 0, luck: 0, vitality: 0 };
  }

  // ─── Starting Stat Generation ─────────────────────────────────────────────
  /**
   * Generates 50 random stat points with minimum MIN_STAT_VALUE per stat.
   * Called when starting a new game after affinity choice.
   */
  generateStartingStats(): void {
    const keys: StatKey[] = ['strength','intelligence','dexterity','agility','luck','vitality'];
    const s: Stats = { strength: MIN_STAT_VALUE, intelligence: MIN_STAT_VALUE,
      dexterity: MIN_STAT_VALUE, agility: MIN_STAT_VALUE,
      luck: MIN_STAT_VALUE, vitality: MIN_STAT_VALUE };

    // Distribute remaining points randomly
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

  /** Hit chance against a given enemy agility */
  hitChance(enemyAgility: number): number {
    const dex = this.stats.dexterity;
    return Math.min(1.0, Math.max(CFG_MIN_HIT_CHANCE, dex / enemyAgility));
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
    };
  }

  fromJSON(data: ReturnType<Player['toJSON']>) {
    this.level = data.level;
    this.xp = data.xp;
    this.stats = { ...data.stats };
    this.talentPoints = data.talentPoints;
    this.affinity = data.affinity;
    this.pendingLevelUp = false;
  }
}
