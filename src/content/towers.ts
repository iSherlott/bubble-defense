import type { TowerDef } from '../types';
import { GameConfig } from '../config';

const BASE_TOWER_COST = GameConfig.get().economy.baseTowerCost;

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
