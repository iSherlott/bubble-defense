import type { IGameContext } from '../core/GameContext';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ElementType, OwnedItem, ItemDef } from '../types';
import type { ItemEffect } from '../behaviors/types';
import { itemRegistry } from '../registries';

/**
 * ItemSystem — aggregates item bonuses and handles item drops/stacking.
 * Replaces all getItemXxx() methods from Game.ts.
 */
export class ItemSystem {

  // ─── Bonus Aggregation ──────────────────────────────────────────────────────

  /** Sum an element-typed bonus across all owned items. */
  private sumElementBonus(
    items: OwnedItem[],
    hook: (effect: ItemEffect) => ((element: ElementType, stacks: number) => number) | undefined,
    element: ElementType,
  ): number {
    let total = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (!effect) continue;
      const fn = hook(effect);
      if (fn) total += fn.call(effect, element, owned.stacks);
    }
    return total;
  }

  /** Sum a scalar bonus across all owned items. */
  private sumScalarBonus(
    items: OwnedItem[],
    hook: (effect: ItemEffect) => ((stacks: number) => number) | undefined,
  ): number {
    let total = 0;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (!effect) continue;
      const fn = hook(effect);
      if (fn) total += fn.call(effect, owned.stacks);
    }
    return total;
  }

  /** Multiply an enemy-typed bonus across all owned items. */
  private multiplyEnemyBonus(
    items: OwnedItem[],
    hook: (effect: ItemEffect) => ((enemy: BaseEnemy, stacks: number) => number) | undefined,
    enemy: BaseEnemy,
  ): number {
    let mult = 1;
    for (const owned of items) {
      const effect = itemRegistry.getEffect(owned.defId);
      if (!effect) continue;
      const fn = hook(effect);
      if (fn) mult *= fn.call(effect, enemy, owned.stacks);
    }
    return mult;
  }

  getDmgBonus(element: ElementType, items: OwnedItem[]): number {
    return this.sumElementBonus(items, e => e.modifyDamage, element);
  }

  getSpeedBonus(element: ElementType, items: OwnedItem[]): number {
    return this.sumElementBonus(items, e => e.modifySpeed, element);
  }

  getRangeMult(element: ElementType, items: OwnedItem[]): number {
    return 1 + this.sumElementBonus(items, e => e.modifyRange, element);
  }

  getMagicChargeBonus(element: ElementType, items: OwnedItem[]): number {
    return this.sumElementBonus(items, e => e.modifyMagicCharge, element);
  }

  getGoldBonus(items: OwnedItem[]): number {
    return Math.round(this.sumScalarBonus(items, e => e.modifyGoldPerKill));
  }

  getDiscount(items: OwnedItem[]): number {
    return Math.min(0.6, this.sumScalarBonus(items, e => e.modifyCost));
  }

  getSlowAura(items: OwnedItem[]): number {
    return this.sumScalarBonus(items, e => e.modifySlowAura);
  }

  getWindPushBonus(items: OwnedItem[]): number {
    return this.sumScalarBonus(items, e => e.modifyWindPush);
  }

  getWindStunMult(items: OwnedItem[]): number {
    return 1 + this.sumScalarBonus(items, e => e.modifyWindStun);
  }

  getWaterSlowAmp(items: OwnedItem[]): number {
    return 1 + this.sumScalarBonus(items, e => e.modifyWaterSlow);
  }

  getEarthRadiusBonus(items: OwnedItem[]): number {
    return this.sumScalarBonus(items, e => e.modifyEarthRadius);
  }

  getHunterMult(enemy: BaseEnemy, items: OwnedItem[]): number {
    return this.multiplyEnemyBonus(items, e => e.modifyHunterDmg, enemy);
  }

  getBossMult(enemy: BaseEnemy, items: OwnedItem[]): number {
    return this.multiplyEnemyBonus(items, e => e.modifyBossDmg, enemy);
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

  // ─── Item Drop Animation ──────────────────────────────────────────────────

  /** Tick the item drop animation state machine */
  updateItemDropAnim(ctx: IGameContext, dt: number): void {
    if (!ctx.itemDropAnim) return;
    ctx.itemDropAnim.timer += dt;
    const t = ctx.itemDropAnim.timer;
    if (t < 0.6) ctx.itemDropAnim.phase = 'rising';
    else if (t < 2.0) ctx.itemDropAnim.phase = 'showing';
    else ctx.itemDropAnim.phase = 'fading';
    if (t >= ctx.itemDropAnim.totalTime) ctx.itemDropAnim = null;
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
