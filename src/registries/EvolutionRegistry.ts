import type { EvolutionDef, ElementType } from '../types';

export class EvolutionRegistry {
  private defs = new Map<string, EvolutionDef>();

  register(def: EvolutionDef): void {
    this.defs.set(def.id, def);
  }

  get(id: string): EvolutionDef | undefined {
    return this.defs.get(id);
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  /** All evolution options for a given element */
  getByElement(element: ElementType): EvolutionDef[] {
    return Array.from(this.defs.values()).filter(d => d.element === element);
  }

  getAll(): EvolutionDef[] {
    return Array.from(this.defs.values());
  }
}
