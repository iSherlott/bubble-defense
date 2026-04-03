import type { TowerDef, EnemyDef, ElementType, Talent, FusionDef, ItemDef, ArchetypeDef } from '../types';
import {
  CFG_CELL_SIZE, CFG_SIDEBAR_W, CFG_WAVE_BAR_H,
  CFG_MAP_TIERS,
  CFG_BASE_LIVES, CFG_INITIAL_GOLD, CFG_BASE_TOWER_COST,
  CFG_UPGRADE_MULT_STEP, CFG_MAX_TOWER_LEVEL, CFG_MAP_EXPAND_COST,
  CFG_DUAL_MAGIC_BASE_CHANCE, CFG_DUAL_MAGIC_LUCK_BONUS,
  CFG_MAX_LEVEL, CFG_TALENT_POINT_EVERY,
  CFG_MIN_STAT_VALUE, CFG_STARTING_STAT_TOTAL,
} from '../settings';

// ─── Layout (from settings) ───────────────────────────────────────────────────
export const CELL_SIZE  = CFG_CELL_SIZE;
export const SIDEBAR_W  = CFG_SIDEBAR_W;
export const WAVE_BAR_H = CFG_WAVE_BAR_H;

// ─── Map Tiers (from settings) ────────────────────────────────────────────────
export interface MapTierDef {
  cols: number; rows: number;
  minSegH: number; maxSegH: number;
  maxSegV: number;
}
export const MAP_TIERS: MapTierDef[] = CFG_MAP_TIERS.map(t => ({ ...t }));
export const MAP_TIER_AT = (wave: number) => Math.min(Math.floor(wave / 10), MAP_TIERS.length - 1);

// ─── Economy (from settings) ──────────────────────────────────────────────────
export const BASE_LIVES            = CFG_BASE_LIVES;
export const INITIAL_GOLD          = CFG_INITIAL_GOLD;
export const BASE_TOWER_COST       = CFG_BASE_TOWER_COST;
export const UPGRADE_MULT_STEP     = CFG_UPGRADE_MULT_STEP;
export const MAX_TOWER_LEVEL       = CFG_MAX_TOWER_LEVEL;
export const MAP_EXPAND_COST       = CFG_MAP_EXPAND_COST;
export const DUAL_MAGIC_BASE_CHANCE = CFG_DUAL_MAGIC_BASE_CHANCE;
export const DUAL_MAGIC_LUCK_BONUS  = CFG_DUAL_MAGIC_LUCK_BONUS;

// ─── Leveling (from settings) ─────────────────────────────────────────────────
export const XP_TABLE: number[] = Array.from({ length: CFG_MAX_LEVEL }, (_, i) =>
  Math.floor(5 + i * 9 + Math.pow(i, 1.85))
);
export const MAX_LEVEL          = CFG_MAX_LEVEL;
export const TALENT_POINT_EVERY = CFG_TALENT_POINT_EVERY;
export const MIN_STAT_VALUE     = CFG_MIN_STAT_VALUE;
export const STARTING_STAT_TOTAL = CFG_STARTING_STAT_TOTAL;

// ─── Element data ─────────────────────────────────────────────────────────────
export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6633', water: '#3399ff', earth: '#77cc33', wind: '#ffee33',
};
export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥', water: '💧', earth: '🌍', wind: '💨',
};
export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: 'Fogo', water: 'Água', earth: 'Terra', wind: 'Vento',
};
export const ELEMENT_DESCRIPTIONS: Record<ElementType, string> = {
  fire:  'Torres de Fogo causam 2× dano. Especialista em ataques diretos e queimaduras.',
  water: 'Torres de Água causam 2× dano. Especialista em lentidão permanente.',
  earth: 'Torres de Terra causam 2× dano. Especialista em explosões em área.',
  wind:  'Torres de Vento causam 2× dano. Especialista em empurrar e controlar inimigos.',
};
export const OPPOSITE_ELEMENT: Record<ElementType, ElementType> = {
  fire: 'water', water: 'fire', earth: 'wind', wind: 'earth',
};

