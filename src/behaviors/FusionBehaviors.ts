import type { FusionBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData, FusionDef, DamageComponent } from '../types';
import { createProjectile } from '../factories/ProjectileFactory';
import { CELL_SIZE } from '../constants';
import { GameConfig } from '../config';

const cfg = GameConfig.get();
const PUDDLE_RADIUS  = cfg.combat.puddleRadius;
const PUDDLE_DURATION = cfg.combat.puddleDuration;
const WIND_PUSH_PX   = cfg.combat.windPushCells * CELL_SIZE;

function makeDualComponents(fusion: FusionDef, baseDmg: number): DamageComponent[] {
  return [
    { element: fusion.primaryElement, amount: baseDmg * 0.6 },
    { element: fusion.secondaryElement, amount: baseDmg * 0.4 },
  ];
}

// ─── AoE Fusions: magma_pool, fireball_aoe, sandstorm, tornado ──────────────

export class AoeFusionBehavior implements FusionBehavior {
  constructor(private burnOnHit = false) {}

  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        burnFromMagic: this.burnOnHit,
        components: dualComponents,
      }));
    }
    ctx.triggerAoeFlash(targets[0].pos.x, targets[0].pos.y, tower.getRange() * 0.6);
  }
}

// ─── Inferno: single target massive burn ─────────────────────────────────────

export class InfernoFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: targets[0].id, damage: baseDmg, element: 'fire',
      color: fusion.color, isMagic: true, burnFromMagic: true,
      components: makeDualComponents(fusion, baseDmg),
    }));
  }
}

// ─── Steam / Geyser: hit + stun ─────────────────────────────────────────────

export class StunFusionBehavior implements FusionBehavior {
  constructor(private maxTargets = 3, private stunDuration = 1.5) {}

  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets.slice(0, this.maxTargets)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components: dualComponents,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, this.stunDuration);
    }
  }
}

// ─── Swamp / Mud: AoE slow + damage + puddle ────────────────────────────────

export class SlowPuddleFusionBehavior implements FusionBehavior {
  constructor(private slowStacks = 2) {}

  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components: dualComponents,
      }));
      for (let i = 0; i < this.slowStacks; i++) t.addPermanentSlow();
    }
    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: PUDDLE_RADIUS * 1.5, remaining: PUDDLE_DURATION * 1.5,
      slowAmount: cfg.combat.puddleSlowAmount * 2,
    });
  }
}

// ─── Blizzard: AoE freeze (stun + slow) ─────────────────────────────────────

export class BlizzardFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'water',
        color: fusion.color, isMagic: true,
        components: dualComponents,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, 1.0);
      t.addPermanentSlow();
    }
    ctx.triggerAoeFlash(primary.pos.x, primary.pos.y, tower.getRange() * 0.5);
  }
}

// ─── Lightning: chain hits up to 5 targets ───────────────────────────────────

export class LightningFusionBehavior implements FusionBehavior {
  constructor(private maxTargets = 5) {}

  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets.slice(0, this.maxTargets)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'wind',
        color: fusion.color, isMagic: true,
        components: dualComponents,
      }));
    }
  }
}

// ─── Tsunami: push all enemies + damage ──────────────────────────────────────

export class TsunamiFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const dualComponents = makeDualComponents(fusion, baseDmg);
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'wind',
        color: fusion.color, isMagic: true,
        components: dualComponents,
      }));
      if (t.def.golemType !== 'wind') {
        t.distanceTraveled = Math.max(0, t.distanceTraveled - WIND_PUSH_PX * 2);
      }
    }
  }
}

// ─── Solar Core (fire+fire): massive AoE + persistent burn zone ──────────────

export class SolarCoreFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'fire',
        color: fusion.color, isMagic: true, burnFromMagic: true,
      }));
    }
    ctx.burnZones.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: tower.getRange() * 0.5, remaining: 6, dmgPerSec: baseDmg * 0.15,
    });
    ctx.triggerAoeFlash(primary.pos.x, primary.pos.y, tower.getRange() * 0.7);
  }
}

// ─── Abyssal Vortex (water+water): AoE stun + 3 slows + puddle ──────────────

export class AbyssalVortexFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'water',
        color: fusion.color, isMagic: true,
      }));
      t.addPermanentSlow(); t.addPermanentSlow(); t.addPermanentSlow();
      t.stunRemaining = Math.max(t.stunRemaining, 1.0);
    }
    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: tower.getRange() * 0.6, remaining: 10, slowAmount: 0.15,
    });
    ctx.triggerAoeFlash(primary.pos.x, primary.pos.y, tower.getRange() * 0.6);
  }
}

// ─── Primal Quake (earth+earth): screen-wide tremor ──────────────────────────

export class PrimalQuakeFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const allEnemies = ctx.enemies.filter(e => !e.dead && !e.reachedEnd);
    for (const t of allEnemies) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.6, element: 'earth',
        color: fusion.color, isMagic: true,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, 0.5);
    }
    ctx.triggerAoeFlash(
      ctx.map.gameWidth / 2, ctx.map.gameHeight / 2,
      Math.max(ctx.map.gameWidth, ctx.map.gameHeight),
    );
    ctx.addFT(
      { x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 },
      `☀ TERREMOTO PRIMORDIAL!`, fusion.color,
    );
  }
}

// ─── Eternal Hurricane (wind+wind): 1.5× range + 3-tile push + stun ─────────

export class EternalHurricaneFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const extRange = 1.5;
    const targets = tower.findAllInRange(ctx.enemies, extRange);
    if (targets.length === 0) return;
    const pushPx = WIND_PUSH_PX * 3;
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg, element: 'wind',
        color: fusion.color, isMagic: true,
      }));
      if (t.def.golemType !== 'wind') {
        t.distanceTraveled = Math.max(CELL_SIZE, t.distanceTraveled - pushPx);
        t.stunRemaining = Math.max(t.stunRemaining, 1.5);
      }
    }
    ctx.triggerAoeFlash(tower.pixelX, tower.pixelY, tower.getRange(extRange));
  }
}

// ─── Default Fallback ────────────────────────────────────────────────────────

export class DefaultFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: targets[0].id, damage: baseDmg, element: fusion.primaryElement,
      color: fusion.color, isMagic: true,
      components: makeDualComponents(fusion, baseDmg),
    }));
  }
}
