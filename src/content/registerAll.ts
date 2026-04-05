// ═══════════════════════════════════════════════════════════════════════════════
//  Content Registration — wires all definitions into registries with behaviors
//  Called once at startup to populate towerRegistry, enemyRegistry,
//  fusionRegistry, and itemRegistry.
// ═══════════════════════════════════════════════════════════════════════════════

import { TOWER_DEFS } from './towers';
import { ENEMY_DEFS, GOLEM_DEFS, BOSS_DEFS } from './enemies';
import { FUSION_DEFS } from './fusions';
import { ITEM_DEFS } from './items';
import {
  towerRegistry, enemyRegistry, fusionRegistry, itemRegistry,
} from '../registries';

// ── Magic Behaviors ──
import {
  FireMagicBehavior, WaterMagicBehavior,
  EarthMagicBehavior, WindMagicBehavior,
} from '../behaviors/MagicBehaviors';

// ── Fusion Behaviors ──
import {
  AoeFusionBehavior, InfernoFusionBehavior,
  StunFusionBehavior, SlowPuddleFusionBehavior,
  BlizzardFusionBehavior, LightningFusionBehavior,
  TsunamiFusionBehavior, SolarCoreFusionBehavior,
  AbyssalVortexFusionBehavior, PrimalQuakeFusionBehavior,
  EternalHurricaneFusionBehavior, DefaultFusionBehavior,
} from '../behaviors/FusionBehaviors';

// ── Enemy Behaviors ──
import {
  SummonAddsBehavior, FireTrailBehavior, ShieldPhaseBehavior,
} from '../behaviors/EnemyBehaviors';

// ── Item Effects ──
import {
  emberSentryEffect, tideDropEffect, runicPebbleEffect,
  windFeatherEffect, scoutBuckleEffect,
  volcanicHourglassEffect, deepTideMedalEffect,
  seismicTotemEffect, galeInsigniaEffect, golemHunterEffect,
  magmaHeartEffect, blizzardCrownEffect, sandstormEyeEffect,
  hurricaneHornEffect, titanSealEffect,
  goblinThroneEffect, chaosWingEffect, shadowCoreEffect,
  fourTidesCrownEffect, cataclysmRelicEffect,
} from '../behaviors/ItemEffects';

import type { FusionBehavior } from '../behaviors/types';
import { registerEnemyRenderProfiles } from './enemyRenderProfiles';
import { registerAnimations } from './animations';
import { registerEnemyBehavior, getEnemyBehavior } from '../registries/EnemyBehaviorRegistry';
import { registerMagicBehavior, getMagicBehavior } from '../registries/MagicBehaviorRegistry';
import { DEFAULT_WAVE_RULES } from './waveRules';

// ─── Magic behavior instances ──────────────────────────────────────────────
// Register all magic behaviors so they can be looked up by ID.
// To add a new magic behavior: create the class, register it here with a unique ID.
registerMagicBehavior('fire',  new FireMagicBehavior());
registerMagicBehavior('water', new WaterMagicBehavior());
registerMagicBehavior('earth', new EarthMagicBehavior());
registerMagicBehavior('wind',  new WindMagicBehavior());

// ─── Fusion behavior map ───────────────────────────────────────────────────────
const fusionBehaviors: Record<string, FusionBehavior> = {
  magma_pool:         new AoeFusionBehavior(true),
  fireball_aoe:       new AoeFusionBehavior(true),
  sandstorm:          new AoeFusionBehavior(false),
  tornado:            new AoeFusionBehavior(false),
  inferno:            new InfernoFusionBehavior(),
  steam:              new StunFusionBehavior(3, 1.5),
  geyser:             new StunFusionBehavior(3, 1.5),
  swamp:              new SlowPuddleFusionBehavior(2),
  mud:                new SlowPuddleFusionBehavior(2),
  blizzard:           new BlizzardFusionBehavior(),
  lightning:          new LightningFusionBehavior(5),
  tsunami:            new TsunamiFusionBehavior(),
  solar_core:         new SolarCoreFusionBehavior(),
  abyssal_vortex:     new AbyssalVortexFusionBehavior(),
  primal_quake:       new PrimalQuakeFusionBehavior(),
  eternal_hurricane:  new EternalHurricaneFusionBehavior(),
};
const defaultFusionBehavior = new DefaultFusionBehavior();

