import type { ArchetypeDef } from '../types';

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