// ─── Tower Definitions ────────────────────────────────────────────────────────
export const TOWER_DEFS: TowerDef[] = [
  {
    id: 'fire', name: 'Torre de Fogo', element: 'fire',
    baseDamage: 30, baseRange: 140, baseFireRate: 1.0, baseCost: BASE_TOWER_COST,
    color: '#aa3300', accentColor: '#ff8844',
    magicBarMax: 100, magicBarGain: 15, magicBaseDamage: 55,
    description: 'Ataque normal. Magia: 3 bolas (1º, meio, último do range).',
  },
  {
    id: 'water', name: 'Torre de Água', element: 'water',
    baseDamage: 22, baseRange: 130, baseFireRate: 0.5, baseCost: BASE_TOWER_COST,
    color: '#003388', accentColor: '#66aaff',
    magicBarMax: 100, magicBarGain: 10, magicBaseDamage: 35,
    description: 'Ataca devagar. Magia: -5% vel. permanente por acerto.',
  },
  {
    id: 'earth', name: 'Torre de Terra', element: 'earth',
    baseDamage: 42, baseRange: 110, baseFireRate: 1.0, baseCost: BASE_TOWER_COST,
    color: '#3a2800', accentColor: '#99cc44',
    magicBarMax: 100, magicBarGain: 12, magicBaseDamage: 80,
    description: 'Ataque normal. Magia: dano em área (80px de raio).',
  },
  {
    id: 'wind', name: 'Torre de Vento', element: 'wind',
    baseDamage: 28, baseRange: 155, baseFireRate: 0.5, baseCost: BASE_TOWER_COST,
    color: '#223333', accentColor: '#ccee44',
    magicBarMax: 100, magicBarGain: 10, magicBaseDamage: 25,
    description: 'Ataca devagar. Magia: empurra inimigo 3 tiles para trás.',
  },
];

// ─── Enemy Definitions ────────────────────────────────────────────────────────
export const ENEMY_DEFS: EnemyDef[] = [
  {
    id: 'goblin', name: 'Goblin',
    baseHp: 80, speed: 80, agility: 4,
    immune: 'earth', halfElements: ['fire', 'wind'],
    color: '#33cc33', size: 12, baseLivesLost: 1, reward: 10, xp: 3,
    description: 'Pequeno e ágil. Imune a Terra, fraco à Água.',
  },
  {
    id: 'troll', name: 'Troll',
    baseHp: 200, speed: 50, agility: 3,
    immune: 'water', halfElements: ['earth', 'fire'],
    color: '#887733', size: 18, baseLivesLost: 1, reward: 20, xp: 6,
    description: 'Lento e resistente. Imune à Água, fraco ao Vento.',
  },
  {
    id: 'harpy', name: 'Harpia',
    baseHp: 120, speed: 100, agility: 9,
    immune: 'wind', halfElements: ['water', 'fire'],
    color: '#cc55cc', size: 13, baseLivesLost: 1, reward: 15, xp: 4,
    description: 'Rápida e voadora. Imune ao Vento, fraca à Terra.',
  },
  {
    id: 'golem', name: 'Golem Sombrio',
    baseHp: 350, speed: 35, agility: 2,
    immune: 'fire', halfElements: ['earth', 'wind'],
    color: '#3344aa', size: 22, baseLivesLost: 2, reward: 30, xp: 10,
    description: 'Golem maciço. Imune ao Fogo, fraco à Água.',
  },
  {
    id: 'dragon', name: 'Dragão',
    baseHp: 500, speed: 60, agility: 7,
    immune: 'fire', halfElements: ['water', 'wind'],
    color: '#cc3300', size: 24, baseLivesLost: 3, reward: 50, xp: 20,
    description: 'Dragão poderoso. Imune ao Fogo, fraco à Terra.',
  },
];

