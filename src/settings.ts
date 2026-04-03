// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS — Centralized game configuration
//  Edit the values here to tune any mechanic without touching game logic.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Layout ───────────────────────────────────────────────────────────────────
export const CFG_CELL_SIZE   = 40;    // pixel size of each grid cell
export const CFG_SIDEBAR_W   = 240;   // sidebar width in pixels
export const CFG_WAVE_BAR_H  = 32;    // wave progress bar height

// ─── Economy ──────────────────────────────────────────────────────────────────
export const CFG_BASE_LIVES        = 20;    // starting lives
export const CFG_INITIAL_GOLD      = 300;   // starting gold
export const CFG_BASE_TOWER_COST   = 80;    // base cost of any tower (scales per type placed)
export const CFG_MAP_EXPAND_COST   = 300;   // gold to manually expand map one tier

// ─── Tower upgrades ───────────────────────────────────────────────────────────
export const CFG_UPGRADE_MULT_STEP    = 0.1;    // damage/speed added per upgrade step
export const CFG_MAX_TOWER_LEVEL      = 10;     // max upgrade count (display level = count+1)
export const CFG_DUAL_MAGIC_BASE_CHANCE = 0.0001; // base chance per upgrade to unlock dual magic
export const CFG_DUAL_MAGIC_LUCK_BONUS  = 0.001;  // extra chance per luck point

// ─── Player stats ─────────────────────────────────────────────────────────────
export const CFG_MIN_STAT_VALUE    = 5;     // minimum value for each stat at game start
export const CFG_STARTING_STAT_TOTAL = 50;  // total distributed starting points
export const CFG_STRENGTH_DMG_BONUS  = 0.05; // +% physical damage per strength point
export const CFG_INTEL_MAGIC_BONUS   = 0.10; // +% magic damage per intelligence point
export const CFG_AGILITY_FIRERATE    = 0.05; // +% fire rate per agility point
export const CFG_LUCK_CRIT_CHANCE    = 0.01; // crit chance fraction per luck point
export const CFG_LUCK_CRIT_MULT      = 0.10; // crit multiplier added per luck point (1 + luck×this)
export const CFG_VITALITY_REGEN_PER_POINT = 0.25; // lives regenerated per wave per vitality point (floor)
export const CFG_LUCK_GOLD_BONUS     = 0.02; // gold reward multiplier bonus per luck point

// ─── Hit/miss ─────────────────────────────────────────────────────────────────
export const CFG_MIN_HIT_CHANCE   = 0.25;  // minimum hit probability regardless of dex/agility

// ─── Player leveling ──────────────────────────────────────────────────────────
export const CFG_MAX_LEVEL          = 50;
export const CFG_TALENT_POINT_EVERY = 10;  // gain 1 talent point per N levels

// ─── Enemy scaling ────────────────────────────────────────────────────────────
export const CFG_ENEMY_HP_SCALE_PER_WAVE    = 0.10; // +10% HP per wave (linear part)
export const CFG_ENEMY_HP_COMPOUND_RATE     = 0.03; // 3% compound HP growth after threshold
export const CFG_ENEMY_HP_COMPOUND_START    = 10;   // wave where compound scaling begins
export const CFG_ENEMY_SPEED_SCALE_PER_WAVE = 0.02; // +2% speed per wave
export const CFG_ENEMY_AGILITY_SCALE        = 0.03; // +3% agility per wave
export const CFG_ENEMY_REWARD_SCALE         = 0.04; // +4% gold reward per wave
export const CFG_ENEMY_XP_SCALE             = 0.03; // +3% XP reward per wave

// ─── Wave composition ─────────────────────────────────────────────────────────
export const CFG_WAVE_BASE_COUNT     = 6;    // enemies per type at wave 1
export const CFG_WAVE_COUNT_PER_WAVE = 0.5;  // additional enemies per wave per type
export const CFG_ELITE_START_WAVE    = 20;   // first wave with elite units
export const CFG_ELITE_BASE_MULT     = 2;    // elite multiplier at start wave
export const CFG_ELITE_MAX_MULT      = 10;   // elite multiplier cap
export const CFG_ELITE_SCALE_WAVES   = 30;   // waves to go from base to max mult

// ─── Tower movement ──────────────────────────────────────────────────────────
export const CFG_MOVE_COST_MULT      = 0.5;  // move cost = placedCost × this

// ─── Synergy ───────────────────────────────────────────────────────────────
export const CFG_SYNERGY_DAMAGE_BONUS = 0.15; // +15% damage when 2 towers share a cell

// ─── Golem special abilities ──────────────────────────────────────────────────
export const CFG_FIRE_GOLEM_REGEN_PER_HIT  = 0.003; // 0.3% of maxHP healed per damage event
export const CFG_WATER_GOLEM_PUDDLE_REGEN = 0.0001; // HP%/s healed while inside puddle
export const CFG_EARTH_GOLEM_SHIELD_RADIUS = 80;    // px radius for damage absorption
export const CFG_WIND_GOLEM_PUSH_IMMUNE    = true;  // immune to wind push

// ─── Magic / special effects ──────────────────────────────────────────────────
export const CFG_WIND_PUSH_CELLS    = 3;    // tiles pushed back by wind magic
export const CFG_EARTH_AOE_RADIUS   = 80;   // px radius for earth magic AoE
export const CFG_BURN_PCT_PER_SEC   = 1.0;  // % of max HP per second for fire burn
export const CFG_BURN_DURATION      = 5.0;  // seconds burn lasts
export const CFG_PUDDLE_RADIUS      = 40;   // px radius of water puddle
export const CFG_PUDDLE_DURATION    = 8;    // seconds puddle lasts
export const CFG_PUDDLE_SLOW_AMOUNT = 0.05; // fraction of speed reduction in puddle
export const CFG_WATER_PUDDLE_CHANCE = 0.25; // chance to spawn puddle on water magic hit (with talent)
export const CFG_PERM_SLOW_PER_STACK = 0.05; // speed reduction per permanent slow stack
export const CFG_MAX_PERM_SLOW_STACKS = 19;  // cap on permanent slow stacks

// ─── Map growth ───────────────────────────────────────────────────────────────
export const CFG_MAP_TIERS = [
  { cols: 22, rows: 14, minSegH: 3, maxSegH: 5, maxSegV: 4 },  // tier 0: waves 1-9
  { cols: 26, rows: 16, minSegH: 3, maxSegH: 6, maxSegV: 5 },  // tier 1: waves 10-19
  { cols: 30, rows: 18, minSegH: 3, maxSegH: 7, maxSegV: 6 },  // tier 2: waves 20-29
  { cols: 34, rows: 20, minSegH: 3, maxSegH: 8, maxSegV: 6 },  // tier 3: waves 30+
] as const;
