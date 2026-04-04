// ─── Register Enemy Render Profiles ──────────────────────────────────────────
// Moved from EntityRenderer's private methods into data-driven registry.

import { registerEnemyRenderProfile } from '../ui/EnemyRenderProfile';

export function registerEnemyRenderProfiles(): void {
  registerEnemyRenderProfile('goblin', (ctx, x, y, r, color, isBoss) => {
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
  });

  registerEnemyRenderProfile('troll', (ctx, x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccaa44';
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.7); ctx.lineTo(x - r * 0.55, y - r * 1.3); ctx.lineTo(x - r * 0.2, y - r * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.7); ctx.lineTo(x + r * 0.55, y - r * 1.3); ctx.lineTo(x + r * 0.2, y - r * 0.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2200';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
  });

  registerEnemyRenderProfile('harpy', (ctx, x, y, r, color) => {
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
  });

  registerEnemyRenderProfile('golem', (ctx, x, y, r, color) => {
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
  });

  registerEnemyRenderProfile('dragon', (ctx, x, y, r, color, isBoss) => {
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
  });
}
