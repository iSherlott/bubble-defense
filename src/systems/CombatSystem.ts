import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ProjectileData, ElementType } from '../types';
import { createProjectile, updateProjectile } from '../entities/Projectile';
import { CELL_SIZE, ELEMENT_COLORS } from '../constants';
import { GameConfig } from '../config';
import { towerRegistry } from '../registries';
import { fusionRegistry } from '../registries';
import type { ItemSystem } from './ItemSystem';

const cfg = GameConfig.get();
const EARTH_AOE_BASE = cfg.combat.earthAoeRadius;
const PUDDLE_RADIUS  = cfg.combat.puddleRadius;
const PUDDLE_DURATION = cfg.combat.puddleDuration;
const WIND_PUSH_PX   = cfg.combat.windPushCells * CELL_SIZE;

/**
 * CombatSystem — handles tower targeting, shooting, magic firing,
 * projectile movement, and hit resolution.
 * Extracted from Game.ts.
 */
export class CombatSystem {
  constructor(private itemSystem: ItemSystem) {}

  update(ctx: IGameContext, dt: number): void {
    const extraProjs: ProjectileData[] = [];

    // ── Tower loop ────────────────────────────────────────────────────────────
    for (const tower of ctx.towers) {
      tower.update(dt);
      const speedB   = ctx.talentTree.speedBonusForElement(tower.def.element);
      const magicSpB = ctx.talentTree.magicSpeedBonusForElement(tower.def.element);
      const affM     = tower.computeAffinityMult(ctx.player.affinity);

      const itemSpeedB    = this.itemSystem.getSpeedBonus(tower.def.element, ctx.items);
      const itemRangeMult = this.itemSystem.getRangeMult(tower.def.element, ctx.items);
      const itemMagicChB  = this.itemSystem.getMagicChargeBonus(tower.def.element, ctx.items);

      if (!tower.canShoot()) continue;
      const target = tower.findTarget(ctx.enemies, itemRangeMult);
      if (!target) continue;

      const dmgB     = ctx.talentTree.damageBonusForElement(tower.def.element);
      const synergy  = this.getSynergyBonus(tower, ctx);
      const itemDmgB = this.itemSystem.getDmgBonus(tower.def.element, ctx.items);
      const baseDmg  = tower.getDamage(ctx.player.stats, dmgB + synergy + itemDmgB, affM);

      const didHit   = Math.random() <= ctx.player.hitChance(target.agility);
      const isCrit   = didHit && Math.random() < ctx.player.critChance();
      const critMult = isCrit ? ctx.player.critMultiplier() : 1;
      const dmg      = didHit ? baseDmg * critMult : 0;

      // Fused towers split normal shot damage between both elements
      const fusionComponents = tower.fusionDef && didHit ? [
        { element: tower.fusionDef.primaryElement, amount: dmg * 0.5 },
        { element: tower.fusionDef.secondaryElement, amount: dmg * 0.5 },
      ] : undefined;

      ctx.projectiles.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: target.id, damage: dmg, element: tower.def.element,
        color: didHit ? (isCrit ? '#ffff44' : (tower.fusionDef?.color ?? tower.def.accentColor)) : '#555555',
        isCrit, isMiss: !didHit,
        components: fusionComponents,
      }));

      const magicReady = tower.onNormalShot(ctx.player.stats, speedB + itemSpeedB, magicSpB + itemMagicChB);
      if (magicReady) {
        tower.consumeMagicBar();
        this.fireMagic(ctx, tower, affM, extraProjs);
        if (tower.dualMagic) this.fireMagic(ctx, tower, affM, extraProjs);
      }
    }

    // ── Projectile loop ───────────────────────────────────────────────────────
    const moreProjs: ProjectileData[] = [];
    for (const proj of ctx.projectiles) {
      const { hit, enemy } = updateProjectile(proj, ctx.enemies, dt);
      if (hit && enemy) this.onHit(ctx, proj, enemy as BaseEnemy, moreProjs);
    }
    ctx.projectiles = [...ctx.projectiles.filter(p => !p.dead), ...extraProjs, ...moreProjs];
  }

  // ─── Magic ──────────────────────────────────────────────────────────────────

  private fireMagic(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    // Fused tower → delegate to fusion behavior from registry
    if (tower.fusionDef) {
      this.fireFusionMagic(ctx, tower, affM, extra);
      return;
    }

    // Normal magic → delegate to element behavior from registry
    const blueprint = towerRegistry.get(tower.def.id);
    blueprint.magicBehavior.cast(ctx, tower, affM, extra);
  }

  private fireFusionMagic(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const fusion = tower.fusionDef!;
    const baseDmg = tower.getMagicDamage(ctx.player.stats, affM) * fusion.magicDamageMult;

    // Look up fusion behavior from registry
    const blueprint = fusionRegistry.getByEffect(fusion.specialEffect);
    if (blueprint) {
      blueprint.behavior.execute(ctx, tower, fusion, baseDmg, extra);
    } else {
      // Fallback: single target
      const targets = tower.findAllInRange(ctx.enemies);
      if (targets.length > 0) {
        extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: targets[0].id, damage: baseDmg, element: fusion.primaryElement,
          color: fusion.color, isMagic: true,
          components: [
            { element: fusion.primaryElement, amount: baseDmg * 0.6 },
            { element: fusion.secondaryElement, amount: baseDmg * 0.4 },
          ],
        }));
      }
    }

    ctx.addFT({ x: tower.pixelX, y: tower.pixelY - 20 }, `${fusion.icon} ${fusion.name}`, fusion.color);
  }

  // ─── Hit Resolution ─────────────────────────────────────────────────────────

  private findEarthGolemShield(ctx: IGameContext, enemy: BaseEnemy): BaseEnemy | null {
    return ctx.enemies.find(e =>
      !e.dead && e !== enemy && e.def.golemType === 'earth' &&
      Math.hypot(e.pos.x - enemy.pos.x, e.pos.y - enemy.pos.y) <= cfg.combat.earthGolemShieldRadius
    ) ?? null;
  }

  private onHit(ctx: IGameContext, proj: ProjectileData, enemy: BaseEnemy, extra: ProjectileData[]): void {
    if (proj.isMiss) { ctx.addFT(enemy.pos, 'MISS', '#666666'); return; }
    if (proj.isMagic) { this.applyMagic(ctx, proj, enemy); return; }

    const shield = this.findEarthGolemShield(ctx, enemy);
    const actualTarget = shield ?? enemy;
    const tw = ctx.towers.find(t => t.id === proj.towerId);

    const hunterMult = this.itemSystem.getHunterMult(actualTarget, ctx.items);
    const bossMult   = this.itemSystem.getBossMult(actualTarget, ctx.items);
    const itemMult   = hunterMult * bossMult;

    if (proj.components && proj.components.length > 0) {
      let totalDealt = 0;
      const parts: string[] = [];
      for (const comp of proj.components) {
        const d = actualTarget.receiveDamage(comp.amount * itemMult, comp.element);
        totalDealt += d;
        if (d > 0) parts.push(`${Math.round(d)}${ELEMENT_COLORS[comp.element] === proj.color ? '' : comp.element[0]}`);
      }
      if (tw) { tw.totalDamageDealt += totalDealt; if (actualTarget.dead) tw.totalKills++; }
      const label = parts.join('+') || '0';
      if (shield) ctx.addFT(shield.pos, `🛡${label}`, '#aaaaff');
      else ctx.addFT(enemy.pos, proj.isCrit ? `${label} CRÍTICO!` : label,
        proj.isCrit ? '#ffff44' : proj.color);
      // Fire AoE splash
      if (this.itemSystem.hasEffect('fire_aoe_splash', ctx.items) && proj.components.some(c => c.element === 'fire')) {
        const splashMult = this.itemSystem.getEffectValue('fire_aoe_splash_mult', ctx.items);
        this.applyFireAoeSplash(ctx, actualTarget, totalDealt * splashMult);
      }
    } else {
      const dmg = actualTarget.receiveDamage(proj.damage * itemMult, proj.element);
      if (tw) { tw.totalDamageDealt += dmg; if (actualTarget.dead) tw.totalKills++; }
      if (shield) {
        ctx.addFT(shield.pos, `🛡${Math.round(dmg)}`, '#aaaaff');
      } else if (dmg === 0 && proj.element === 'fire' && actualTarget.def.golemType === 'fire') {
        ctx.addFT(enemy.pos, '🔥IMUNE', '#ff6600');
      } else {
        ctx.addFT(enemy.pos, proj.isCrit ? `${Math.round(dmg)} CRÍTICO!` : String(Math.round(dmg)),
          proj.isCrit ? '#ffff44' : proj.color);
      }
      if (this.itemSystem.hasEffect('fire_aoe_splash', ctx.items) && proj.element === 'fire') {
        const splashMult = this.itemSystem.getEffectValue('fire_aoe_splash_mult', ctx.items);
        this.applyFireAoeSplash(ctx, actualTarget, dmg * splashMult);
      }
    }
  }

  private applyFireAoeSplash(ctx: IGameContext, source: BaseEnemy, splashDmg: number): void {
    if (splashDmg <= 0) return;
    const splashRadius = 60;
    for (const e of ctx.enemies) {
      if (e === source || e.dead) continue;
      if (Math.hypot(e.pos.x - source.pos.x, e.pos.y - source.pos.y) <= splashRadius) {
        e.receiveDamage(splashDmg, 'fire');
      }
    }
  }

  // ─── Magic Hit Resolution ───────────────────────────────────────────────────

  private applyMagic(ctx: IGameContext, proj: ProjectileData, target: BaseEnemy): void {
    const tw = ctx.towers.find(t => t.id === proj.towerId);
    const items = ctx.items;

    // Multi-element magic
    if (proj.components && proj.components.length > 0) {
      const itemMult = this.itemSystem.getHunterMult(target, items) * this.itemSystem.getBossMult(target, items);
      let totalDealt = 0;
      const parts: string[] = [];
      for (const comp of proj.components) {
        const d = target.receiveDamage(comp.amount * itemMult, comp.element);
        totalDealt += d;
        if (d > 0) parts.push(`${Math.round(d)}${comp.element[0]}`);
      }
      if (tw) { tw.totalDamageDealt += totalDealt; if (target.dead) tw.totalKills++; }

      const elements = proj.components.map(c => c.element);
      this.applyElementEffects(ctx, proj, target, elements);
      ctx.addFT(target.pos, `✨${parts.join('+')}`, proj.color);
      return;
    }

    // Single-element magic
    const hunterMult = this.itemSystem.getHunterMult(target, items);
    const bossMult   = this.itemSystem.getBossMult(target, items);
    const itemMult   = hunterMult * bossMult;
    const c = ELEMENT_COLORS[proj.element];

    switch (proj.element) {
      case 'fire': {
        if (target.def.golemType === 'fire') { ctx.addFT(target.pos, '🔥IMUNE', '#ff6600'); break; }
        const d = target.receiveDamage(proj.damage * itemMult, 'fire');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        if (proj.burnFromMagic) target.applyBurn(cfg.combat.burnPctPerSec, cfg.combat.burnDuration);
        ctx.addFT(target.pos, `✨${Math.round(d)}`, c);
        if (this.itemSystem.hasEffect('fire_magma_trail', items)) {
          ctx.burnZones.push({ x: target.pos.x, y: target.pos.y, radius: 50, remaining: 4, dmgPerSec: proj.damage * 0.20 });
        }
        if (this.itemSystem.hasEffect('fire_aoe_splash', items)) {
          this.applyFireAoeSplash(ctx, target, d * this.itemSystem.getEffectValue('fire_aoe_splash_mult', items));
        }
        break;
      }
      case 'water': {
        const d = target.receiveDamage(proj.damage * itemMult, 'water');
        if (tw) { tw.totalDamageDealt += d; if (target.dead) tw.totalKills++; }
        const slowAmp = this.itemSystem.getWaterSlowAmp(items);
        const slowStacks = Math.round(slowAmp);
        for (let i = 0; i < slowStacks; i++) target.addPermanentSlow();
        ctx.addFT(target.pos, `💧-5%vel×${slowStacks}(${target.permanentSlowStacks})`, '#66aaff');
        if (Math.random() < ctx.talentTree.waterPuddleChance()) {
          ctx.puddles.push({ x: target.pos.x, y: target.pos.y, radius: PUDDLE_RADIUS, remaining: PUDDLE_DURATION, slowAmount: cfg.combat.puddleSlowAmount });
        }
        const freezeChance = this.itemSystem.getEffectChance('water_freeze', items);
        if (freezeChance > 0 && Math.random() < freezeChance) {
          target.stunRemaining = Math.max(target.stunRemaining, 1.2);
          ctx.addFT(target.pos, `❄ CONGELADO!`, '#aaeeff');
        }
        break;
      }
      case 'earth': {
        const aoeR = EARTH_AOE_BASE * ctx.talentTree.earthAoERadiusMult() * (1 + this.itemSystem.getEarthRadiusBonus(items));
        const targets = ctx.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= aoeR);
        for (const t of targets) {
          const tMult = this.itemSystem.getHunterMult(t, items) * this.itemSystem.getBossMult(t, items);
          const d = t.receiveDamage(proj.damage * tMult, 'earth');
          if (tw) { tw.totalDamageDealt += d; if (t.dead) tw.totalKills++; }
          ctx.addFT(t.pos, `🌍${Math.round(d)}`, c);
          if (this.itemSystem.hasEffect('earth_sandstorm', items)) {
            t.applyTempSlow(0.20, 5);
            t._sandstormAcc = { amount: 0.15, remaining: 5 };
          }
        }
        ctx.triggerAoeFlash(target.pos.x, target.pos.y, aoeR);
        break;
      }
      case 'wind': {
        const hasChain = this.itemSystem.hasEffect('wind_chain_magic', items);
        const windTargets = hasChain
          ? this.findWindChainTargets(ctx, target, 3)
          : [target];
        const windDmgMult = hasChain ? this.itemSystem.getEffectValue('wind_chain_dmg_mult', items) : 1;
        const windPushPx  = WIND_PUSH_PX + this.itemSystem.getWindPushBonus(items);
        const windStunDur = ctx.talentTree.windStunDuration() * this.itemSystem.getWindStunMult(items);

        for (const wt of windTargets) {
          const wtMult = this.itemSystem.getHunterMult(wt, items) * this.itemSystem.getBossMult(wt, items);
          const d = wt.receiveDamage(proj.damage * windDmgMult * wtMult, 'wind');
          if (tw) { tw.totalDamageDealt += d; if (wt.dead) tw.totalKills++; }
          if (wt.def.golemType !== 'wind') {
            wt.distanceTraveled = Math.max(0, wt.distanceTraveled - windPushPx);
            if (windStunDur > 0) wt.stunRemaining = Math.max(wt.stunRemaining, windStunDur);
            ctx.addFT(wt.pos, `💨-${Math.round(windPushPx / CELL_SIZE)}tiles`, '#ccee44');
          } else {
            ctx.addFT(wt.pos, `💨IMUNE`, '#ccee44');
          }
        }
        break;
      }
    }
  }

  /** Apply element-specific effects for multi-element magic hits */
  private applyElementEffects(ctx: IGameContext, proj: ProjectileData, target: BaseEnemy, elements: ElementType[]): void {
    const items = ctx.items;

    if (elements.includes('fire') && proj.burnFromMagic) {
      target.applyBurn(cfg.combat.burnPctPerSec, cfg.combat.burnDuration);
    }
    if (elements.includes('fire') && this.itemSystem.hasEffect('fire_magma_trail', items)) {
      ctx.burnZones.push({ x: target.pos.x, y: target.pos.y, radius: 50, remaining: 4, dmgPerSec: proj.damage * 0.20 });
    }
    if (elements.includes('fire') && this.itemSystem.hasEffect('fire_aoe_splash', items)) {
      const splashMult = this.itemSystem.getEffectValue('fire_aoe_splash_mult', items);
      this.applyFireAoeSplash(ctx, target, proj.damage * splashMult);
    }
    if (elements.includes('water')) {
      const slowAmp = Math.round(this.itemSystem.getWaterSlowAmp(items));
      for (let i = 0; i < slowAmp; i++) target.addPermanentSlow();
      if (Math.random() < ctx.talentTree.waterPuddleChance()) {
        ctx.puddles.push({ x: target.pos.x, y: target.pos.y, radius: PUDDLE_RADIUS, remaining: PUDDLE_DURATION, slowAmount: cfg.combat.puddleSlowAmount });
      }
      const freezeChance = this.itemSystem.getEffectChance('water_freeze', items);
      if (freezeChance > 0 && Math.random() < freezeChance) {
        target.stunRemaining = Math.max(target.stunRemaining, 1.2);
      }
    }
    if (elements.includes('wind') && target.def.golemType !== 'wind') {
      const windPushPx = (WIND_PUSH_PX * 0.5) + (this.itemSystem.getWindPushBonus(items) * 0.5);
      target.distanceTraveled = Math.max(0, target.distanceTraveled - windPushPx);
    }
  }

  private findWindChainTargets(ctx: IGameContext, primary: BaseEnemy, maxCount: number): BaseEnemy[] {
    const results: BaseEnemy[] = [primary];
    const towerRange = 200;
    const others = ctx.enemies
      .filter(e => !e.dead && e !== primary && !e.reachedEnd)
      .sort((a, b) => {
        const da = Math.abs(a.pos.y - primary.pos.y) + Math.abs(a.pos.x - primary.pos.x) * 0.3;
        const db = Math.abs(b.pos.y - primary.pos.y) + Math.abs(b.pos.x - primary.pos.x) * 0.3;
        return da - db;
      });
    for (const e of others) {
      if (results.length >= maxCount) break;
      if (Math.hypot(e.pos.x - primary.pos.x, e.pos.y - primary.pos.y) <= towerRange) {
        results.push(e);
      }
    }
    return results;
  }

  // ─── Synergy ────────────────────────────────────────────────────────────────

  getSynergyBonus(tower: BaseTower, ctx: IGameContext): number {
    const here = ctx.towers.filter(t => t.gridX === tower.gridX && t.gridY === tower.gridY);
    if (here.length < 2) return 0;
    const MAX_TOWER_LEVEL = 10; // from config
    const minLevel = Math.min(...here.map(t => t.level));
    if (minLevel >= MAX_TOWER_LEVEL + 1) return 0.30;
    if (minLevel >= 8) return 0.20;
    if (minLevel >= 5) return 0.15;
    return 0.10;
  }
}
