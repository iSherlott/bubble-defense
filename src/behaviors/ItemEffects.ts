import type { ItemEffect } from './types';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType } from '../types';
import { CELL_SIZE } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
//  TOWER BUFF EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Brasa do Vigia: +8% fire tower damage per stack */
export const emberSentryEffect: ItemEffect = {
  id: 'ember_sentry',
  modifyDamage(element: ElementType, stacks: number) {
    return element === 'fire' ? 0.08 * stacks : 0;
  },
};

/** Gota de Maré: +10% water tower fire rate per stack */
export const tideDropEffect: ItemEffect = {
  id: 'tide_drop',
  modifySpeed(element: ElementType, stacks: number) {
    return element === 'water' ? 0.10 * stacks : 0;
  },
};

/** Seixo Rúnico: +12% earth tower range per stack */
export const runicPebbleEffect: ItemEffect = {
  id: 'runic_pebble',
  modifyRange(element: ElementType, stacks: number) {
    return element === 'earth' ? 0.12 * stacks : 0;
  },
};

/** Pena de Corrente: +15% wind stun duration per stack */
export const windFeatherEffect: ItemEffect = {
  id: 'wind_feather',
  modifyWindStun(stacks: number) {
    return 0.15 * stacks;
  },
};

/** Fivela do Batedor: +1 gold per kill per stack */
export const scoutBuckleEffect: ItemEffect = {
  id: 'scout_buckle',
  modifyGoldPerKill(stacks: number) {
    return 1 * stacks;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAGIC EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Ampulheta Vulcânica: +20% fire magic charge speed per stack */
export const volcanicHourglassEffect: ItemEffect = {
  id: 'volcanic_hourglass',
  modifyMagicCharge(element: ElementType, stacks: number) {
    return element === 'fire' ? 0.20 * stacks : 0;
  },
};

/** Medalhão da Maré Profunda: +25% slow strength per stack */
export const deepTideMedalEffect: ItemEffect = {
  id: 'deep_tide_medal',
  modifyWaterSlow(stacks: number) {
    return 0.25 * stacks;
  },
};

/** Totem da Falha Sísmica: +20% earth AoE radius per stack */
export const seismicTotemEffect: ItemEffect = {
  id: 'seismic_totem',
  modifyEarthRadius(stacks: number) {
    return 0.20 * stacks;
  },
};

/** Insígnia do Vendaval: +1 tile wind push per stack */
export const galeInsigniaEffect: ItemEffect = {
  id: 'gale_insignia',
  modifyWindPush(stacks: number) {
    return stacks * CELL_SIZE;
  },
};

/** Lanterna do Caçador: +18% damage vs elites/golems/bosses */
export const golemHunterEffect: ItemEffect = {
  id: 'golem_hunter',
  modifyHunterDmg(enemy: BaseEnemy, stacks: number) {
    const isTarget = enemy.isElite || enemy.def.isBoss || enemy.def.golemType != null;
    return isTarget ? 1 + 0.18 * stacks : 1;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EPIC EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Coração de Magma: fire magic leaves burn zone */
export const magmaHeartEffect: ItemEffect = {
  id: 'magma_heart',
  hasEffect(effectId: string) { return effectId === 'fire_magma_trail'; },
  getEffectValue(effectId: string, _stacks: number) {
    return effectId === 'fire_magma_trail' ? 0.20 : 0;
  },
};

/** Coroa da Nevasca: 20% freeze chance on water magic per stack */
export const blizzardCrownEffect: ItemEffect = {
  id: 'blizzard_crown',
  hasEffect(effectId: string) { return effectId === 'water_freeze'; },
  getEffectChance(_effectId: string, stacks: number) { return 0.20 * stacks; },
};

/** Olho da Tempestade de Areia: earth magic reduces speed/accuracy */
export const sandstormEyeEffect: ItemEffect = {
  id: 'sandstorm_eye',
  hasEffect(effectId: string) { return effectId === 'earth_sandstorm'; },
};

/** Trombeta do Furacão: wind magic hits 3 aligned, +30% damage */
export const hurricaneHornEffect: ItemEffect = {
  id: 'hurricane_horn',
  hasEffect(effectId: string) { return effectId === 'wind_chain_magic'; },
  getEffectValue(effectId: string, stacks: number) {
    if (effectId === 'wind_chain_dmg_mult') return 1 + 0.30 * stacks;
    return 0;
  },
};

/** Selo do Titã Sombrio: every 3 waves, 1 shield charge per stack */
export const titanSealEffect: ItemEffect = {
  id: 'titan_seal',
  // Shield logic is handled by RewardSystem on wave completion
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LEGENDARY EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Trono do Rei Goblin: +40g per stack at wave start, +2g per kill per stack */
export const goblinThroneEffect: ItemEffect = {
  id: 'goblin_throne',
  modifyGoldPerKill(stacks: number) { return 2 * stacks; },
  onWaveStart(ctx, stacks) {
    const bonus = 40 * stacks;
    ctx.gold += bonus;
    ctx.addFT({ x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 }, `👑 +${bonus}g`, '#ffdd44');
  },
};

/** Asa do Dragão Caótico: fire attacks splash 25% per stack to adjacent */
export const chaosWingEffect: ItemEffect = {
  id: 'chaos_wing',
  hasEffect(effectId: string) { return effectId === 'fire_aoe_splash'; },
  getEffectValue(effectId: string, stacks: number) {
    if (effectId === 'fire_aoe_splash_mult') return 0.25 * stacks;
    return 0;
  },
};

/** Núcleo do Titã das Sombras: +30% damage vs bosses / high-HP enemies */
export const shadowCoreEffect: ItemEffect = {
  id: 'shadow_core',
  modifyBossDmg(enemy: BaseEnemy, stacks: number) {
    const isTarget = enemy.def.isBoss || (enemy.hp / enemy.maxHp > 0.70);
    return isTarget ? 1 + 0.30 * stacks : 1;
  },
};

/** Coroa das Quatro Marés: +12% all damage, +12% speed, +15% magic charge */
export const fourTidesCrownEffect: ItemEffect = {
  id: 'four_tides_crown',
  modifyDamage(_element: ElementType, stacks: number) { return 0.12 * stacks; },
  modifySpeed(_element: ElementType, stacks: number) { return 0.12 * stacks; },
  modifyMagicCharge(_element: ElementType, stacks: number) { return 0.15 * stacks; },
};

/** Relicário do Cataclismo Elemental: every 20s, global 250% magic explosion */
export const cataclysmRelicEffect: ItemEffect = {
  id: 'cataclysm_relic',
  hasEffect(effectId: string) { return effectId === 'cataclysm'; },
  getEffectValue(effectId: string, stacks: number) {
    if (effectId === 'cataclysm_mult') return 2.50 * stacks;
    return 0;
  },
};
