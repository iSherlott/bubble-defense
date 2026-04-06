import type { FusionBehavior } from './types';
import type { IGameContext } from '../core/GameContext';
import type { BaseTower } from '../entities/BaseTower';
import type { ProjectileData, FusionDef, DamageComponent } from '../types';
import { FusionTower } from '../entities/towers/FusionTower';
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

function isLate(tower: BaseTower): boolean {
  return tower instanceof FusionTower && tower.fusionTier === 'late';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1) MAGMA (earth+fire) — fissure zone with persistent lava pools
// ═══════════════════════════════════════════════════════════════════════════════

export class MagmaFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.6, element: fusion.primaryElement,
        color: fusion.color, isMagic: true, burnFromMagic: true,
        components,
      }));
    }

    const zoneRadius = tower.getRange() * (late ? 0.5 : 0.35);
    ctx.burnZones.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: zoneRadius, remaining: late ? 5 : 3.5,
      dmgPerSec: baseDmg * (late ? 0.2 : 0.12),
    });

    ctx.animations.request({
      id: 'fusion_magma',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.2 : 1.0,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2) FIREBALL (fire+earth) — explosive artillery with shrapnel
// ═══════════════════════════════════════════════════════════════════════════════

export class FireballFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    const ccBonus = (primary.stunRemaining > 0 || primary.permanentSlowStacks > 0) ? 1.3 : 1.0;
    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: primary.id, damage: baseDmg * ccBonus, element: fusion.primaryElement,
      color: fusion.color, isMagic: true, burnFromMagic: true,
      components,
    }));

    const shrapnelCount = late ? 4 : 2;
    const shrapnelDmg = baseDmg * (late ? 0.45 : 0.35);
    for (const t of targets.slice(1, 1 + shrapnelCount)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: primary.pos.x, startY: primary.pos.y,
        targetEnemyId: t.id, damage: shrapnelDmg, element: fusion.secondaryElement,
        color: '#cc5500', isMagic: true,
      }));
    }

    ctx.animations.request({
      id: 'fusion_fireball',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3) SWAMP (earth+water) — decay zone with vulnerability debuff
// ═══════════════════════════════════════════════════════════════════════════════

export class SwampFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.5, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components,
      }));
      t.addPermanentSlow();
      if (late) t.addPermanentSlow();
    }

    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: PUDDLE_RADIUS * (late ? 2.0 : 1.5),
      remaining: PUDDLE_DURATION * (late ? 2.0 : 1.5),
      slowAmount: cfg.combat.puddleSlowAmount * (late ? 2.5 : 2),
    });

    ctx.animations.request({
      id: 'fusion_swamp',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.4 : 1.2,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4) MUD (water+earth) — heavy anti-rush slow wall
// ═══════════════════════════════════════════════════════════════════════════════

export class MudFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    const slowStacks = late ? 4 : 3;
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.35, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components,
      }));
      for (let i = 0; i < slowStacks; i++) t.addPermanentSlow();
    }

    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: PUDDLE_RADIUS * (late ? 2.0 : 1.5),
      remaining: PUDDLE_DURATION * (late ? 2.0 : 1.5),
      slowAmount: cfg.combat.puddleSlowAmount * (late ? 3 : 2.5),
    });

    ctx.animations.request({
      id: 'fusion_mud',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5) SANDSTORM (earth+wind) — abrasive multi-hit erosion zone
// ═══════════════════════════════════════════════════════════════════════════════

export class SandstormFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const hitCount = late ? 4 : 3;
    const perHitDmg = baseDmg * 0.3;

    for (const t of targets) {
      for (let h = 0; h < hitCount; h++) {
        extra.push(createProjectile({
          towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
          targetEnemyId: t.id, damage: perHitDmg, element: fusion.primaryElement,
          color: fusion.color, isMagic: true,
        }));
      }
      t.addPermanentSlow();
    }

    ctx.animations.request({
      id: 'fusion_sandstorm',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.1 : 0.9,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6) TORNADO (wind+earth) — mobile rotational multi-hit
// ═══════════════════════════════════════════════════════════════════════════════

export class TornadoFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.7, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components,
      }));
      if (t.def.golemType !== 'wind') {
        t.applyPush(WIND_PUSH_PX * (late ? 1.0 : 0.6));
      }
      t.addPermanentSlow();
      if (late) t.stunRemaining = Math.max(t.stunRemaining, 0.4);
    }

    ctx.animations.request({
      id: 'fusion_tornado',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.2 : 1.0,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  7) STEAM (fire+water) — debuff amplifier cloud
// ═══════════════════════════════════════════════════════════════════════════════

export class SteamFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);
    const maxTargets = late ? 5 : 3;

    for (const t of targets.slice(0, maxTargets)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.6, element: fusion.primaryElement,
        color: fusion.color, isMagic: true, burnFromMagic: true,
        components,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, late ? 1.2 : 0.8);
    }

    ctx.animations.request({
      id: 'fusion_steam',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.1 : 0.9,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  8) GEYSER (water+fire) — vertical eruption burst with stun
// ═══════════════════════════════════════════════════════════════════════════════

export class GeyserFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);
    const hitCount = late ? 4 : 3;

    for (const t of targets.slice(0, hitCount)) {
      extra.push(createProjectile({
        towerId: tower.id, startX: primary.pos.x, startY: primary.pos.y,
        targetEnemyId: t.id, damage: baseDmg * 0.8, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, late ? 2.0 : 1.5);
    }

    ctx.animations.request({
      id: 'fusion_geyser',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 0.8 : 0.7,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  9) INFERNO (fire+wind) — combustion focus + execute detonation
// ═══════════════════════════════════════════════════════════════════════════════

export class InfernoFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);

    const hpRatio = primary.hp / primary.maxHp;
    const executeBonus = hpRatio < 0.3 ? 1.5 : hpRatio < 0.5 ? 1.25 : 1.0;
    const totalDmg = baseDmg * executeBonus;

    extra.push(createProjectile({
      towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: primary.id, damage: totalDmg, element: 'fire',
      color: fusion.color, isMagic: true, burnFromMagic: true,
      components: makeDualComponents(fusion, totalDmg),
    }));

    if (late && targets.length > 1) {
      extra.push(createProjectile({
        towerId: tower.id, startX: primary.pos.x, startY: primary.pos.y,
        targetEnemyId: targets[1].id, damage: baseDmg * 0.4, element: 'fire',
        color: '#ff3300', isMagic: true, burnFromMagic: true,
      }));
    }

    ctx.animations.request({
      id: 'fusion_inferno',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  10) LIGHTNING (wind+fire) — chain discharge between targets
// ═══════════════════════════════════════════════════════════════════════════════

export class LightningFusionBehavior implements FusionBehavior {
  constructor(private maxTargets = 5) {}

  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const late = isLate(tower);
    const chainCount = late ? this.maxTargets + 2 : this.maxTargets;
    const chainTargets = targets.slice(0, chainCount);
    const components = makeDualComponents(fusion, baseDmg);

    let currentDmg = baseDmg;
    for (let i = 0; i < chainTargets.length; i++) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: chainTargets[i].id, damage: currentDmg, element: 'wind',
        color: fusion.color, isMagic: true,
        components: i === 0 ? components : undefined,
      }));
      currentDmg *= (late ? 0.85 : 0.8);
    }

    const chainPositions = chainTargets.slice(1).map(t => [t.pos.x, t.pos.y]);
    ctx.animations.request({
      id: 'fusion_lightning',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: chainTargets[0].pos.x, targetY: chainTargets[0].pos.y,
      radius: tower.getRange(), color: fusion.color,
      payload: { late, chainTargets: chainPositions },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  11) BLIZZARD (water+wind) — sweeping ice front with progressive freeze
// ═══════════════════════════════════════════════════════════════════════════════

export class BlizzardFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);

    for (const t of targets) {
      const slowBonus = t.permanentSlowStacks > 0 ? 1.2 : 1.0;
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.7 * slowBonus, element: 'water',
        color: fusion.color, isMagic: true,
        components,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, late ? 1.2 : 0.8);
      t.addPermanentSlow();
      if (late) t.addPermanentSlow();
    }

    ctx.animations.request({
      id: 'fusion_blizzard',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.0 : 0.85,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  12) TSUNAMI (wind+water) — wave push + residual slow
// ═══════════════════════════════════════════════════════════════════════════════

export class TsunamiFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);
    const components = makeDualComponents(fusion, baseDmg);
    const pushPx = WIND_PUSH_PX * (late ? 2.5 : 2);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.5, element: 'wind',
        color: fusion.color, isMagic: true,
        components,
      }));
      if (t.def.golemType !== 'wind') {
        const wetBonus = t.permanentSlowStacks > 0 ? 1.3 : 1.0;
        t.applyPush(pushPx * wetBonus);
      }
      t.addPermanentSlow();
    }

    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: PUDDLE_RADIUS * (late ? 1.5 : 1.2),
      remaining: PUDDLE_DURATION * (late ? 1.5 : 1.0),
      slowAmount: cfg.combat.puddleSlowAmount * 1.5,
    });

    ctx.animations.request({
      id: 'fusion_tsunami',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  13) SOLAR CORE (fire+fire) — apex pulsing sun siege
// ═══════════════════════════════════════════════════════════════════════════════

export class SolarCoreFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.8, element: 'fire',
        color: fusion.color, isMagic: true, burnFromMagic: true,
      }));
    }

    ctx.burnZones.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: tower.getRange() * (late ? 0.55 : 0.4),
      remaining: late ? 7 : 5,
      dmgPerSec: baseDmg * (late ? 0.2 : 0.15),
    });

    ctx.animations.request({
      id: 'fusion_solar_core',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.4 : 1.2,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  14) ABYSSAL VORTEX (water+water) — apex choke control vortex
// ═══════════════════════════════════════════════════════════════════════════════

export class AbyssalVortexFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    const primary = targets[0];
    const late = isLate(tower);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.6, element: 'water',
        color: fusion.color, isMagic: true,
      }));
      t.addPermanentSlow(); t.addPermanentSlow(); t.addPermanentSlow();
      if (t.permanentSlowStacks >= 3) {
        t.stunRemaining = Math.max(t.stunRemaining, late ? 1.5 : 1.0);
      }
    }

    ctx.puddles.push({
      x: primary.pos.x, y: primary.pos.y,
      radius: tower.getRange() * (late ? 0.6 : 0.5),
      remaining: late ? 10 : 8,
      slowAmount: 0.15,
    });

    ctx.animations.request({
      id: 'fusion_abyssal_vortex',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: primary.pos.x, targetY: primary.pos.y,
      radius: tower.getRange(), color: fusion.color,
      duration: late ? 1.3 : 1.1,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  15) PRIMAL QUAKE (earth+earth) — apex screen-wide seismic event
// ═══════════════════════════════════════════════════════════════════════════════

export class PrimalQuakeFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const allEnemies = ctx.enemies.filter(e => !e.dead && !e.reachedEnd);
    const late = isLate(tower);

    const perTargetDmg = baseDmg * (late ? 0.55 : 0.45);
    for (const t of allEnemies) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: perTargetDmg, element: 'earth',
        color: fusion.color, isMagic: true,
      }));
      t.stunRemaining = Math.max(t.stunRemaining, late ? 0.8 : 0.5);
    }

    const shockCount = late ? 3 : 2;
    const shuffled = [...allEnemies].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(shockCount, shuffled.length); i++) {
      ctx.burnZones.push({
        x: shuffled[i].pos.x, y: shuffled[i].pos.y,
        radius: CELL_SIZE * 1.5, remaining: late ? 3 : 2,
        dmgPerSec: baseDmg * 0.08,
      });
    }

    ctx.animations.request({
      id: 'fusion_primal_quake',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: ctx.map.gameWidth / 2, targetY: ctx.map.gameHeight / 2,
      radius: Math.max(ctx.map.gameWidth, ctx.map.gameHeight),
      color: fusion.color,
      payload: { late },
    });

    ctx.addFT(
      { x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 },
      `🌋 TERREMOTO PRIMORDIAL!`, fusion.color,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  16) ETERNAL HURRICANE (wind+wind) — apex field control
// ═══════════════════════════════════════════════════════════════════════════════

export class EternalHurricaneFusionBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const extRange = 1.5;
    const targets = tower.findAllInRange(ctx.enemies, extRange);
    if (targets.length === 0) return;
    const late = isLate(tower);
    const pushPx = WIND_PUSH_PX * (late ? 3.5 : 3);

    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id, startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id, damage: baseDmg * 0.7, element: 'wind',
        color: fusion.color, isMagic: true,
      }));
      if (t.def.golemType !== 'wind') {
        t.applyPush(pushPx);
        t.stunRemaining = Math.max(t.stunRemaining, late ? 1.8 : 1.5);
      }
      t.addPermanentSlow();
    }

    ctx.animations.request({
      id: 'fusion_eternal_hurricane',
      sourceX: tower.pixelX, sourceY: tower.pixelY,
      targetX: tower.pixelX, targetY: tower.pixelY,
      radius: tower.getRange(extRange), color: fusion.color,
      duration: late ? 1.2 : 1.0,
      payload: { late },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Default Fallback
// ═══════════════════════════════════════════════════════════════════════════════

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
