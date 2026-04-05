import type { ProjectileData, Puddle, Vec2 } from '../../types';
import type { BaseEnemy } from '../../entities/BaseEnemy';
import type { BurnZone, FloatingText } from '../../core/GameContext';
import type { EnemySliceState } from '../GameState';

/**
 * EnemySlice — typed operations on enemy/combat ephemera domain state.
 * Accessed via StateStore.enemyMgr.
 */
export class EnemySlice {
  constructor(private s: EnemySliceState) {}

  // ─── Read ──────────────────────────────────────────────────────────────────
  get all(): BaseEnemy[]        { return this.s.enemies; }
  get projectiles(): ProjectileData[] { return this.s.projectiles; }
  get floatingTexts(): FloatingText[] { return this.s.floatingTexts; }
  get puddles(): Puddle[]       { return this.s.puddles; }
  get burnZones(): BurnZone[]   { return this.s.burnZones; }

  // ─── Enemies ───────────────────────────────────────────────────────────────
  add(enemy: BaseEnemy): void {
    this.s.enemies.push(enemy);
  }

  addMany(enemies: BaseEnemy[]): void {
    this.s.enemies.push(...enemies);
  }

  removeDeadAndReached(): BaseEnemy[] {
    const removed = this.s.enemies.filter(e => e.dead);
    this.s.enemies = this.s.enemies.filter(e => !e.dead);
    return removed;
  }

  replaceAll(enemies: BaseEnemy[]): void {
    this.s.enemies = enemies;
  }

  clearAll(): void {
    this.s.enemies = [];
  }

  killAll(): void {
    for (const e of this.s.enemies) e.dead = true;
  }

  // ─── Projectiles ───────────────────────────────────────────────────────────
  addProjectile(p: ProjectileData): void {
    this.s.projectiles.push(p);
  }

  addProjectiles(ps: ProjectileData[]): void {
    this.s.projectiles.push(...ps);
  }

  removeDeadProjectiles(): void {
    this.s.projectiles = this.s.projectiles.filter(p => !p.dead);
  }

  clearProjectiles(): void {
    this.s.projectiles = [];
  }

  // ─── Floating texts ────────────────────────────────────────────────────────
  addFloatingText(pos: Vec2, text: string, color: string): void {
    this.s.floatingTexts.push({
      x: pos.x + (Math.random() - 0.5) * 18,
      y: pos.y - 20,
      text, color,
      life: 1.2, maxLife: 1.2,
    });
  }

  tickFloatingTexts(dt: number): void {
    for (const f of this.s.floatingTexts) { f.y -= 40 * dt; f.life -= dt; }
    this.s.floatingTexts = this.s.floatingTexts.filter(f => f.life > 0);
  }

  clearFloatingTexts(): void {
    this.s.floatingTexts = [];
  }

  // ─── Puddles ───────────────────────────────────────────────────────────────
  addPuddle(puddle: Puddle): void {
    this.s.puddles.push(puddle);
  }

  clearExpiredPuddles(): void {
    this.s.puddles = this.s.puddles.filter(p => p.remaining > 0);
  }

  clearPuddles(): void {
    this.s.puddles = [];
  }

  // ─── Burn zones ────────────────────────────────────────────────────────────
  addBurnZone(zone: BurnZone): void {
    this.s.burnZones.push(zone);
  }

  clearExpiredBurnZones(): void {
    this.s.burnZones = this.s.burnZones.filter(b => b.remaining > 0);
  }

  clearBurnZones(): void {
    this.s.burnZones = [];
  }

  /** Direct reference to the raw state — for IGameContext compatibility. */
  get _raw(): EnemySliceState { return this.s; }
}
