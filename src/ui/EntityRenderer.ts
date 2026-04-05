import type { BaseTower as Tower } from '../entities/BaseTower';
import type { BaseEnemy as Enemy } from '../entities/BaseEnemy';
import { CELL_SIZE, ELEMENT_COLORS, ELEMENT_ICONS } from '../constants';
import { getEnemyRenderProfile, defaultDrawFn } from './EnemyRenderProfile';

export class EntityRenderer {

  drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
    const x = tower.pixelX, y = tower.pixelY, r = CELL_SIZE / 2 - 5;
    const col = ELEMENT_COLORS[tower.def.element];

    // Fusion aura
    if (tower.fusionDef) {
      const pulse = 0.4 + 0.6 * Math.sin(Date.now() / 300);
      ctx.beginPath(); ctx.arc(x, y, r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = tower.fusionDef.color + Math.round(pulse * 200).toString(16).padStart(2, '0');
      ctx.lineWidth = 4;
      ctx.shadowColor = tower.fusionDef.color; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    }

    // Dual magic aura
    if (tower.dualMagic) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 220);
      ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,80,${pulse * 0.9})`; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffff44'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.fillStyle = tower.def.color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tower.def.accentColor; ctx.lineWidth = 2; ctx.stroke();

    // Element symbol / Fusion symbol
    ctx.fillStyle = col; ctx.font = '10px serif'; ctx.textAlign = 'center';
    if (tower.fusionDef) {
      ctx.fillText(tower.fusionDef.icon, x, y + 4);
    } else {
      ctx.fillText(ELEMENT_ICONS[tower.def.element], x, y + 4);
    }

    // Cooldown arc
    if (tower.cooldown > 0) {
      const prog = tower.cooldown / (1 / tower.def.baseFireRate);
      ctx.beginPath(); ctx.arc(x, y, r + 2, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Magic bar arc (colored outer ring)
    if (tower.magicBar > 0) {
      const ratio = tower.magicBarRatio();
      ctx.beginPath(); ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.shadowColor = col; ctx.shadowBlur = ratio >= 1 ? 14 : 4; ctx.stroke(); ctx.shadowBlur = 0;
    }

    // Level badge (only show if level > 1)
    if (tower.level > 1) {
      const bx = x + r - 3, by = y - r + 3;
      const isMax = tower.isMaxLevel;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = isMax ? '#ffcc00' : '#223355'; ctx.fill();
      ctx.strokeStyle = isMax ? '#ffffff' : '#aaddff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = isMax ? '#000' : '#ffffff';
      ctx.font = `bold 7px Segoe UI`; ctx.textAlign = 'center';
      ctx.fillText(isMax ? '★' : `${tower.level}`, bx, by + 2.5);
    }

    // Disabled overlay (disabler enemy aura)
    if (tower.isDisabled) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(Date.now() / 200);
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // Crossed-out icon
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
      ctx.stroke();
      ctx.fillStyle = '#ff6666'; ctx.font = 'bold 7px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('🚫', x, y - r - 6);
      ctx.restore();
    }
  }

  drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const { x, y } = enemy.pos, r = enemy.def.size;

    // Disabler aura radius visualization
    if (enemy.def.disablerElement && !enemy.dead) {
      const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 400);
      const ec = ELEMENT_COLORS[enemy.def.disablerElement];
      ctx.beginPath(); ctx.arc(x, y, 120, 0, Math.PI * 2);
      ctx.fillStyle = ec + Math.round(pulse * 25).toString(16).padStart(2, '0');
      ctx.fill();
      ctx.strokeStyle = ec + '44';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y + r, r * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Boss glow
    if (enemy.def.isBoss) {
      const p = 0.5 + 0.5 * Math.sin(Date.now() / 280);
      ctx.beginPath(); ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,200,${p * 0.7})`; ctx.lineWidth = 5; ctx.stroke();
    }

    // Boss shield phase (purple ring)
    if (enemy.shieldActive) {
      const p = 0.5 + 0.5 * Math.sin(Date.now() / 150);
      ctx.beginPath(); ctx.arc(x, y, r + 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160,80,255,${p * 0.9})`; ctx.lineWidth = 4; ctx.setLineDash([6, 3]); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('🛡 IMUNE', x, y - r - 22);
    }

    // Stun ring
    if (enemy.stunRemaining > 0) {
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffaa88'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw shape via render profile (fallback chain: renderProfileId → id → base type → default)
    const profileId = enemy.def.renderProfileId ?? enemy.def.id;
    const baseId = profileId.replace(/_[^_]+$/, '');  // golem_fire → golem
    const drawFn = getEnemyRenderProfile(profileId)
      ?? (baseId !== profileId ? getEnemyRenderProfile(baseId) : undefined)
      ?? defaultDrawFn;
    drawFn(ctx, x, y, r, enemy.def.color, !!enemy.def.isBoss);

    // Anchor: damage reduction ring (earth-tone) ─────────────────────────────
    if (enemy.tempDamageReduction > 0.05) {
      const alpha = Math.min(0.8, enemy.tempDamageReduction * 2.5);
      ctx.strokeStyle = `rgba(160,120,60,${alpha})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Anchor: speed boost streaks (wind-tone) ─────────────────────────────────
    if (enemy.tempSpeedBoost > 1.05) {
      const alpha = Math.min(0.75, (enemy.tempSpeedBoost - 1) * 3);
      ctx.strokeStyle = `rgba(180,255,100,${alpha})`;
      ctx.lineWidth = 2;
      // Three short trailing arcs suggesting motion
      for (let i = 0; i < 3; i++) {
        const startAng = Math.PI * 0.55 + i * Math.PI * 0.3;
        ctx.beginPath(); ctx.arc(x, y, r + 4 + i, startAng, startAng + Math.PI * 0.2);
        ctx.stroke();
      }
    }

    // Slow ring (temp)
    if (enemy.effects.find(e => e.type === 'slow')) {
      ctx.strokeStyle = '#88ddff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
    }

    // Permanent slow dots
    const stacks = Math.min(enemy.permanentSlowStacks, 8);
    for (let i = 0; i < stacks; i++) {
      const ang = (i / stacks) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(ang) * (r + 7), y + Math.sin(ang) * (r + 7), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#44aaff'; ctx.fill();
    }

    // Burn particle
    if (enemy.effects.find(e => e.type === 'burn')) {
      ctx.fillStyle = '#ff660099';
      ctx.beginPath(); ctx.arc(x, y - r - 5, 4, 0, Math.PI * 2); ctx.fill();
    }

    // HP bar
    const bw = r * 2.8, bh = 5, bx = x - bw / 2, by = y - r - 13;
    ctx.fillStyle = '#330000'; ctx.fillRect(bx, by, bw, bh);
    const hpr = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpr > 0.6 ? '#44cc44' : hpr > 0.3 ? '#ddcc22' : '#cc3333';
    ctx.fillRect(bx, by, bw * hpr, bh);

    if (enemy.def.isBoss) {
      ctx.fillStyle = '#ff88ff'; ctx.font = 'bold 9px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('BOSS', x, by - 3);
    }

    // Weakness / immunity icons above HP bar
    const iconY = by - 11;
    const iconS = 8;
    ctx.font = `${iconS}px serif`;
    ctx.textAlign = 'center';
    if (enemy.def.immune) {
      ctx.fillStyle = '#666';
      ctx.fillText(ELEMENT_ICONS[enemy.def.immune], x - iconS, iconY);
      ctx.fillStyle = '#ff4444aa';
      ctx.font = '6px serif';
      ctx.fillText('✕', x - iconS + 5, iconY - 2);
      ctx.font = `${iconS}px serif`;
    }
    const weak = enemy.weakElement();
    ctx.fillStyle = ELEMENT_COLORS[weak];
    ctx.fillText(ELEMENT_ICONS[weak], x + iconS, iconY);
  }

}
