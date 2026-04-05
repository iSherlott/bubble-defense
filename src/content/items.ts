import type { ItemDef } from '../types';

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