// ─── Item effects map ──────────────────────────────────────────────────────────
const itemEffects: Record<string, import('../behaviors/types').ItemEffect> = {
  ember_sentry:       emberSentryEffect,
  tide_drop:          tideDropEffect,
  runic_pebble:       runicPebbleEffect,
  wind_feather:       windFeatherEffect,
  scout_buckle:       scoutBuckleEffect,
  volcanic_hourglass: volcanicHourglassEffect,
  deep_tide_medal:    deepTideMedalEffect,
  seismic_totem:      seismicTotemEffect,
  gale_insignia:      galeInsigniaEffect,
  golem_hunter:       golemHunterEffect,
  magma_heart:        magmaHeartEffect,
  blizzard_crown:     blizzardCrownEffect,
  sandstorm_eye:      sandstormEyeEffect,
  hurricane_horn:     hurricaneHornEffect,
  titan_seal:         titanSealEffect,
  goblin_throne:      goblinThroneEffect,
  chaos_wing:         chaosWingEffect,
  shadow_core:        shadowCoreEffect,
  four_tides_crown:   fourTidesCrownEffect,
  cataclysm_relic:    cataclysmRelicEffect,
};

// ─── Enemy behavior instances ──────────────────────────────────────────────
// Register all behaviors in the behavior registry so they can be looked up by ID.
// To add a new behavior: create the class, instantiate it here, call registerEnemyBehavior().
registerEnemyBehavior(new SummonAddsBehavior());
registerEnemyBehavior(new FireTrailBehavior());
registerEnemyBehavior(new ShieldPhaseBehavior());

// ═══════════════════════════════════════════════════════════════════════════════

/** Resolve behavior IDs for an EnemyDef (supports both behaviorIds and legacy bossAbility). */
function resolveBehaviorIds(def: import('../types').EnemyDef): string[] {
  if (def.behaviorIds && def.behaviorIds.length > 0) return def.behaviorIds;
  // Legacy fallback: bossAbility → single-item array
  if (def.bossAbility) return [def.bossAbility];
  return [];
}

/** Look up EnemyBehavior instances from the behavior registry by IDs. Warns on missing. */
function resolveBehaviors(def: import('../types').EnemyDef): import('../behaviors/types').EnemyBehavior[] {
  const ids = resolveBehaviorIds(def);
  const result: import('../behaviors/types').EnemyBehavior[] = [];
  for (const id of ids) {
    const b = getEnemyBehavior(id);
    if (b) { result.push(b); }
    else { console.warn(`[registerAll] Enemy '${def.id}' references unknown behavior '${id}'`); }
  }
  return result;
}

let _registered = false;

export function registerAllContent(): void {
  if (_registered) return;
  _registered = true;

  // ── Towers ──────────────────────────────────────────────────────────────────
  for (const def of TOWER_DEFS) {
    const behaviorId = def.magicBehaviorId ?? def.element;
    const magicBehavior = getMagicBehavior(behaviorId);
    if (!magicBehavior) {
      console.warn(`[registerAll] Tower '${def.id}' references unknown magic behavior '${behaviorId}'`);
    }
    towerRegistry.register({
      def,
      magicBehavior: magicBehavior ?? getMagicBehavior('fire')!,
    });
  }

  // ── Enemies (all types — standard, golems, bosses) ─────────────────────────
  const allEnemyDefs = [...ENEMY_DEFS, ...GOLEM_DEFS, ...BOSS_DEFS];
  for (const def of allEnemyDefs) {
    enemyRegistry.register({ def, behaviors: resolveBehaviors(def) });
  }

  // ── Fusions ─────────────────────────────────────────────────────────────────
  for (const def of FUSION_DEFS) {
    fusionRegistry.register({
      def,
      behavior: fusionBehaviors[def.specialEffect] ?? defaultFusionBehavior,
    });
  }

  // ── Items ───────────────────────────────────────────────────────────────────
  for (const def of ITEM_DEFS) {
    const effect = itemEffects[def.id] ?? { id: def.id };
    itemRegistry.register(def, effect);
  }

  // ── Enemy Render Profiles ──────────────────────────────────────────────────
  registerEnemyRenderProfiles();

  // ── Animations ─────────────────────────────────────────────────────────────
  registerAnimations();

  // ── Startup Validation ─────────────────────────────────────────────────────
  for (const entry of DEFAULT_WAVE_RULES.spawnPool) {
    if (!enemyRegistry.has(entry.typeId)) {
      console.warn(`[registerAll] Wave rule references unknown enemy '${entry.typeId}'`);
    }
  }
  for (const def of FUSION_DEFS) {
    if (!towerRegistry.has(def.primaryElement)) {
      console.warn(`[registerAll] Fusion '${def.id}' references unknown primary tower '${def.primaryElement}'`);
    }
    if (!towerRegistry.has(def.secondaryElement)) {
      console.warn(`[registerAll] Fusion '${def.id}' references unknown secondary tower '${def.secondaryElement}'`);
    }
  }
}
