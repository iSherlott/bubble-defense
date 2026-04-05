// ─── Default Wave Rules ──────────────────────────────────────────────────────
// Data-driven wave composition rules consumed by WaveManager.
// Archetype hints guide the composition of specific wave ranges toward
// recognisable tactical archetypes (swarm, wall, sustain, rupture, etc.)

import type { WaveRules } from '../types/wave';

export const DEFAULT_WAVE_RULES: WaveRules = {
  // ── Spawn Pool — defines when each enemy type first appears ───────────────
  // Staggered introductions so new threats appear consistently throughout.
  spawnPool: [
    // Early game: core trio
    { typeId: 'goblin',         fromWave: 1  },
    { typeId: 'troll',          fromWave: 3  },
    { typeId: 'harpy',          fromWave: 5  },

    // Early-mid: formation + anchors start
    { typeId: 'rocky_shielder', fromWave: 7  },
    { typeId: 'golem_fire',     fromWave: 9  },
    { typeId: 'golem_water',    fromWave: 11 },

    // Mid game: supports + elites + remaining anchors
    { typeId: 'tide_shaman',    fromWave: 13 },
    { typeId: 'golem_earth',    fromWave: 15 },
    { typeId: 'storm_ranger',   fromWave: 17 },
    { typeId: 'golem_wind',     fromWave: 19 },
    { typeId: 'golem',          fromWave: 20 },   // Shadow Golem (elite adaptive)
    { typeId: 'dragon',         fromWave: 25 },   // Dragon (elite trail)

    // Late-mid: disablers staggered (not all at once)
    { typeId: 'disabler_fire',  fromWave: 40 },
    { typeId: 'disabler_water', fromWave: 45 },
    { typeId: 'disabler_earth', fromWave: 50 },
    { typeId: 'disabler_wind',  fromWave: 55 },
  ],

  // ── Type-Count Brackets — max distinct types per wave ────────────────────
  // Earlier progression so variety shows up sooner.
  typeCountBrackets: [
    { minWave: 1,  maxTypes: 1 },
    { minWave: 4,  maxTypes: 2 },
    { minWave: 10, maxTypes: 3 },
    { minWave: 18, maxTypes: 4 },
    { minWave: 28, maxTypes: 5 },
    { minWave: 42, maxTypes: 6 },
    { minWave: 60, maxTypes: 7 },
  ],

  // ── Boss Every N Waves ────────────────────────────────────────────────────
  bossEveryN: 10,

  // ── Archetype Hints — shorter blocks, more variety, better enemy use ─────
  archetypeHints: [
    // Waves 1-3: Pure goblin introduction
    { fromWave: 1,  toWave: 3,  preferredTypeIds: ['goblin'],                                  label: 'Enxame inicial' },
    // Waves 4-5: Goblin + troll — first taste of mixed composition
    { fromWave: 4,  toWave: 5,  preferredTypeIds: ['goblin', 'troll'],                         label: 'Misto básico' },
    // Waves 6-7: Speed + evasion — first aerial threat
    { fromWave: 6,  toWave: 7,  preferredTypeIds: ['goblin', 'harpy'],                         label: 'Enxame rápido' },
    // Waves 8-9: Formation play — shielder enters with trolls
    { fromWave: 8,  toWave: 9,  preferredTypeIds: ['troll', 'rocky_shielder', 'goblin'],       label: 'Muralha inicial' },

    // Waves 11-12: Fire golem anchors aggressive push
    { fromWave: 11, toWave: 12, preferredTypeIds: ['goblin', 'golem_fire', 'harpy'],           label: 'Pressão ígnea' },
    // Waves 13-14: Sustain composition — shaman enters
    { fromWave: 13, toWave: 14, preferredTypeIds: ['troll', 'tide_shaman', 'rocky_shielder'],  label: 'Sustain inicial' },
    // Waves 15-16: Defensive anchor + tanks
    { fromWave: 15, toWave: 16, preferredTypeIds: ['troll', 'golem_earth', 'rocky_shielder'],  label: 'Muralha elementar' },
    // Waves 17-18: Evasion composition — storm ranger enters
    { fromWave: 17, toWave: 18, preferredTypeIds: ['harpy', 'storm_ranger', 'goblin'],         label: 'Evasão tática' },
    // Wave 19: Wind anchor + fast enemies
    { fromWave: 19, toWave: 19, preferredTypeIds: ['golem_wind', 'harpy', 'goblin'],           label: 'Rajada de vento' },

    // Waves 21-23: Shadow Golem elite enters — adaptive threat
    { fromWave: 21, toWave: 23, preferredTypeIds: ['golem', 'troll', 'tide_shaman'],           label: 'Elite adaptativo' },
    // Waves 24-25: Speed rush with anchor support
    { fromWave: 24, toWave: 25, preferredTypeIds: ['goblin', 'golem_wind', 'storm_ranger'],    label: 'Ruptura rápida' },
    // Waves 26-27: Dragon enters — territorial pressure
    { fromWave: 26, toWave: 27, preferredTypeIds: ['dragon', 'troll', 'rocky_shielder'],       label: 'Pressão do dragão' },
    // Waves 28-29: Healing + defense synergy
    { fromWave: 28, toWave: 29, preferredTypeIds: ['tide_shaman', 'golem_water', 'troll'],     label: 'Sustain profundo' },

    // Waves 31-33: Mixed elite wave
    { fromWave: 31, toWave: 33, preferredTypeIds: ['golem', 'dragon', 'golem_earth'],          label: 'Elite pesado' },
    // Waves 34-36: Evasion + sustain combo
    { fromWave: 34, toWave: 36, preferredTypeIds: ['harpy', 'storm_ranger', 'tide_shaman'],    label: 'Evasão sustentada' },
    // Waves 37-39: Full anchor formation
    { fromWave: 37, toWave: 39, preferredTypeIds: ['golem_fire', 'golem_earth', 'troll'],      label: 'Formação ancorada' },

    // Waves 41-43: Fire disabler enters — targeted suppression
    { fromWave: 41, toWave: 43, preferredTypeIds: ['disabler_fire', 'goblin', 'harpy'],        label: 'Supressão de Fogo' },
    // Waves 44-45: Mixed anchors + disabler
    { fromWave: 44, toWave: 45, preferredTypeIds: ['golem', 'dragon', 'golem_wind'],           label: 'Wave híbrida' },
    // Waves 46-48: Water disabler enters
    { fromWave: 46, toWave: 48, preferredTypeIds: ['disabler_water', 'troll', 'tide_shaman'],  label: 'Supressão de Água' },
    // Wave 49: Pre-boss pressure
    { fromWave: 49, toWave: 49, preferredTypeIds: ['dragon', 'golem', 'disabler_fire'],        label: 'Pressão pré-boss' },

    // Waves 51-53: Earth disabler + wall composition
    { fromWave: 51, toWave: 53, preferredTypeIds: ['disabler_earth', 'rocky_shielder', 'golem_earth'], label: 'Supressão de Terra' },
    // Waves 54-55: Evasion disrupt — storm + wind disabler prep
    { fromWave: 54, toWave: 55, preferredTypeIds: ['storm_ranger', 'harpy', 'golem_wind'],     label: 'Disrupção evasiva' },
    // Waves 56-58: Wind disabler enters
    { fromWave: 56, toWave: 58, preferredTypeIds: ['disabler_wind', 'harpy', 'storm_ranger'],  label: 'Supressão de Vento' },
    // Wave 59: Multi-disabler preview
    { fromWave: 59, toWave: 59, preferredTypeIds: ['disabler_fire', 'disabler_water', 'golem'], label: 'Supressão dupla' },

    // Waves 61-64: Late game mixed compositions — short rotations
    { fromWave: 61, toWave: 62, preferredTypeIds: ['dragon', 'golem', 'disabler_earth'],       label: 'Pressão territorial' },
    { fromWave: 63, toWave: 64, preferredTypeIds: ['golem_fire', 'disabler_fire', 'troll'],    label: 'Inferno tático' },
    // Waves 65-68: Full sustain + suppression
    { fromWave: 65, toWave: 66, preferredTypeIds: ['tide_shaman', 'golem_water', 'disabler_water'], label: 'Maré supressora' },
    { fromWave: 67, toWave: 68, preferredTypeIds: ['golem', 'storm_ranger', 'disabler_wind'],  label: 'Tempestade sombria' },
    // Wave 69: Pre-boss chaos
    { fromWave: 69, toWave: 69, preferredTypeIds: ['dragon', 'disabler_fire', 'disabler_wind'], label: 'Caos pré-boss' },

    // Waves 71-75: Late game — deeper compositions
    { fromWave: 71, toWave: 73, preferredTypeIds: ['golem', 'dragon', 'tide_shaman', 'disabler_earth'], label: 'Composição late' },
    { fromWave: 74, toWave: 75, preferredTypeIds: ['harpy', 'storm_ranger', 'disabler_wind', 'golem_wind'], label: 'Evasão extrema' },
    // Waves 76-79: Dual-threat waves
    { fromWave: 76, toWave: 77, preferredTypeIds: ['golem_fire', 'dragon', 'disabler_fire'],   label: 'Pressão final' },
    { fromWave: 78, toWave: 79, preferredTypeIds: ['golem_earth', 'golem_water', 'tide_shaman', 'rocky_shielder'], label: 'Fortaleza móvel' },

    // Waves 81-89: Endgame rotations — every wave block feels distinct
    { fromWave: 81, toWave: 82, preferredTypeIds: ['disabler_fire', 'disabler_water', 'dragon'], label: 'Supressão dupla' },
    { fromWave: 83, toWave: 84, preferredTypeIds: ['golem', 'golem_earth', 'disabler_earth', 'troll'], label: 'Muralha final' },
    { fromWave: 85, toWave: 86, preferredTypeIds: ['storm_ranger', 'harpy', 'disabler_wind', 'goblin'], label: 'Ruptura evasiva' },
    { fromWave: 87, toWave: 88, preferredTypeIds: ['dragon', 'golem_fire', 'tide_shaman', 'disabler_fire'], label: 'Inferno sustentado' },
    { fromWave: 89, toWave: 89, preferredTypeIds: ['golem', 'dragon', 'disabler_water', 'disabler_earth'], label: 'Caos pré-boss' },

    // Waves 91-99: Final stretch — maximum variety
    { fromWave: 91, toWave: 93, preferredTypeIds: ['dragon', 'golem', 'disabler_fire', 'disabler_wind'], label: 'Onda suprema' },
    { fromWave: 94, toWave: 96, preferredTypeIds: ['golem_earth', 'golem_water', 'disabler_earth', 'tide_shaman'], label: 'Defesa total' },
    { fromWave: 97, toWave: 99, preferredTypeIds: ['dragon', 'golem', 'disabler_fire', 'disabler_water', 'storm_ranger'], label: 'Onda final' },
  ],
};
