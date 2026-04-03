// ─── Item Class Hierarchy ─────────────────────────────────────────────────────
// BaseItem wraps ItemDef and owns the stacks counter.
// Subclasses group by effect category so Game.ts can query them polymorphically.
//
// Categories:
//   TowerBuffItem   — boosts a specific element's towers (damage, speed, range, stun)
//   MagicItem       — affects magic bar charge speed, AoE, slow amplitude
//   EconomyItem     — gold bonuses, discounts
//   SpecialItem     — unique effects (titan shield, cataclysm timer, magma trail, etc.)

import type { ItemDef, ItemRarity } from '../../types';

// ─── Abstract base ────────────────────────────────────────────────────────────
export abstract class BaseItem {
  readonly def: ItemDef;
  stacks: number;

  constructor(def: ItemDef, stacks = 1) {
    this.def    = def;
    this.stacks = Math.max(1, Math.min(3, stacks));
  }

  get id(): string       { return this.def.id; }
  get name(): string     { return this.def.name; }
  get icon(): string     { return this.def.icon; }
  get rarity(): ItemRarity { return this.def.rarity; }
  get description(): string { return this.def.description; }

  /** Effective value after stacking */
  get totalValue(): number { return this.def.effectValue * this.stacks; }

  /** True if another stack can still be added */
  canStack(): boolean { return this.stacks < 3; }

  /** Adds one stack. Returns false if already at max. */
  addStack(): boolean {
    if (!this.canStack()) return false;
    this.stacks++;
    return true;
  }

  /** Human-readable effect summary (for tooltip) */
  abstract effectSummary(): string;
}

// ─── Tower Buff Items ─────────────────────────────────────────────────────────
// Affect a specific element's towers: damage, attack speed, range, stun duration.
export class TowerBuffItem extends BaseItem {
  override effectSummary(): string {
    const pct = Math.round(this.totalValue * 100);
    switch (this.def.effectType) {
      case 'fire_dmg':      return `Torres de Fogo: +${pct}% dano`;
      case 'water_atkspd':  return `Torres de Água: +${pct}% vel. de ataque`;
      case 'earth_range':   return `Torres de Terra: +${pct}% alcance`;
      case 'wind_stun_dur': return `Vento: controles duram +${pct}%`;
      case 'all_towers_buff': return `Todas as torres: +${pct}% dano e vel.`;
      default: return this.def.description;
    }
  }
}

// ─── Magic Items ──────────────────────────────────────────────────────────────
// Affect magic bar charge rate, AoE radius, slow amplitude, freeze chance, etc.
export class MagicItem extends BaseItem {
  override effectSummary(): string {
    const pct = Math.round(this.totalValue * 100);
    switch (this.def.effectType) {
      case 'fire_magic_charge':  return `Fogo: carga de magia +${pct}%`;
      case 'water_slow_amp':     return `Água: lentidão ampliada +${pct}%`;
      case 'earth_radius':       return `Terra: raio de AoE +${pct}%`;
      case 'wind_push_tiles':    return `Vento: empurra +${this.totalValue} tiles a mais`;
      case 'water_freeze':       return `Água: ${pct}% chance de congelar`;
      case 'earth_sandstorm':    return `Terra: tempestade de areia (dano/s em área)`;
      case 'wind_chain_magic':   return `Vento: magia encadeia ${Math.round(this.totalValue)} alvos`;
      case 'fire_aoe_splash':    return `Fogo: explosão em área ao acertar`;
      default: return this.def.description;
    }
  }
}

// ─── Economy Items ────────────────────────────────────────────────────────────
// Gold bonuses, kill bonuses, discounts, wave-start gold.
export class EconomyItem extends BaseItem {
  override effectSummary(): string {
    switch (this.def.effectType) {
      case 'gold_mult':        return `+${this.totalValue} ouro por inimigo`;
      case 'discount':         return `Compras ${Math.round(this.totalValue * 100)}% mais baratas`;
      case 'wave_gold_bonus':  return `+${this.totalValue * 40}g por wave (Trono)`;
      case 'boss_dmg_bonus':   return `+${Math.round(this.totalValue * 100)}% dano a chefes`;
      case 'hunter_dmg':       return `+${Math.round(this.totalValue * 100)}% dano vs inimigo-alvo`;
      default: return this.def.description;
    }
  }
}

// ─── Special / Legendary Items ────────────────────────────────────────────────
// Unique mechanics: titan shield, cataclysm timer, magma trail, slow aura, etc.
export class SpecialItem extends BaseItem {
  override effectSummary(): string {
    switch (this.def.effectType) {
      case 'titan_shield':         return `Absorve ${this.stacks} perda(s) de vida`;
      case 'cataclysm':            return `Cataclismo a cada ${Math.round(20 / this.stacks)}s`;
      case 'fire_magma_trail':     return `Fogo: rastro de magma no chão`;
      case 'slow_aura':            return `Aura: inimigos ${Math.round(this.totalValue * 100)}% mais lentos`;
      case 'wind_chain_magic':     return `Magia Vento encadeia alvos`;
      case 'earth_sandstorm':      return `Tempestade de Areia em área`;
      default: return this.def.description;
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
const TOWER_BUFF_TYPES = new Set([
  'fire_dmg', 'water_atkspd', 'earth_range', 'wind_stun_dur', 'all_towers_buff',
]);
const MAGIC_TYPES = new Set([
  'fire_magic_charge', 'water_slow_amp', 'earth_radius', 'wind_push_tiles',
  'water_freeze', 'earth_sandstorm', 'wind_chain_magic', 'fire_aoe_splash',
]);
const ECONOMY_TYPES = new Set([
  'gold_mult', 'discount', 'wave_gold_bonus', 'boss_dmg_bonus', 'hunter_dmg',
]);

/** Creates the correct BaseItem subclass for a given ItemDef. */
export function createItem(def: ItemDef, stacks = 1): BaseItem {
  if (TOWER_BUFF_TYPES.has(def.effectType)) return new TowerBuffItem(def, stacks);
  if (MAGIC_TYPES.has(def.effectType))      return new MagicItem(def, stacks);
  if (ECONOMY_TYPES.has(def.effectType))    return new EconomyItem(def, stacks);
  return new SpecialItem(def, stacks);
}
