import type { FusionDef } from '../types';
import type { FusionBehavior } from '../behaviors/types';

export interface FusionBlueprint {
  def: FusionDef;
  behavior: FusionBehavior;
}

export class FusionRegistry {
  private byEffect = new Map<string, FusionBlueprint>();
  private byPair = new Map<string, FusionBlueprint>();

  register(blueprint: FusionBlueprint): void {
    this.byEffect.set(blueprint.def.specialEffect, blueprint);
    this.byPair.set(this.pairKey(blueprint.def.primaryElement, blueprint.def.secondaryElement), blueprint);
  }

  getByEffect(effectId: string): FusionBlueprint | undefined {
    return this.byEffect.get(effectId);
  }

  getByElements(primary: string, secondary: string): FusionBlueprint | undefined {
    return this.byPair.get(this.pairKey(primary, secondary));
  }

  getDef(primary: string, secondary: string): FusionDef | undefined {
    return this.getByElements(primary, secondary)?.def;
  }

  getBehavior(effectId: string): FusionBehavior | undefined {
    return this.byEffect.get(effectId)?.behavior;
  }

  has(primary: string, secondary: string): boolean {
    return this.byPair.has(this.pairKey(primary, secondary));
  }

  private pairKey(a: string, b: string): string {
    return `${a}+${b}`;
  }
}
