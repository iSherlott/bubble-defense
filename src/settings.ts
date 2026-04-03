// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS — Backward-compatibility re-exports from src/config/
//  All tuning is now done inside the domain-specific config classes.
//  Existing code that imports from 'settings' continues to work unchanged.
// ═══════════════════════════════════════════════════════════════════════════════
import { GameConfig } from './config';
const C = GameConfig.get();

// ─── Layout ───────────────────────────────────────────────────────────────────
export const CFG_CELL_SIZE  = C.map.cellSize;
export const CFG_SIDEBAR_W  = C.map.sidebarW;
export const CFG_WAVE_BAR_H = C.map.waveBarH;

// ─── Economy ──────────────────────────────────────────────────────────────────
export const CFG_BASE_LIVES        = C.economy.baseLives;
export const CFG_INITIAL_GOLD      = C.economy.initialGold;
export const CFG_BASE_TOWER_COST   = C.economy.baseTowerCost;
export const CFG_MAP_EXPAND_COST   = C.map.expandCost;

// ─── Tower upgrades ───────────────────────────────────────────────────────────
export const CFG_UPGRADE_MULT_STEP     = C.tower.upgradeMultStep;
export const CFG_MAX_TOWER_LEVEL       = C.tower.maxLevel;
export const CFG_DUAL_MAGIC_BASE_CHANCE = C.tower.dualMagicBaseChance;
export const CFG_DUAL_MAGIC_LUCK_BONUS  = C.tower.dualMagicLuckBonus;

// ─── Player stats ─────────────────────────────────────────────────────────────
export const CFG_MIN_STAT_VALUE        = C.player.minStatValue;
export const CFG_STARTING_STAT_TOTAL   = C.player.startingStatTotal;
export const CFG_STRENGTH_DMG_BONUS    = C.player.strengthDmgBonus;
export const CFG_INTEL_MAGIC_BONUS     = C.player.intelMagicBonus;
export const CFG_AGILITY_FIRERATE      = C.player.agilityFireRate;
export const CFG_LUCK_CRIT_CHANCE      = C.player.luckCritChance;
export const CFG_LUCK_CRIT_MULT        = C.player.luckCritMult;
export const CFG_VITALITY_REGEN_PER_POINT = C.player.vitalityRegenPerPoint;
export const CFG_LUCK_GOLD_BONUS       = C.player.luckGoldBonus;

// ─── Hit/miss ─────────────────────────────────────────────────────────────────
export const CFG_MIN_HIT_CHANCE = C.player.minHitChance;

// ─── Player leveling ──────────────────────────────────────────────────────────
export const CFG_MAX_LEVEL          = C.player.maxLevel;
export const CFG_TALENT_POINT_EVERY = C.player.talentPointEvery;

// ─── Enemy scaling ────────────────────────────────────────────────────────────
export const CFG_ENEMY_HP_SCALE_PER_WAVE    = C.enemy.hpScalePerWave;
export const CFG_ENEMY_HP_COMPOUND_RATE     = C.enemy.hpCompoundRate;
export const CFG_ENEMY_HP_COMPOUND_START    = C.enemy.hpCompoundStart;
export const CFG_ENEMY_SPEED_SCALE_PER_WAVE = C.enemy.speedScalePerWave;
export const CFG_ENEMY_AGILITY_SCALE        = C.enemy.agilityScale;
export const CFG_ENEMY_REWARD_SCALE         = C.economy.rewardScalePerWave;
export const CFG_ENEMY_XP_SCALE             = C.economy.xpScalePerWave;

// ─── Wave composition ─────────────────────────────────────────────────────────
export const CFG_WAVE_BASE_COUNT     = C.enemy.waveBaseCount;
export const CFG_WAVE_COUNT_PER_WAVE = C.enemy.waveCountPerWave;
export const CFG_ELITE_START_WAVE    = C.enemy.eliteStartWave;
export const CFG_ELITE_BASE_MULT     = C.enemy.eliteBaseMult;
export const CFG_ELITE_MAX_MULT      = C.enemy.eliteMaxMult;
export const CFG_ELITE_SCALE_WAVES   = C.enemy.eliteScaleWaves;

// ─── Tower movement ───────────────────────────────────────────────────────────
export const CFG_MOVE_COST_MULT = C.movement.moveCostMult;

// ─── Synergy ──────────────────────────────────────────────────────────────────
export const CFG_SYNERGY_DAMAGE_BONUS = C.combat.synergyDamageBonus;

// ─── Golem special abilities ──────────────────────────────────────────────────
export const CFG_FIRE_GOLEM_REGEN_PER_HIT  = 0.003; // legacy — kept for compat (no longer used)
export const CFG_WATER_GOLEM_PUDDLE_REGEN  = C.combat.waterGolemPuddleRegen;
export const CFG_EARTH_GOLEM_SHIELD_RADIUS = C.combat.earthGolemShieldRadius;
export const CFG_WIND_GOLEM_PUSH_IMMUNE    = C.combat.windGolemPushImmune;

// ─── Magic / special effects ──────────────────────────────────────────────────
export const CFG_WIND_PUSH_CELLS    = C.combat.windPushCells;
export const CFG_EARTH_AOE_RADIUS   = C.combat.earthAoeRadius;
export const CFG_BURN_PCT_PER_SEC   = C.combat.burnPctPerSec;
export const CFG_BURN_DURATION      = C.combat.burnDuration;
export const CFG_PUDDLE_RADIUS      = C.combat.puddleRadius;
export const CFG_PUDDLE_DURATION    = C.combat.puddleDuration;
export const CFG_PUDDLE_SLOW_AMOUNT = C.combat.puddleSlowAmount;
export const CFG_WATER_PUDDLE_CHANCE = C.combat.puddleChance;
export const CFG_PERM_SLOW_PER_STACK = C.combat.permSlowPerStack;
export const CFG_MAX_PERM_SLOW_STACKS = C.combat.maxPermSlowStacks;

// ─── Map growth (kept as array literal for constants/index.ts) ────────────────
export const CFG_MAP_TIERS = C.map.tiers.map(t => ({ ...t })) as Array<{
  cols: number; rows: number; minSegH: number; maxSegH: number; maxSegV: number;
}>;
