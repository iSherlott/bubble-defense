import type { OwnedItem, ItemDropAnim, ItemDef } from '../../types';
import type { RelicSliceState } from '../GameState';

/**
 * RelicSlice — typed operations on relic (item) domain state.
 * Covers owned items, drop animation, and item-driven timers.
 * Accessed via StateStore.relicMgr.
 */
export class RelicSlice {
  constructor(private s: RelicSliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get items(): OwnedItem[]               { return this.s.items; }
  get itemDropAnim(): ItemDropAnim | null { return this.s.itemDropAnim; }
  get cataclysmTimer(): number           { return this.s.cataclysmTimer; }
  get titanShieldCharges(): number       { return this.s.titanShieldCharges; }
  get titanShieldWaves(): number         { return this.s.titanShieldWaves; }
  get lastItemWave(): number             { return this.s.lastItemWave; }
  get lastTronoWave(): number            { return this.s.lastTronoWave; }

  stacks(defId: string): number {
    return this.s.items.find(i => i.defId === defId)?.stacks ?? 0;
  }

  has(defId: string): boolean {
    return this.s.items.some(i => i.defId === defId);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────
  add(defId: string, stacks = 1): void {
    const existing = this.s.items.find(i => i.defId === defId);
    if (existing) {
      existing.stacks = Math.min(3, existing.stacks + stacks);
    } else {
      this.s.items.push({ defId, stacks });
    }
  }

  remove(defId: string): void {
    this.s.items = this.s.items.filter(i => i.defId !== defId);
  }

  replaceAll(items: OwnedItem[]): void {
    this.s.items = items;
  }

  clearAll(): void {
    this.s.items = [];
  }

  // ─── Drop animation ────────────────────────────────────────────────────────
  startDropAnim(item: ItemDef): void {
    this.s.itemDropAnim = { item, phase: 'rising', timer: 0, totalTime: 2.5 };
  }

  tickDropAnim(dt: number): void {
    const anim = this.s.itemDropAnim;
    if (!anim) return;
    anim.timer += dt;
    if      (anim.timer < 0.6)              anim.phase = 'rising';
    else if (anim.timer < 2.0)              anim.phase = 'showing';
    else                                    anim.phase = 'fading';
    if (anim.timer >= anim.totalTime)       this.s.itemDropAnim = null;
  }

  clearDropAnim(): void {
    this.s.itemDropAnim = null;
  }

  // ─── Timers ────────────────────────────────────────────────────────────────
  tickCataclysm(dt: number): void { this.s.cataclysmTimer += dt; }
  resetCataclysm(): void          { this.s.cataclysmTimer = 0; }

  addTitanShieldCharge(n = 1): void { this.s.titanShieldCharges += n; }
  consumeTitanShield(n: number): number {
    const absorbed = Math.min(n, this.s.titanShieldCharges);
    this.s.titanShieldCharges -= absorbed;
    return absorbed;
  }

  incrementTitanWave(): void { this.s.titanShieldWaves++; }
  resetTitanWaves(): void    { this.s.titanShieldWaves = 0; }

  setLastItemWave(wave: number): void  { this.s.lastItemWave = wave; }
  setLastTronoWave(wave: number): void { this.s.lastTronoWave = wave; }

  // ─── Reset ─────────────────────────────────────────────────────────────────
  reset(): void {
    this.s.items              = [];
    this.s.itemDropAnim       = null;
    this.s.cataclysmTimer     = 0;
    this.s.titanShieldCharges = 0;
    this.s.titanShieldWaves   = 0;
    this.s.lastItemWave       = 0;
    this.s.lastTronoWave      = 0;
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): RelicSliceState { return this.s; }
}
