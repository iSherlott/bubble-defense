import type { ElementType } from '../types';

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
