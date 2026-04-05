// ─── Player Stats & Leveling Configuration ───────────────────────────────────
export class PlayerConfig {
  // Leveling
  readonly maxLevel          = 100;
  readonly talentPointEvery  = 10;  // earn 1 talent point per N levels

  // Starting stats
  readonly minStatValue      = 5;
  readonly startingStatTotal = 50;

  // Stat multipliers (applied in Player derived-stat methods)
  readonly strengthDmgBonus      = 0.05;  // +5% physical damage per point
  readonly intelMagicBonus       = 0.10;  // +10% magic damage per point
  readonly agilityFireRate       = 0.05;  // +5% fire rate per point
  readonly luckCritChance        = 0.01;  // crit chance per luck point
  readonly luckCritMult          = 0.10;  // crit multiplier per luck point (1 + luck×this)
  readonly luckGoldBonus         = 0.02;  // gold reward multiplier per luck point
  readonly vitalityRegenPerPoint = 0.25;  // lives regen per wave per vitality point

  // Hit chance
  readonly minHitChance = 0.25;
}
