import type { ItemDef } from '../types';
import type { ItemEffect } from '../behaviors/types';

export class ItemRegistry {
  private effects = new Map<string, ItemEffect>();
  private defs = new Map<string, ItemDef>();

  register(def: ItemDef, effect: ItemEffect): void {
    this.defs.set(def.id, def);
    this.effects.set(def.id, effect);
  }

  getEffect(id: string): ItemEffect | undefined {
    return this.effects.get(id);
  }

  getDef(id: string): ItemDef | undefined {
    return this.defs.get(id);
  }

  getAllDefs(): ItemDef[] {
    return Array.from(this.defs.values());
  }

  getByRarity(rarity: string): ItemDef[] {
    return this.getAllDefs().filter(d => d.rarity === rarity);
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }
}
