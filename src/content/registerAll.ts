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

import type { MagicBehavior } from '../behaviors/types';

// ─── Magic behavior map ────────────────────────────────────────────────────────
const magicBehaviors: Record<string, MagicBehavior> = {
  fire:  new FireMagicBehavior(),
  water: new WaterMagicBehavior(),
  earth: new EarthMagicBehavior(),
  wind:  new WindMagicBehavior(),
};

// ─── Fusion behavior map ───────────────────────────────────────────────────────
const fusionBehaviors: Record<string, InstanceType<any>> = {
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

// ─── Boss behavior instances ───────────────────────────────────────────────────
const bossBehaviors: Record<string, import('../behaviors/types').EnemyBehavior> = {
  summon_adds:  new SummonAddsBehavior(),
  fire_trail:   new FireTrailBehavior(),
  shield_phase: new ShieldPhaseBehavior(),
};

// ═══════════════════════════════════════════════════════════════════════════════

export function registerAllContent(): void {
  // ── Towers ──────────────────────────────────────────────────────────────────
  for (const def of TOWER_DEFS) {
    towerRegistry.register({
      def,
      magicBehavior: magicBehaviors[def.element] ?? magicBehaviors.fire,
    });
  }

  // ── Enemies (standard) ──────────────────────────────────────────────────────
  for (const def of ENEMY_DEFS) {
    enemyRegistry.register({ def, behaviors: [] });
  }

  // ── Golems ──────────────────────────────────────────────────────────────────
  for (const def of GOLEM_DEFS) {
    enemyRegistry.register({ def, behaviors: [] });
  }

  // ── Bosses ──────────────────────────────────────────────────────────────────
  for (const def of BOSS_DEFS) {
    const behaviors = def.bossAbility && bossBehaviors[def.bossAbility]
      ? [bossBehaviors[def.bossAbility]]
      : [];
    enemyRegistry.register({ def, behaviors });
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
}
