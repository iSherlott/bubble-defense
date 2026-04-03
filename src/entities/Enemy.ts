import type { EnemyDef, ActiveEffect, ElementType, Vec2 } from '../types';
import { positionOnPath } from '../game/MapGenerator';
import { CFG_FIRE_GOLEM_REGEN_PER_DMG, CFG_PERM_SLOW_PER_STACK, CFG_MAX_PERM_SLOW_STACKS } from '../settings';

let _nextId = 1;
export function resetEnemyIds() { _nextId = 1; }

export class Enemy {
  readonly id: number;
  readonly def: EnemyDef;

  maxHp: number;
  hp: number;
  baseSpeed: number;
  agility: number;
  distanceTraveled: number;
  pos: Vec2;
  effects: ActiveEffect[];
  permanentSlowStacks: number;
  stunRemaining: number;
  dead: boolean;
  reachedEnd: boolean;

  constructor(def: EnemyDef, waveMultiplier = 1) {
    this.id = _nextId++;
    this.def = def;
    this.maxHp     = Math.round(def.baseHp * waveMultiplier);
    this.hp        = this.maxHp;
    this.baseSpeed = def.speed * (1 + (waveMultiplier - 1) * 0.05);
    this.agility   = Math.round(def.agility * (1 + (waveMultiplier - 1) * 0.05));
    this.distanceTraveled = 0;
    this.pos = { x: 0, y: 0 };
    this.effects = [];
    this.permanentSlowStacks = 0;
    this.stunRemaining = 0;
    this.dead = false;
    this.reachedEnd = false;
  }

  // ─── Elemental ─────────────────────────────────────────────────────────────
  getElementMultiplier(element: ElementType): number {
    if (element === this.def.immune) return 0;
    if (this.def.halfElements.includes(element)) return 0.5;
    return element === this.weakElement() ? 2 : 1;
  }

  weakElement(): ElementType {
    const all: ElementType[] = ['fire', 'water', 'earth', 'wind'];
    return all.find(e => e !== this.def.immune && !this.def.halfElements.includes(e))!;
  }

  receiveDamage(baseDamage: number, element: ElementType): number {
    const mult   = this.getElementMultiplier(element);
    const actual = Math.round(baseDamage * mult);
    const before = this.hp;
    this.hp = Math.max(0, this.hp - actual);
    const dealt  = before - this.hp;

    // Fire golem: heals per damage point taken
    if (this.def.golemType === 'fire' && dealt > 0) {
      this.hp = Math.min(this.maxHp, this.hp + dealt * this.maxHp * CFG_FIRE_GOLEM_REGEN_PER_DMG);
    }

    if (this.hp <= 0) this.dead = true;
    return dealt;
  }

  applyBurn(percentPerSec: number, duration: number) {
    const ex = this.effects.find(e => e.type === 'burn');
    if (ex) { ex.remaining = Math.max(ex.remaining, duration); }
    else    { this.effects.push({ type: 'burn', value: percentPerSec, remaining: duration }); }
  }

  applyTempSlow(amount: number, duration: number) {
    const ex = this.effects.find(e => e.type === 'slow');
    if (ex) { ex.remaining = Math.max(ex.remaining, duration); ex.value = Math.max(ex.value, amount); }
    else    { this.effects.push({ type: 'slow', value: amount, remaining: duration }); }
  }

  addPermanentSlow() {
    this.permanentSlowStacks = Math.min(CFG_MAX_PERM_SLOW_STACKS, this.permanentSlowStacks + 1);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  update(dt: number, waypoints: Vec2[], totalLength: number) {
    if (this.dead || this.reachedEnd) return;

    if (this.stunRemaining > 0) {
      this.stunRemaining = Math.max(0, this.stunRemaining - dt);
      return;
    }

    this.effects = this.effects.filter(e => { e.remaining -= dt; return e.remaining > 0; });

    const burnEff = this.effects.find(e => e.type === 'burn');
    if (burnEff) {
      this.hp = Math.max(0, this.hp - (burnEff.value / 100) * this.maxHp * dt);
      if (this.hp <= 0) { this.dead = true; return; }
    }

    const permMult = Math.max(CFG_PERM_SLOW_PER_STACK, 1 - this.permanentSlowStacks * CFG_PERM_SLOW_PER_STACK);
    const tempEff  = this.effects.find(e => e.type === 'slow');
    const tempMult = tempEff ? (1 - tempEff.value) : 1;

    this.distanceTraveled += this.baseSpeed * permMult * tempMult * dt;
    this.pos = positionOnPath(waypoints, this.distanceTraveled);

    if (this.distanceTraveled >= totalLength) this.reachedEnd = true;
  }
}
