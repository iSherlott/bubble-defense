import type { TowerDef } from '../types';
import type { MagicBehavior } from '../behaviors/types';

export interface TowerBlueprint {
  def: TowerDef;
  magicBehavior: MagicBehavior;
}

export class TowerRegistry {
  private blueprints = new Map<string, TowerBlueprint>();

  register(blueprint: TowerBlueprint): void {
    this.blueprints.set(blueprint.def.id, blueprint);
  }

  get(id: string): TowerBlueprint {
    const bp = this.blueprints.get(id);
    if (!bp) throw new Error(`Tower "${id}" not registered`);
    return bp;
  }

  has(id: string): boolean {
    return this.blueprints.has(id);
  }

  getAll(): TowerBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  getDef(id: string): TowerDef {
    return this.get(id).def;
  }

  getAllDefs(): TowerDef[] {
    return this.getAll().map(bp => bp.def);
  }
}