// ─── Elemental Golem Variants ─────────────────────────────────────────────────
export const GOLEM_DEFS: EnemyDef[] = [
  {
    id: 'golem_fire', name: 'Golem de Fogo',
    baseHp: 300, speed: 35, agility: 2,
    immune: 'water', halfElements: ['wind', 'earth'],
    color: '#cc4400', size: 20, baseLivesLost: 2, reward: 35, xp: 12,
    description: 'Imune a qualquer dano com componente de Fogo.',
    golemType: 'fire',
  },
  {
    id: 'golem_water', name: 'Golem de Água',
    baseHp: 300, speed: 35, agility: 2,
    immune: 'fire', halfElements: ['earth', 'wind'],
    color: '#0055cc', size: 20, baseLivesLost: 2, reward: 35, xp: 12,
    description: 'Se curar em poças: +0.01% HP máx/s dentro da poça.',
    golemType: 'water',
  },
  {
    id: 'golem_earth', name: 'Golem de Terra',
    baseHp: 400, speed: 30, agility: 1,
    immune: 'wind', halfElements: ['fire', 'water'],
    color: '#665500', size: 22, baseLivesLost: 3, reward: 40, xp: 14,
    description: 'Absorve dano das unidades próximas (raio 80px).',
    golemType: 'earth',
  },
  {
    id: 'golem_wind', name: 'Golem de Vento',
    baseHp: 280, speed: 45, agility: 3,
    immune: 'earth', halfElements: ['fire', 'water'],
    color: '#44aa77', size: 19, baseLivesLost: 2, reward: 35, xp: 12,
    description: 'Imune ao empurrão do Vento.',
    golemType: 'wind',
  },
];

export const BOSS_DEFS: EnemyDef[] = [
  {
    id: 'boss_goblin_king', name: 'Rei Goblin',
    baseHp: 1200, speed: 70, agility: 12,
    immune: 'earth', halfElements: ['fire', 'wind'],
    color: '#228822', size: 34, baseLivesLost: 5, reward: 150, xp: 50,
    description: 'Invoca goblins a cada 25% de HP perdido.', isBoss: true,
    bossAbility: 'summon_adds',
  },
  {
    id: 'boss_chaos_dragon', name: 'Dragão Caótico',
    baseHp: 2000, speed: 50, agility: 8,
    immune: 'fire', halfElements: ['wind', 'earth'],
    color: '#cc2200', size: 42, baseLivesLost: 5, reward: 250, xp: 80,
    description: 'Deixa rastro de fogo que queima torres próximas.', isBoss: true,
    bossAbility: 'fire_trail',
  },
  {
    id: 'boss_shadow_titan', name: 'Titã das Sombras',
    baseHp: 3000, speed: 35, agility: 5,
    immune: 'water', halfElements: ['earth', 'fire'],
    color: '#330055', size: 50, baseLivesLost: 5, reward: 400, xp: 120,
    description: 'Fica imune por 3s ao chegar a 50% HP.', isBoss: true,
    bossAbility: 'shield_phase',
  },
];

