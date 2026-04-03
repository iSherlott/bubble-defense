import type { Talent, ElementType } from '../types';
import type { Stats } from '../types';
import { TALENT_DEFS } from '../constants';
import { CFG_WATER_PUDDLE_CHANCE } from '../settings';

export class TalentTree {
  talents: Talent[];

  constructor() {
    this.talents = TALENT_DEFS.map(t => ({ ...t, purchased: false }));
  }

  canPurchase(talent: Talent, playerLevel: number, _stats: Stats, talentPoints: number): boolean {
    if (talent.purchased) return false;
    if (talentPoints < talent.cost) return false;
    if (playerLevel < talent.requiredLevel) return false;
    // Must buy previous tier in same branch first
    if (talent.tier > 0) {
      const prev = this.talents.find(t => t.branch === talent.branch && t.tier === talent.tier - 1);
      if (prev && !prev.purchased) return false;
    }
    return true;
  }

  purchase(id: string): boolean {
    const t = this.talents.find(t => t.id === id);
    if (!t) return false;
    t.purchased = true;
    return true;
  }

  // ─── Bonus queries ────────────────────────────────────────────────────────
  /** +damage% for a specific element's towers */
  damageBonusForElement(element: ElementType): number {
    return this.talents
      .filter(t => t.purchased && t.effectType === 'damage' && t.element === element)
      .reduce((s, t) => s + t.effectValue, 0);
  }

  /** +speed% for a specific element's towers (very small: 0.005 = 0.5%) */
  speedBonusForElement(element: ElementType): number {
    return this.talents
      .filter(t => t.purchased && t.effectType === 'speed' && t.element === element)
      .reduce((s, t) => s + t.effectValue, 0);
  }

  /** Magic speed bonus: +X to magicBarGain multiplier */
  magicSpeedBonusForElement(element: ElementType): number {
    return this.talents
      .filter(t => t.purchased && t.effectType === 'magicSpeed' && t.element === element)
      .reduce((s, t) => s + t.effectValue, 0);
  }

  // ─── Tier-3 special effects ───────────────────────────────────────────────
  /** Fire T3: magic applies burn (1% maxHP/s for 5s) */
  fireBurnOnMagic(): boolean {
    return this.talents.some(t => t.id === 'fire_t3' && t.purchased);
  }

  /** Water T3: 25% chance to place puddle on magic hit */
  waterPuddleChance(): number {
    return this.talents.some(t => t.id === 'water_t3' && t.purchased) ? CFG_WATER_PUDDLE_CHANCE : 0;
  }

  /** Earth T3: AoE radius multiplier (1.0 = normal, 1.5 = 50% bigger) */
  earthAoERadiusMult(): number {
    return this.talents.some(t => t.id === 'earth_t3' && t.purchased) ? 1.5 : 1.0;
  }

  /** Wind T3: stun duration after push (0 = no stun) */
  windStunDuration(): number {
    return this.talents.some(t => t.id === 'wind_t3' && t.purchased) ? 1.0 : 0;
  }

  // ─── Serialization ────────────────────────────────────────────────────────
  getPurchasedIds(): string[] {
    return this.talents.filter(t => t.purchased).map(t => t.id);
  }

  loadFromIds(ids: string[]) {
    for (const t of this.talents) t.purchased = ids.includes(t.id);
  }
}
