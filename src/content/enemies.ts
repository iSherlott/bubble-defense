import type { EnemyDef } from '../types';

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