// ─── Talent Definitions ───────────────────────────────────────────────────────
export const TALENT_DEFS: Talent[] = [
  { id:'fire_t1',  name:'Chamas Intensas',     element:'fire',  branch:0, tier:0, requiredLevel:10,
    description:'+20% dano das torres de Fogo.',
    effectType:'damage', effectValue:0.20, purchased:false, cost:1 },
  { id:'fire_t2',  name:'Velocidade Ígnea',    element:'fire',  branch:0, tier:1, requiredLevel:20,
    description:'+10% vel. de ataque das torres de Fogo.',
    effectType:'speed', effectValue:0.10, purchased:false, cost:1 },
  { id:'fire_t3',  name:'Queimadura Arcana',   element:'fire',  branch:0, tier:2, requiredLevel:30,
    description:'Magia de Fogo aplica queimadura: 1% HP/s por 5s.',
    effectType:'specialEffect', effectValue:1, purchased:false, cost:1 },
  { id:'fire_t4',  name:'Forno Infernal',      element:'fire',  branch:0, tier:3, requiredLevel:40,
    description:'Torres de Fogo carregam magia 25% mais rápido.',
    effectType:'magicSpeed', effectValue:0.25, purchased:false, cost:1 },

  { id:'water_t1', name:'Maré Profunda',       element:'water', branch:1, tier:0, requiredLevel:10,
    description:'+20% dano das torres de Água.',
    effectType:'damage', effectValue:0.20, purchased:false, cost:1 },
  { id:'water_t2', name:'Corrente Veloz',      element:'water', branch:1, tier:1, requiredLevel:20,
    description:'+10% vel. de ataque das torres de Água.',
    effectType:'speed', effectValue:0.10, purchased:false, cost:1 },
  { id:'water_t3', name:'Poça Elemental',      element:'water', branch:1, tier:2, requiredLevel:30,
    description:'Magia de Água tem 25% de chance de criar poça (lentidão 5% por 5s).',
    effectType:'specialEffect', effectValue:0.25, purchased:false, cost:1 },
  { id:'water_t4', name:'Tempestade Gelada',   element:'water', branch:1, tier:3, requiredLevel:40,
    description:'Torres de Água carregam magia 25% mais rápido.',
    effectType:'magicSpeed', effectValue:0.25, purchased:false, cost:1 },

  { id:'earth_t1', name:'Punho de Pedra',      element:'earth', branch:2, tier:0, requiredLevel:10,
    description:'+20% dano das torres de Terra.',
    effectType:'damage', effectValue:0.20, purchased:false, cost:1 },
  { id:'earth_t2', name:'Velocidade Sísmica',  element:'earth', branch:2, tier:1, requiredLevel:20,
    description:'+10% vel. de ataque das torres de Terra.',
    effectType:'speed', effectValue:0.10, purchased:false, cost:1 },
  { id:'earth_t3', name:'Terremoto Amplo',     element:'earth', branch:2, tier:2, requiredLevel:30,
    description:'Área da magia de Terra aumenta 50%.',
    effectType:'specialEffect', effectValue:1.5, purchased:false, cost:1 },
  { id:'earth_t4', name:'Fúria da Montanha',   element:'earth', branch:2, tier:3, requiredLevel:40,
    description:'Torres de Terra carregam magia 25% mais rápido.',
    effectType:'magicSpeed', effectValue:0.25, purchased:false, cost:1 },

  { id:'wind_t1',  name:'Rajada Cortante',     element:'wind',  branch:3, tier:0, requiredLevel:10,
    description:'+20% dano das torres de Vento.',
    effectType:'damage', effectValue:0.20, purchased:false, cost:1 },
  { id:'wind_t2',  name:'Ciclone Rápido',      element:'wind',  branch:3, tier:1, requiredLevel:20,
    description:'+10% vel. de ataque das torres de Vento.',
    effectType:'speed', effectValue:0.10, purchased:false, cost:1 },
  { id:'wind_t3',  name:'Vórtice Paralisante', element:'wind',  branch:3, tier:2, requiredLevel:30,
    description:'Após empurrão de 3 tiles, inimigo fica 1s parado.',
    effectType:'specialEffect', effectValue:1, purchased:false, cost:1 },
  { id:'wind_t4',  name:'Furacão Primordial',  element:'wind',  branch:3, tier:3, requiredLevel:40,
    description:'Torres de Vento carregam magia 25% mais rápido.',
    effectType:'magicSpeed', effectValue:0.25, purchased:false, cost:1 },
];

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

