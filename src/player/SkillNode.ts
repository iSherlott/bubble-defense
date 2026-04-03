// ─── SkillNode — one node in the Path-of-Exile-style skill graph ──────────────
//
// Each node has:
//   • A position in a logical 1000×700 canvas space (scaled at render time)
//   • A list of prerequisite node IDs that must be purchased before this one
//   • A list of visual connection IDs (lines drawn between nodes; superset of requires)
//   • One or more effects that the game applies when the node is purchased
//
// The SkillTree class holds the graph and provides purchase / query logic.

import type { ElementType } from '../types';

export type SkillEffectType = 'damage' | 'speed' | 'specialEffect' | 'magicSpeed';

export interface SkillEffect {
  type: SkillEffectType;
  element: ElementType;
  value: number;
}

export interface SkillNodeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  element: ElementType | 'neutral';
  /** Position in logical 1000×700 space. Scaled to fit the screen at render time. */
  position: { x: number; y: number };
  effects: SkillEffect[];
  /** IDs of nodes that must be purchased before this one can be unlocked. */
  requires: string[];
  /** IDs of nodes to draw connection lines to. Defaults to `requires` if omitted. */
  connections?: string[];
  cost: number;
  requiredLevel: number;
}

export class SkillNode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly element: ElementType | 'neutral';
  readonly position: { x: number; y: number };
  readonly effects: SkillEffect[];
  /** Node IDs that must be purchased before this one */
  readonly requires: string[];
  /** Node IDs that are visually connected via drawn lines */
  readonly connections: string[];
  readonly cost: number;
  readonly requiredLevel: number;
  purchased = false;

  constructor(data: SkillNodeData) {
    this.id           = data.id;
    this.name         = data.name;
    this.description  = data.description;
    this.icon         = data.icon;
    this.element      = data.element;
    this.position     = { ...data.position };
    this.effects      = data.effects;
    this.requires     = data.requires;
    this.connections  = data.connections ?? [...data.requires];
    this.cost         = data.cost;
    this.requiredLevel = data.requiredLevel;
  }

  /** True when all prerequisites are satisfied and the player has enough points + level */
  canPurchase(purchased: ReadonlySet<string>, playerLevel: number, talentPoints: number): boolean {
    if (this.purchased) return false;
    if (talentPoints < this.cost) return false;
    if (playerLevel < this.requiredLevel) return false;
    return this.requires.every(req => purchased.has(req));
  }

  /** Primary effect value for the first effect entry (convenience accessor) */
  get primaryEffectValue(): number {
    return this.effects[0]?.value ?? 0;
  }

  /** All effects of a given type + element */
  effectsOf(type: SkillEffectType, element: ElementType): number {
    return this.effects
      .filter(e => e.type === type && e.element === element)
      .reduce((s, e) => s + e.value, 0);
  }
}
