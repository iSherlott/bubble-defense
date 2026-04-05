// ─── BaseEnemy — common movement, HP, effects, and damage resolution ──────────
// Subclasses (StandardEnemy, BossEnemy, GolemEnemy) override only the parts
// that differ: special damage immunity, shield phases, boss adds, etc.

import type { EnemyDef, ActiveEffect, ElementType, Vec2 } from '../types';
import { BaseEntity, nextEntityId } from './BaseEntity';
import { positionOnPath } from '../systems/MapGenerator';
import { GameConfig } from '../config';

const cfg = GameConfig.get();

export abstract class BaseEnemy extends BaseEntity {
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

  // Runtime state set by systems
  isElite = false;
  trailTimer = 0;
  sandstormAcc: { amount: number; remaining: number } | null = null;

  // ── Per-frame transient modifiers (reset by EnemyBehaviorSystem each frame) ──
  /** Flat incoming-damage reduction (0 = none, 0.2 = 20% less). Stacks via Math.max. */
  tempDamageReduction = 0;
  /** Speed multiplier bonus (1 = none, 1.2 = 20% faster). Stacks via Math.max. */
  tempSpeedBoost = 1;
  /** Element this enemy currently resists by ~35% (set by reactive behaviors). */
  resistedElement: ElementType | null = null;

  // ── Persistent runtime tracking ───────────────────────────────────────────
  /** Seconds elapsed since last damage received — used by ThickHide regen. */
  lastDamageTimer = 0;

  /** Override in BossEnemy to reflect shield phase */
  get shieldActive(): boolean { return false; }

  constructor(def: EnemyDef, wave = 1, eliteMult = 1) {
    super();
    this.id  = nextEntityId();
    this.def = def;

    // HP: linear + compound scaling after threshold wave
    const E = cfg.enemy;
    const linearHp   = 1 + (wave - 1) * E.hpScalePerWave;
    const compoundHp = Math.pow(1 + E.hpCompoundRate, Math.max(0, wave - E.hpCompoundStart));
    this.maxHp     = Math.round(def.baseHp * linearHp * compoundHp * eliteMult);
    this.hp        = this.maxHp;
    this.baseSpeed = def.speed * (1 + (wave - 1) * E.speedScalePerWave) * Math.min(eliteMult, 2);
    this.agility   = Math.round(def.agility * (1 + (wave - 1) * E.agilityScale) * Math.min(eliteMult, 1.5));

    this.distanceTraveled = 0;
    this.pos = { x: 0, y: 0 };
    this.effects = [];
    this.permanentSlowStacks = 0;
    this.stunRemaining = 0;
    this.dead = false;
    this.reachedEnd = false;
  }

  // ─── Elemental resistance ─────────────────────────────────────────────────
  getElementMultiplier(element: ElementType): number {
    if (element === this.def.immune) return 0;
    if (this.def.halfElements.includes(element)) return 0.5;
    return element === this.weakElement() ? 2 : 1;
  }

  weakElement(): ElementType {
    const all: ElementType[] = ['fire', 'water', 'earth', 'wind'];
    return all.find(e => e !== this.def.immune && !this.def.halfElements.includes(e))!;
  }

  // ─── Damage — subclasses may add pre/post hooks ───────────────────────────
  receiveDamage(baseDamage: number, element: ElementType): number {
    const mult    = this.getElementMultiplier(element);
    // Flat damage reduction (earth anchor, defensive aura, etc.)
    const flatRed = 1 - this.tempDamageReduction;
    // Element-specific resistance (reactive shadow, leviathan shield phase, etc.)
    const elemRed = (this.resistedElement && element === this.resistedElement) ? 0.65 : 1;
    const actual  = Math.round(baseDamage * mult * flatRed * elemRed);
    const before  = this.hp;
    this.hp = Math.max(0, this.hp - actual);
    const dealt = before - this.hp;
    if (this.hp <= 0) this.dead = true;
    // Reset regen timer — damage resets the "quiet" window
    this.lastDamageTimer = 0;
    return dealt;
  }

  // ─── Status effects ───────────────────────────────────────────────────────
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
    const max = cfg.combat.maxPermSlowStacks;
    this.permanentSlowStacks = Math.min(max, this.permanentSlowStacks + 1);
  }

  // ─── Update loop — movement + effects ────────────────────────────────────
  update(dt: number, waypoints: Vec2[], totalLength: number) {
    if (this.dead || this.reachedEnd) return;

    // Tick the "time since last damage" counter (used by ThickHide regen)
    this.lastDamageTimer += dt;

    if (this.stunRemaining > 0) {
      this.stunRemaining = Math.max(0, this.stunRemaining - dt);
      return;
    }

    this.tickEffects(dt);
    if (this.dead) return;

    this.move(dt, waypoints, totalLength);
  }

  protected tickEffects(dt: number) {
    this.effects = this.effects.filter(e => { e.remaining -= dt; return e.remaining > 0; });

    const burnEff = this.effects.find(e => e.type === 'burn');
    if (burnEff) {
      this.hp = Math.max(0, this.hp - (burnEff.value / 100) * this.maxHp * dt);
      if (this.hp <= 0) { this.dead = true; }
    }
  }

  protected move(dt: number, waypoints: Vec2[], totalLength: number) {
    const permMult  = Math.pow(1 - cfg.combat.permSlowPerStack, this.permanentSlowStacks);
    const tempEff   = this.effects.find(e => e.type === 'slow');
    const tempMult  = tempEff ? (1 - tempEff.value) : 1;
    // tempSpeedBoost from anchor/support behaviors (reset each frame by EnemyBehaviorSystem)
    const boostMult = this.tempSpeedBoost;

    this.distanceTraveled += this.baseSpeed * permMult * tempMult * boostMult * dt;
    this.pos = positionOnPath(waypoints, this.distanceTraveled);

    if (this.distanceTraveled >= totalLength) this.reachedEnd = true;
  }
}