// ─── Archetype Definitions ─────────────────────────────────────────────────────
export const ARCHETYPE_DEFS: ArchetypeDef[] = [
  {
    id: 'mage', name: 'Mago', icon: '🧙', color: '#8855ff',
    description: 'Foco em magia. Torres carregam magia mais rápido e causam mais dano mágico.',
    baseStats: { strength: 5, intelligence: 14, dexterity: 7, agility: 6, luck: 6, vitality: 7 },
  },
  {
    id: 'gunner', name: 'Atirador', icon: '🎯', color: '#ff5544',
    description: 'Foco em ataque físico. Torres atacam mais rápido e com mais precisão.',
    baseStats: { strength: 12, intelligence: 5, dexterity: 10, agility: 10, luck: 5, vitality: 5 },
  },
  {
    id: 'economist', name: 'Econômico', icon: '💰', color: '#ffcc00',
    description: 'Mais ouro e chance de crítico. Aproveita a economia para dominar.',
    baseStats: { strength: 6, intelligence: 6, dexterity: 7, agility: 6, luck: 14, vitality: 6 },
  },
  {
    id: 'tank', name: 'Tanque', icon: '🛡', color: '#44aaff',
    description: 'Muita vitalidade e resistência. Recupera vida rapidamente entre ondas.',
    baseStats: { strength: 8, intelligence: 5, dexterity: 6, agility: 5, luck: 5, vitality: 16 },
  },
];

// ─── Fusion Definitions ───────────────────────────────────────────────────────
// Key format: "primary+secondary" → fusion result
// Primary element is the "key element" that determines the fusion's affinity.
export const FUSION_DEFS: FusionDef[] = [
  // Earth primary
  { id:'earth+fire',  name:'Magma',      primaryElement:'earth', secondaryElement:'fire',
    icon:'🌋', color:'#ff6600', description:'Lança magma derretido em área, queimando o chão.',
    magicDamageMult:1.8, specialEffect:'magma_pool' },
  { id:'earth+water', name:'Pântano',    primaryElement:'earth', secondaryElement:'water',
    icon:'🏞', color:'#556b2f', description:'Cria pântano que prende e envenena inimigos.',
    magicDamageMult:1.4, specialEffect:'swamp' },
  { id:'earth+wind',  name:'Tempestade de Areia', primaryElement:'earth', secondaryElement:'wind',
    icon:'🏜', color:'#daa520', description:'Reduz precisão dos inimigos e causa dano contínuo.',
    magicDamageMult:1.5, specialEffect:'sandstorm' },

  // Fire primary
  { id:'fire+earth',  name:'Bola de Fogo', primaryElement:'fire', secondaryElement:'earth',
    icon:'☄', color:'#ff4400', description:'Projétil explosivo com dano em área massivo.',
    magicDamageMult:2.0, specialEffect:'fireball_aoe' },
  { id:'fire+water',  name:'Vapor',       primaryElement:'fire', secondaryElement:'water',
    icon:'♨', color:'#ccaaff', description:'Vapor escaldante que cega e queima.',
    magicDamageMult:1.6, specialEffect:'steam' },
  { id:'fire+wind',   name:'Inferno',     primaryElement:'fire', secondaryElement:'wind',
    icon:'🔥', color:'#ff2200', description:'Fogo alimentado pelo vento, dano de queimadura triplicado.',
    magicDamageMult:1.5, specialEffect:'inferno' },

  // Water primary
  { id:'water+fire',  name:'Gêiser',      primaryElement:'water', secondaryElement:'fire',
    icon:'⛲', color:'#66ccff', description:'Erupção de água quente que atordoa.',
    magicDamageMult:1.7, specialEffect:'geyser' },
  { id:'water+earth', name:'Lama',        primaryElement:'water', secondaryElement:'earth',
    icon:'💩', color:'#8b7355', description:'Lama pesada que diminui muito a velocidade.',
    magicDamageMult:1.3, specialEffect:'mud' },
  { id:'water+wind',  name:'Nevasca',     primaryElement:'water', secondaryElement:'wind',
    icon:'❄', color:'#aaeeff', description:'Tempestade de gelo que congela em área.',
    magicDamageMult:1.6, specialEffect:'blizzard' },

  // Same-element fusions (double mastery)
  { id:'fire+fire',   name:'Núcleo Solar',      primaryElement:'fire',  secondaryElement:'fire',
    icon:'☀', color:'#ffcc00', description:'Domínio total do Fogo: dano mágico massivo em área e queimadura eterna.',
    magicDamageMult:2.5, specialEffect:'solar_core' },
  { id:'water+water', name:'Vórtice Abissal',   primaryElement:'water', secondaryElement:'water',
    icon:'🌀', color:'#00ccff', description:'Domínio total da Água: lentidão extrema e pulsos de gelo em área.',
    magicDamageMult:2.3, specialEffect:'abyssal_vortex' },
  { id:'earth+earth', name:'Terremoto Primordial', primaryElement:'earth', secondaryElement:'earth',
    icon:'🌋', color:'#aacc44', description:'Domínio total da Terra: tremor colossal que atinge toda a tela.',
    magicDamageMult:2.8, specialEffect:'primal_quake' },
  { id:'wind+wind',   name:'Furacão Eterno',    primaryElement:'wind',  secondaryElement:'wind',
    icon:'⚡', color:'#eeff44', description:'Domínio do Vento: empurra 3 tiles todos em 1.5× o alcance. Carga de magia 2× mais lenta.',
    magicDamageMult:2.2, magicBarMaxMult:2, specialEffect:'eternal_hurricane' },

  // Wind primary (cross-element)
  { id:'wind+fire',   name:'Relâmpago',   primaryElement:'wind', secondaryElement:'fire',
    icon:'⚡', color:'#ffff00', description:'Raio devastador que atinge múltiplos alvos em cadeia.',
    magicDamageMult:2.2, specialEffect:'lightning' },
  { id:'wind+water',  name:'Tsunami',     primaryElement:'wind', secondaryElement:'water',
    icon:'🌊', color:'#0077cc', description:'Onda massiva que empurra todos os inimigos.',
    magicDamageMult:1.5, specialEffect:'tsunami' },
  { id:'wind+earth',  name:'Tornado',     primaryElement:'wind', secondaryElement:'earth',
    icon:'🌪', color:'#88cc44', description:'Tornado com detritos que causa dano contínuo em área.',
    magicDamageMult:1.8, specialEffect:'tornado' },
];

