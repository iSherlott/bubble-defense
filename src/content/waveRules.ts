// ─── Default Wave Rules ──────────────────────────────────────────────────────
// Previously hardcoded inside WaveManager. Now data that can be swapped/extended.

import type { WaveRules } from '../types/wave';

export const DEFAULT_WAVE_RULES: WaveRules = {
  spawnPool: [
    { typeId: 'goblin',      fromWave: 1 },
    { typeId: 'troll',       fromWave: 3 },
    { typeId: 'harpy',       fromWave: 5 },
    { typeId: 'golem_fire',  fromWave: 8 },
    { typeId: 'golem_water', fromWave: 8 },
    { typeId: 'golem_earth', fromWave: 8 },
    { typeId: 'golem_wind',  fromWave: 8 },
    { typeId: 'golem',       fromWave: 12 },
    { typeId: 'dragon',      fromWave: 15 },
  ],
  typeCountBrackets: [
    { minWave: 1,  maxTypes: 1 },
    { minWave: 10, maxTypes: 2 },
    { minWave: 20, maxTypes: 3 },
    { minWave: 30, maxTypes: 4 },
    { minWave: 40, maxTypes: 5 },
  ],
  bossEveryN: 10,
};
