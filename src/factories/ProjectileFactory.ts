import type { ProjectileData, ElementType, DamageComponent } from '../types';
import type { BaseEnemy } from '../entities/BaseEnemy';

let _nextProjId = 1;
export function resetProjectileIds() { _nextProjId = 1; }

export function createProjectile(opts: {
  towerId: number;
  startX: number;
  startY: number;
  targetEnemyId: number;
  damage: number;
  element: ElementType;
  color: string;
  isMagic?: boolean;
  isCrit?: boolean;
  isMiss?: boolean;
  burnFromMagic?: boolean;
  components?: DamageComponent[];
}): ProjectileData {
  return {
    id: _nextProjId++,
    x: opts.startX,
    y: opts.startY,
    targetEnemyId: opts.targetEnemyId,
    speed: opts.isMagic ? 330 : 450,
    damage: opts.damage,
    element: opts.element,
    components: opts.components,
    towerId: opts.towerId,
    color: opts.color,
    dead: false,
    isMagic:        opts.isMagic       ?? false,
    isCrit:         opts.isCrit        ?? false,
    isMiss:         opts.isMiss        ?? false,
    burnFromMagic:  opts.burnFromMagic ?? false,
  };
}

export function updateProjectile(
  proj: ProjectileData,
  enemies: BaseEnemy[],
  dt: number,
): { hit: boolean; enemy: BaseEnemy | null } {
  if (proj.dead) return { hit: false, enemy: null };

  const target = enemies.find(e => e.id === proj.targetEnemyId && !e.dead);
  if (!target) { proj.dead = true; return { hit: false, enemy: null }; }

  const dx = target.pos.x - proj.x, dy = target.pos.y - proj.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < proj.speed * dt + 6) {
    proj.dead = true;
    return { hit: true, enemy: target };
  }

  proj.x += (dx / dist) * proj.speed * dt;
  proj.y += (dy / dist) * proj.speed * dt;
  return { hit: false, enemy: null };
}