export function getFusionDef(primaryElement: string, secondaryElement: string): FusionDef | undefined {
  return FUSION_DEFS.find(f => f.id === `${primaryElement}+${secondaryElement}`);
}

// ─── Item Definitions ─────────────────────────────────────────────────────────
export const ITEM_DEFS: ItemDef[] = [
  // ── Comum ───────────────────────────────────────────────────────────────────
  { id:'ember_sentry',    name:'Brasa do Vigia',          icon:'🔥', rarity:'common',
    description:'Torres de Fogo causam +8% de dano.',
    effectType:'fire_dmg', effectValue:0.08 },
  { id:'tide_drop',       name:'Gota de Maré',            icon:'💧', rarity:'common',
    description:'Torres de Água atacam +10% mais rápido.',
    effectType:'water_atkspd', effectValue:0.10 },
  { id:'runic_pebble',    name:'Seixo Rúnico',            icon:'💎', rarity:'common',
    description:'Torres de Terra têm +12% de alcance.',
    effectType:'earth_range', effectValue:0.12 },
  { id:'wind_feather',    name:'Pena de Corrente',        icon:'🌿', rarity:'common',
    description:'Efeitos de controle do Vento duram +15%.',
    effectType:'wind_stun_dur', effectValue:0.15 },
  { id:'scout_buckle',    name:'Fivela do Batedor',       icon:'🥇', rarity:'common',
    description:'+1 ouro por inimigo derrotado.',
    effectType:'gold_mult', effectValue:1 },

  // ── Rara ────────────────────────────────────────────────────────────────────
  { id:'volcanic_hourglass', name:'Ampulheta Vulcânica',  icon:'⌛', rarity:'rare',
    description:'Torres de Fogo carregam magia +20% mais rápido.',
    effectType:'fire_magic_charge', effectValue:0.20 },
  { id:'deep_tide_medal',    name:'Medalhão da Maré Profunda', icon:'🌊', rarity:'rare',
    description:'Lentidões permanentes de Água são +25% mais fortes.',
    effectType:'water_slow_amp', effectValue:0.25 },
  { id:'seismic_totem',      name:'Totem da Falha Sísmica',icon:'🗿', rarity:'rare',
    description:'Raio de magia e explosões de Terra aumentam +20%.',
    effectType:'earth_radius', effectValue:0.20 },
  { id:'gale_insignia',      name:'Insígnia do Vendaval',  icon:'🌀', rarity:'rare',
    description:'Empurrão do Vento empurra +1 tile adicional.',
    effectType:'wind_push_tiles', effectValue:1 },
  { id:'golem_hunter',       name:'Lanterna do Caçador',   icon:'🔦', rarity:'rare',
    description:'+18% de dano contra elites, golems e chefes.',
    effectType:'hunter_dmg', effectValue:0.18 },

  // ── Épica ───────────────────────────────────────────────────────────────────
  { id:'magma_heart',     name:'Coração de Magma',         icon:'🌋', rarity:'epic',
    description:'Magia de Fogo deixa zona incandescente por 4s (20% dano mágico/s).',
    effectType:'fire_magma_trail', effectValue:0.20 },
  { id:'blizzard_crown',  name:'Coroa da Nevasca',         icon:'❄', rarity:'epic',
    description:'Magia de Água tem 20% de chance de congelar o inimigo por 1.2s.',
    effectType:'water_freeze', effectValue:0.20 },
  { id:'sandstorm_eye',   name:'Olho da Tempestade de Areia', icon:'🏜', rarity:'epic',
    description:'Magia de Terra reduz vel. 20% e precisão 15% por 5s.',
    effectType:'earth_sandstorm', effectValue:0.20 },
  { id:'hurricane_horn',  name:'Trombeta do Furacão',      icon:'🌪', rarity:'epic',
    description:'Magia de Vento atinge 3 inimigos alinhados com +30% de dano.',
    effectType:'wind_chain_magic', effectValue:0.30 },
  { id:'titan_seal',      name:'Selo do Titã Sombrio',     icon:'🛡', rarity:'epic',
    description:'A cada 3 ondas, cria um escudo que anula 1 vida perdida.',
    effectType:'titan_shield', effectValue:3 },

  // ── Lendária ────────────────────────────────────────────────────────────────
  { id:'goblin_throne',   name:'Trono do Rei Goblin',      icon:'👑', rarity:'legendary',
    description:'+40 ouro no início de cada onda; inimigos valem +2 ouro extra.',
    effectType:'wave_gold_bonus', effectValue:40 },
  { id:'chaos_wing',      name:'Asa do Dragão Caótico',    icon:'🐉', rarity:'legendary',
    description:'Ataques e magias de Fogo causam +25% de dano a inimigos adjacentes.',
    effectType:'fire_aoe_splash', effectValue:0.25 },
  { id:'shadow_core',     name:'Núcleo do Titã das Sombras', icon:'💜', rarity:'legendary',
    description:'+30% de dano contra chefes e inimigos com mais de 70% de HP.',
    effectType:'boss_dmg_bonus', effectValue:0.30 },
  { id:'four_tides_crown',name:'Coroa das Quatro Marés',   icon:'🌈', rarity:'legendary',
    description:'Todas as torres +12% dano, +12% vel. ataque, +15% carga de magia.',
    effectType:'all_towers_buff', effectValue:0.12 },
  { id:'cataclysm_relic', name:'Relicário do Cataclismo',  icon:'💥', rarity:'legendary',
    description:'A cada 20s, explosão global: 250% do dano mágico da torre mais forte a todos os inimigos.',
    effectType:'cataclysm', effectValue:2.50 },
];

export const ITEM_RARITY_COLORS: Record<string, string> = {
  common:    '#aaaaaa',
  rare:      '#5599ff',
  epic:      '#cc44ff',
  legendary: '#ffaa00',
};

export const ITEM_RARITY_NAMES: Record<string, string> = {
  common:    'Comum',
  rare:      'Rara',
  epic:      'Épica',
  legendary: 'Lendária',
};
