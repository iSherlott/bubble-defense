import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType, OwnedItem, ItemDef } from '../types';
import { itemRegistry } from '../registries';

/**
 * ItemSystem — aggregates item bonuses and handles item drops/stacking.
 * Replaces all getItemXxx() methods from Game.ts.
 */
export class ItemSystem {

  // ─── Bonus Aggregation ──────────────────────────────────────────────────────

  getDmgBonus(element: ElementType, items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyDamage) bonus += effect.modifyDamage(element, owned.stacks);
    }
    return bonus;
  }

  getSpeedBonus(element: ElementType, items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifySpeed) bonus += effect.modifySpeed(element, owned.stacks);
    }
    return bonus;
  }

  getRangeMult(element: ElementType, items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyRange) bonus += effect.modifyRange(element, owned.stacks);
    }
    return 1 + bonus;
  }

  getMagicChargeBonus(element: ElementType, items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyMagicCharge) bonus += effect.modifyMagicCharge(element, owned.stacks);
    }
    return bonus;
  }

  getGoldBonus(items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyGoldPerKill) bonus += effect.modifyGoldPerKill(owned.stacks);
    }
    return Math.round(bonus);
  }

  getDiscount(items: OwnedItem[]): number {
    let disc = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyCost) disc += effect.modifyCost(owned.stacks);
    }
    return Math.min(0.6, disc);
  }

  getSlowAura(items: OwnedItem[]): number {
    let slow = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifySlowAura) slow += effect.modifySlowAura(owned.stacks);
    }
    return slow;
  }

  getWindPushBonus(items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyWindPush) bonus += effect.modifyWindPush(owned.stacks);
    }
    return bonus;
  }

  getWindStunMult(items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyWindStun) bonus += effect.modifyWindStun(owned.stacks);
    }
    return 1 + bonus;
  }

  getWaterSlowAmp(items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyWaterSlow) bonus += effect.modifyWaterSlow(owned.stacks);
    }
    return 1 + bonus;
  }

  getEarthRadiusBonus(items: OwnedItem[]): number {
    let bonus = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyEarthRadius) bonus += effect.modifyEarthRadius(owned.stacks);
    }
    return bonus;
  }

  getHunterMult(enemy: BaseEnemy, items: OwnedItem[]): number {
    let mult = 1;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyHunterDmg) mult *= effect.modifyHunterDmg(enemy, owned.stacks);
    }
    return mult;
  }

  getBossMult(enemy: BaseEnemy, items: OwnedItem[]): number {
    let mult = 1;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.modifyBossDmg) mult *= effect.modifyBossDmg(enemy, owned.stacks);
    }
    return mult;
  }

  // ─── Effect Checks ──────────────────────────────────────────────────────────

  hasEffect(effectId: string, items: OwnedItem[]): boolean {
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.hasEffect?.(effectId)) return true;
    }
    return false;
  }

  getEffectChance(effectId: string, items: OwnedItem[]): number {
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.getEffectChance) {
        const chance = effect.getEffectChance(effectId, owned.stacks);
        if (chance > 0) return chance;
      }
    }
    return 0;
  }

  getEffectValue(effectId: string, items: OwnedItem[]): number {
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (effect?.getEffectValue) {
        const val = effect.getEffectValue(effectId, owned.stacks);
        if (val !== 0) return val;
      }
    }
    return 0;
  }

  // ─── Stacks Query ──────────────────────────────────────────────────────────

  hasItem(id: string, items: OwnedItem[]): boolean {
    return items.some(i => i.defId === id);
  }

  itemStacks(id: string, items: OwnedItem[]): number {
    return items.find(i => i.defId === id)?.stacks ?? 0;
  }

  // ─── Item Drops ─────────────────────────────────────────────────────────────

  rollItemDrop(ctx: IGameContext): void {
    const allDefs = itemRegistry.getAllDefs();
    const roll = Math.random();
    let pool: ItemDef[];
    if (roll < 0.05)      pool = allDefs.filter(i => i.rarity === 'legendary');
    else if (roll < 0.18) pool = allDefs.filter(i => i.rarity === 'epic');
    else if (roll < 0.40) pool = allDefs.filter(i => i.rarity === 'rare');
    else                  pool = allDefs.filter(i => i.rarity === 'common');
    if (pool.length === 0) pool = allDefs.filter(i => i.rarity === 'common');
    const item = pool[Math.floor(Math.random() * pool.length)];
    this.addItem(ctx, item);
  }

  addItem(ctx: IGameContext, item: ItemDef): void {
    const existing = ctx.items.find(i => i.defId === item.id);
    if (existing) {
      if (existing.stacks < 3) {
        existing.stacks++;
      } else {
        // Max stacks → reroll once
        const allDefs = itemRegistry.getAllDefs();
        const alt = allDefs.filter(i => i.rarity === item.rarity && i.id !== item.id);
        if (alt.length > 0) {
          const other = alt[Math.floor(Math.random() * alt.length)];
          const otherExisting = ctx.items.find(i => i.defId === other.id);
          if (otherExisting && otherExisting.stacks < 3) otherExisting.stacks++;
          else if (!otherExisting) ctx.items.push({ defId: other.id, stacks: 1 });
          ctx.itemDropAnim = { item: other, phase: 'rising', timer: 0, totalTime: 2.5 };
          return;
        }
        return; // all maxed
      }
    } else {
      ctx.items.push({ defId: item.id, stacks: 1 });
    }
    ctx.itemDropAnim = { item, phase: 'rising', timer: 0, totalTime: 2.5 };
  }

  // ─── Wave Event Hooks ────────────────────────────────────────────────────────

  processWaveStart(ctx: IGameContext): void {
    for (const owned of ctx.items) {
      const effect = itemRegistry.getEffect(owned.defId);
      effect?.onWaveStart?.(ctx, owned.stacks);
    }
  }

  processWaveComplete(ctx: IGameContext): void {
    for (const owned of ctx.items) {
      const effect = itemRegistry.getEffect(owned.defId);
      effect?.onWaveComplete?.(ctx, owned.stacks);
    }
  }

  applySlowAura(ctx: IGameContext, newEnemies: BaseEnemy[]): void {
    const slowAura = this.getSlowAura(ctx.items);
    if (slowAura > 0) {
      for (const e of newEnemies) e.applyTempSlow(0.15, slowAura);
    }
  }
}
