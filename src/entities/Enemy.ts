import type { EnemyDef, ActiveEffect, ElementType, Vec2 } from '../types';
import { positionOnPath } from '../game/MapGenerator';
import { CFG_FIRE_GOLEM_REGEN_PER_HIT, CFG_PERM_SLOW_PER_STACK, CFG_MAX_PERM_SLOW_STACKS,
  CFG_ENEMY_HP_SCALE_PER_WAVE, CFG_ENEMY_HP_COMPOUND_RATE, CFG_ENEMY_HP_COMPOUND_START,
  CFG_ENEMY_SPEED_SCALE_PER_WAVE, CFG_ENEMY_AGILITY_SCALE } from '../settings';

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

  // Boss ability state
  bossAddsSpawned: number;       // summon_adds: tracks how many 25% thresholds triggered
  bossShieldActive: boolean;     // shield_phase: currently immune
  bossShieldTimer: number;       // shield_phase: seconds remaining
  bossShieldTriggered: boolean;  // shield_phase: already triggered at 50%

  constructor(def: EnemyDef, wave = 1, eliteMult = 1) {
    this.id = _nextId++;
    this.def = def;
    // HP: linear + compound scaling after threshold
    const linearHp  = 1 + (wave - 1) * CFG_ENEMY_HP_SCALE_PER_WAVE;
    const compoundHp = Math.pow(1 + CFG_ENEMY_HP_COMPOUND_RATE,
      Math.max(0, wave - CFG_ENEMY_HP_COMPOUND_START));
    this.maxHp     = Math.round(def.baseHp * linearHp * compoundHp * eliteMult);
    this.hp        = this.maxHp;
    this.baseSpeed = def.speed * (1 + (wave - 1) * CFG_ENEMY_SPEED_SCALE_PER_WAVE) * Math.min(eliteMult, 2);
    this.agility   = Math.round(def.agility * (1 + (wave - 1) * CFG_ENEMY_AGILITY_SCALE) * Math.min(eliteMult, 1.5));
    this.distanceTraveled = 0;
    this.pos = { x: 0, y: 0 };
    this.effects = [];
    this.permanentSlowStacks = 0;
    this.stunRemaining = 0;
    this.dead = false;
    this.reachedEnd = false;
    this.bossAddsSpawned = 0;
    this.bossShieldActive = false;
    this.bossShieldTimer = 0;
    this.bossShieldTriggered = false;
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
    // Shadow Titan shield phase: immune to all damage
    if (this.bossShieldActive) return 0;

    const mult   = this.getElementMultiplier(element);
    const actual = Math.round(baseDamage * mult);
    const before = this.hp;
    this.hp = Math.max(0, this.hp - actual);
    const dealt  = before - this.hp;

    // Fire golem: heals flat % of maxHP per hit (only if still alive)
    if (this.def.golemType === 'fire' && dealt > 0 && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * CFG_FIRE_GOLEM_REGEN_PER_HIT);
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

    // Boss shield phase countdown
    if (this.bossShieldActive) {
      this.bossShieldTimer -= dt;
      if (this.bossShieldTimer <= 0) this.bossShieldActive = false;
    }

    this.effects = this.effects.filter(e => { e.remaining -= dt; return e.remaining > 0; });

    const burnEff = this.effects.find(e => e.type === 'burn');
    if (burnEff) {
      this.hp = Math.max(0, this.hp - (burnEff.value / 100) * this.maxHp * dt);
      if (this.hp <= 0) { this.dead = true; return; }
    }

    // Diminishing permanent slow: each stack multiplies by (1 - base), so total = (1-base)^stacks
    // With base=0.08, 5 stacks → 66% speed, 10 stacks → 43%, 19 stacks → 20%
    const permMult = Math.pow(1 - CFG_PERM_SLOW_PER_STACK, this.permanentSlowStacks);
    const tempEff  = this.effects.find(e => e.type === 'slow');
    const tempMult = tempEff ? (1 - tempEff.value) : 1;

    this.distanceTraveled += this.baseSpeed * permMult * tempMult * dt;
    this.pos = positionOnPath(waypoints, this.distanceTraveled);

    if (this.distanceTraveled >= totalLength) this.reachedEnd = true;
  }
}
