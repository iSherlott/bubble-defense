import type { EnemyDef } from '../types';
import type { EnemyBehavior } from '../behaviors/types';

export interface EnemyBlueprint {
  def: EnemyDef;
  behaviors: EnemyBehavior[];
}

export class EnemyRegistry {
  private blueprints = new Map<string, EnemyBlueprint>();

  register(blueprint: EnemyBlueprint): void {
    this.blueprints.set(blueprint.def.id, blueprint);
  }

  get(id: string): EnemyBlueprint | undefined {
    return this.blueprints.get(id);
  }

  has(id: string): boolean {
    return this.blueprints.has(id);
  }

  getAll(): EnemyBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  getDef(id: string): EnemyDef | undefined {
    return this.get(id)?.def;
  }

  getAllDefs(): EnemyDef[] {
    return this.getAll().map(bp => bp.def);
  }

  getBossDefs(): EnemyDef[] {
    return this.getAllDefs().filter(d => d.isBoss);
  }

  getGolemDefs(): EnemyDef[] {
    return this.getAllDefs().filter(d => !!d.golemType);
  }

  /** Non-boss, non-golem enemy defs */
  getStandardDefs(): EnemyDef[] {
    return this.getAllDefs().filter(d => !d.isBoss && !d.golemType);
  }
}
