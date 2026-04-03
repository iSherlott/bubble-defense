import type { BaseTower as Tower } from '../entities/BaseTower';
import type { BaseEnemy as Enemy } from '../entities/BaseEnemy';
import { CELL_SIZE, ELEMENT_COLORS, ELEMENT_ICONS } from '../constants';

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
      ctx.fillText(tower.def.element === 'fire' ? '🔥' : tower.def.element === 'water' ? '💧' : tower.def.element === 'earth' ? '🌍' : '💨', x, y + 4);
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
  }

  drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const { x, y } = enemy.pos, r = enemy.def.size;

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

    // Draw unique shape per enemy type
    const type = enemy.def.id;
    if (type === 'goblin' || type === 'boss_goblin_king') {
      this.drawGoblin(ctx, x, y, r, enemy.def.color, enemy.def.isBoss);
    } else if (type === 'troll') {
      this.drawTroll(ctx, x, y, r, enemy.def.color);
    } else if (type === 'harpy') {
      this.drawHarpy(ctx, x, y, r, enemy.def.color);
    } else if (type === 'golem') {
      this.drawGolem(ctx, x, y, r, enemy.def.color);
    } else {
      this.drawDragon(ctx, x, y, r, enemy.def.color, !!enemy.def.isBoss);
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

  private drawGoblin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, isBoss?: boolean) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = isBoss ? '#ffdd22' : '#22aa22';
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.4); ctx.lineTo(x - r, y - r * 0.9); ctx.lineTo(x - r * 0.1, y - r * 0.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.4); ctx.lineTo(x + r, y - r * 0.9); ctx.lineTo(x + r * 0.1, y - r * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
  }

  private drawTroll(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccaa44';
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.7); ctx.lineTo(x - r * 0.55, y - r * 1.3); ctx.lineTo(x - r * 0.2, y - r * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.7); ctx.lineTo(x + r * 0.55, y - r * 1.3); ctx.lineTo(x + r * 0.2, y - r * 0.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2200';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
  }

  private drawHarpy(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color + 'aa';
    ctx.beginPath(); ctx.ellipse(x - r * 1.0, y, r * 0.7, r * 0.4, Math.PI / 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 1.0, y, r * 0.7, r * 0.4, -Math.PI / 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6600cc';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  private drawGolem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x - r * 0.85, y - r, r * 1.7, r * 2);
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1;
    ctx.strokeRect(x - r * 0.85, y - r, r * 1.7, r * 2);
    ctx.beginPath(); ctx.moveTo(x - r * 0.85, y); ctx.lineTo(x + r * 0.85, y); ctx.stroke();
    ctx.fillStyle = '#8888ff';
    ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawDragon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, isBoss: boolean) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color + '88';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.3); ctx.bezierCurveTo(x - r * 1.5, y - r * 1.5, x - r * 2, y, x - r * 0.8, y + r * 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.3); ctx.bezierCurveTo(x + r * 1.5, y - r * 1.5, x + r * 2, y, x + r * 0.8, y + r * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = isBoss ? '#ff8800' : '#ffcc00';
    for (let i = 0; i < 4; i++) {
      const sx = x - r * 0.5 + i * r * 0.33, sy = y - r * 0.6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - r * 0.1, sy - r * (0.3 + i * 0.05)); ctx.lineTo(sx + r * 0.1, sy - r * (0.15 + i * 0.03)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    if (isBoss) {
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
