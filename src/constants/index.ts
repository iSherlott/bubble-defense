import { GameConfig } from '../config';
const C = GameConfig.get();

// ─── Layout ───────────────────────────────────────────────────────────────────
export const CELL_SIZE  = C.map.cellSize;
export const SIDEBAR_W  = C.map.sidebarW;
export const WAVE_BAR_H = C.map.waveBarH;

// ─── Map Tiers ────────────────────────────────────────────────────────────────
export interface MapTierDef {
  cols: number; rows: number;
  minSegH: number; maxSegH: number;
  maxSegV: number;
}
export const MAP_TIERS: MapTierDef[] = C.map.tiers.map(t => ({ ...t }));
export const MAP_TIER_AT = (wave: number) => Math.min(Math.floor(wave / 10), MAP_TIERS.length - 1);

// ─── Economy ──────────────────────────────────────────────────────────────────
export const BASE_LIVES            = C.economy.baseLives;
export const INITIAL_GOLD          = C.economy.initialGold;
export const BASE_TOWER_COST       = C.economy.baseTowerCost;
export const UPGRADE_MULT_STEP     = C.tower.upgradeMultStep;
export const MAX_TOWER_LEVEL       = C.tower.maxLevel;
export const MAP_EXPAND_COST       = C.map.expandCost;
export const DUAL_MAGIC_BASE_CHANCE = C.tower.dualMagicBaseChance;
export const DUAL_MAGIC_LUCK_BONUS  = C.tower.dualMagicLuckBonus;

// ─── Leveling ─────────────────────────────────────────────────────────────────
export const XP_TABLE: number[] = Array.from({ length: C.player.maxLevel }, (_, i) =>
  Math.floor(5 + i * 9 + Math.pow(i, 1.85))
);
export const MAX_LEVEL          = C.player.maxLevel;
export const TALENT_POINT_EVERY = C.player.talentPointEvery;
export const MIN_STAT_VALUE     = C.player.minStatValue;
export const STARTING_STAT_TOTAL = C.player.startingStatTotal;

// ─── Stat Labels ──────────────────────────────────────────────────────────────
export const STAT_LABELS: Record<string, string> = {
  strength:'Força', intelligence:'Inteligência', dexterity:'Destreza',
  agility:'Agilidade', luck:'Sorte', vitality:'Vitalidade',
};
export const STAT_DESCRIPTIONS: Record<string, string> = {
  strength:     '+5% dano físico das torres',
  intelligence: '+10% dano das magias',
  dexterity:    'Precisão vs agilidade inimiga',
  agility:      '+5% velocidade de ataque',
  luck:         'Crítico = 1 + Sorte×0.1; +chance dual magia',
  vitality:     '+0.25 vida recuperada por wave (inteiro)',
};
export const STAT_ICONS: Record<string, string> = {
  strength:'⚔', intelligence:'🔮', dexterity:'🎯',
  agility:'⚡', luck:'🍀', vitality:'❤',
};

// ─── Wave Definitions ─────────────────────────────────────────────────────────
export const WAVE_DEFS = [
  [{ typeId:'goblin',  count:6  }],
  [{ typeId:'goblin',  count:8  }, { typeId:'troll',  count:2 }],
  [{ typeId:'harpy',   count:6  }, { typeId:'goblin', count:4 }],
  [{ typeId:'troll',   count:4  }, { typeId:'harpy',  count:4 }],
  [{ typeId:'goblin',  count:12 }, { typeId:'golem',  count:1 }],
  [{ typeId:'golem',   count:3  }, { typeId:'harpy',  count:6 }],
  [{ typeId:'troll',   count:6  }, { typeId:'goblin', count:8 }],
  [{ typeId:'golem',   count:4  }, { typeId:'harpy',  count:8 }],
  [{ typeId:'dragon',  count:1  }, { typeId:'golem',  count:3 }],
];

// ─── Content re-exports (backwards compatibility) ─────────────────────────────
export { ELEMENT_COLORS, ELEMENT_ICONS, ELEMENT_NAMES, ELEMENT_DESCRIPTIONS, OPPOSITE_ELEMENT } from '../content/elements';
export { TOWER_DEFS } from '../content/towers';
export { ENEMY_DEFS, GOLEM_DEFS, BOSS_DEFS } from '../content/enemies';
export { FUSION_DEFS, getFusionDef } from '../content/fusions';
export { ITEM_DEFS, ITEM_RARITY_COLORS, ITEM_RARITY_NAMES } from '../content/items';
export { ARCHETYPE_DEFS } from '../content/archetypes';
export { TALENT_DEFS } from '../content/talents';
