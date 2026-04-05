// ─── Default Wave Rules ──────────────────────────────────────────────────────
// Data-driven wave composition rules consumed by WaveManager.
// Archetype hints guide the composition of specific wave ranges toward
// recognisable tactical archetypes (swarm, wall, sustain, rupture, etc.)

import type { WaveRules } from '../types/wave';

export const DEFAULT_WAVE_RULES: WaveRules = {
  // ── Spawn Pool — defines when each enemy type first appears ───────────────
  // Ordered by fromWave. WaveManager picks types randomly within this pool.
  spawnPool: [
    // Early game (waves 1-10): core trinity
    { typeId: 'goblin',         fromWave: 1  },
    { typeId: 'troll',          fromWave: 3  },
    { typeId: 'harpy',          fromWave: 5  },

    // Mid-early (waves 11-20): formation enemies enter
    { typeId: 'rocky_shielder', fromWave: 11 },

    // Golems enter as wave anchors (mid-early / mid game)
    { typeId: 'golem_fire',     fromWave: 8  },
    { typeId: 'golem_water',    fromWave: 8  },
    { typeId: 'golem_earth',    fromWave: 8  },
    { typeId: 'golem_wind',     fromWave: 8  },

    // Mid game (waves 12-35): elite units and supports
    { typeId: 'golem',          fromWave: 12 },   // Shadow Golem (elite adaptive)
    { typeId: 'dragon',         fromWave: 15 },   // Dragon (elite trail)
    { typeId: 'tide_shaman',    fromWave: 22 },   // Heal support
    { typeId: 'storm_ranger',   fromWave: 22 },   // Speed support

    // Late-mid game (waves 36+): disablers come online (one at a time initially)
    { typeId: 'disabler_fire',  fromWave: 51 },
    { typeId: 'disabler_water', fromWave: 51 },
    { typeId: 'disabler_earth', fromWave: 51 },
    { typeId: 'disabler_wind',  fromWave: 51 },
  ],

  // ── Type-Count Brackets — max distinct types per wave ────────────────────
  typeCountBrackets: [
    { minWave: 1,  maxTypes: 1 },
    { minWave: 10, maxTypes: 2 },
    { minWave: 20, maxTypes: 3 },
    { minWave: 30, maxTypes: 4 },
    { minWave: 40, maxTypes: 5 },
    { minWave: 55, maxTypes: 6 },
    { minWave: 70, maxTypes: 7 },
  ],

  // ── Boss Every N Waves ────────────────────────────────────────────────────
  bossEveryN: 10,

  // ── Archetype Hints — preferred compositions per wave range ──────────────
  // Each hint defines the preferred enemy type IDs for a wave range.
  // WaveManager uses these to bias selection toward the listed types,
  // ensuring recognisable wave archetypes without eliminating randomness.
  archetypeHints: [
    // Waves 1-9: Swarm introduction — goblins and harpies first
    { fromWave: 1,  toWave: 4,  preferredTypeIds: ['goblin'],                       label: 'Enxame inicial' },
    { fromWave: 5,  toWave: 9,  preferredTypeIds: ['goblin', 'harpy'],               label: 'Enxame rápido' },

    // Waves 11-19: Wall + runner — rocky shielder anchors trolls
    { fromWave: 11, toWave: 15, preferredTypeIds: ['troll', 'rocky_shielder'],       label: 'Muralha inicial' },
    { fromWave: 16, toWave: 19, preferredTypeIds: ['goblin', 'harpy', 'rocky_shielder'], label: 'Ruptura inicial' },

    // Waves 21-30: Sustain wave identity appears
    { fromWave: 21, toWave: 25, preferredTypeIds: ['troll', 'tide_shaman'],          label: 'Sustain' },
    { fromWave: 26, toWave: 29, preferredTypeIds: ['goblin', 'harpy', 'storm_ranger'], label: 'Ruptura tempestuosa' },

    // Waves 31-40: Anchored formations — golems as true anchors
    { fromWave: 31, toWave: 35, preferredTypeIds: ['troll', 'golem_earth', 'rocky_shielder'],  label: 'Muralha elementar' },
    { fromWave: 36, toWave: 39, preferredTypeIds: ['goblin', 'golem_wind', 'storm_ranger'],    label: 'Ruptura elemental' },

    // Waves 41-50: Mixed elite compositions
    { fromWave: 41, toWave: 45, preferredTypeIds: ['dragon', 'golem', 'tide_shaman'],          label: 'Wave híbrida' },
    { fromWave: 46, toWave: 49, preferredTypeIds: ['golem', 'dragon', 'rocky_shielder'],       label: 'Elite pesado' },

    // Waves 51-65: Suppression era begins — disablers with support
    { fromWave: 51, toWave: 55, preferredTypeIds: ['disabler_fire', 'goblin'],                 label: 'Supressão de Fogo' },
    { fromWave: 56, toWave: 60, preferredTypeIds: ['disabler_water', 'troll'],                 label: 'Supressão de Água' },
    { fromWave: 61, toWave: 65, preferredTypeIds: ['disabler_earth', 'rocky_shielder'],        label: 'Supressão de Terra' },

    // Waves 66-85: Late game compositions
    { fromWave: 66, toWave: 70, preferredTypeIds: ['disabler_wind', 'harpy', 'storm_ranger'],  label: 'Supressão do Vento' },
    { fromWave: 71, toWave: 79, preferredTypeIds: ['golem', 'dragon', 'tide_shaman'],          label: 'Composição late' },
    { fromWave: 80, toWave: 85, preferredTypeIds: ['dragon', 'golem', 'golem_fire', 'tide_shaman'], label: 'Pressão final' },

    // Waves 86-100: Full late game — mixed hybrid waves
    { fromWave: 86, toWave: 100, preferredTypeIds: ['golem', 'dragon', 'disabler_fire', 'disabler_water'], label: 'Onda híbrida' },
  ],
};
