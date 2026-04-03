import type { IGameContext } from '../core/GameContext';
import { GameConfig } from '../config';
import type { BaseTower } from '../entities/BaseTower';

/**
 * EffectSystem — handles puddle effects, burn zones, and cataclysm timer.
 * Extracted from Game.ts update() method.
 */
export class EffectSystem {

  update(ctx: IGameContext, dt: number): void {
    this.processPuddles(ctx, dt);
    this.processBurnZones(ctx, dt);
    this.processCataclysm(ctx, dt);
  }

  private processPuddles(ctx: IGameContext, dt: number): void {
    for (const e of ctx.enemies) {
      if (e.dead) continue;
      for (const pu of ctx.puddles) {
        if (Math.hypot(e.pos.x - pu.x, e.pos.y - pu.y) <= pu.radius) {
          if (e.def.golemType === 'water') {
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * GameConfig.get().combat.waterGolemPuddleRegen * dt * 60);
          } else {
            e.applyTempSlow(pu.slowAmount, 0.5);
          }
        }
      }
    }
    for (const pu of ctx.puddles) pu.remaining -= dt;
    ctx.puddles = ctx.puddles.filter(p => p.remaining > 0);
  }

  private processBurnZones(ctx: IGameContext, dt: number): void {
    for (const bz of ctx.burnZones) {
      bz.remaining -= dt;
      for (const e of ctx.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.pos.x - bz.x, e.pos.y - bz.y) <= bz.radius) {
          e.receiveDamage(bz.dmgPerSec * dt, 'fire');
        }
      }
    }
    ctx.burnZones = ctx.burnZones.filter(bz => bz.remaining > 0);
  }

  private processCataclysm(ctx: IGameContext, dt: number): void {
    const hasRelic = ctx.items.some(i => i.defId === 'cataclysm_relic');
    if (!hasRelic || !ctx.waveManager.waveActive) return;

    ctx.cataclysmTimer += dt;
    if (ctx.cataclysmTimer >= 20) {
      ctx.cataclysmTimer = 0;
      this.fireCataclysm(ctx);
    }
  }

  private fireCataclysm(ctx: IGameContext): void {
    if (ctx.enemies.length === 0) return;
    const strongest = ctx.towers.reduce<BaseTower | null>((best, t) => {
      if (!best) return t;
      const affM = t.computeAffinityMult(ctx.player.affinity);
      const bestAffM = best.computeAffinityMult(ctx.player.affinity);
      return t.getMagicDamage(ctx.player.stats, affM) > best.getMagicDamage(ctx.player.stats, bestAffM) ? t : best;
    }, null);
    if (!strongest) return;

    const catStacks = ctx.items.find(i => i.defId === 'cataclysm_relic')?.stacks ?? 0;
    const affM = strongest.computeAffinityMult(ctx.player.affinity);
    const baseMagic = strongest.getMagicDamage(ctx.player.stats, affM);
    const catDmg = baseMagic * 2.50 * catStacks;

    let hitCount = 0;
    for (const e of ctx.enemies) {
      if (!e.dead && !e.reachedEnd) {
        e.receiveDamage(catDmg, strongest.def.element);
        hitCount++;
      }
    }
    ctx.triggerAoeFlash(
      ctx.map.gameWidth / 2, ctx.map.gameHeight / 2,
      Math.max(ctx.map.gameWidth, ctx.map.gameHeight),
    );
    ctx.addFT(
      { x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 },
      `💥 CATACLISMO! ×${hitCount}`, '#ff6600',
    );
  }
}
