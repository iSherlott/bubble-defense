import type { MapData } from '../../game/MapGenerator';
import type { GameRenderState } from '../GameRenderer';
import { CELL_SIZE } from '../../constants';
import { ELEMENT_COLORS } from '../../constants';
import { towerRegistry } from '../../registries';
import type { EntityRenderer } from '../EntityRenderer';

interface AoeFlash { x: number; y: number; r: number; life: number; }

export class BoardRenderer {
  aoeFlashes: AoeFlash[] = [];

  triggerAoe(x: number, y: number, r: number) {
    this.aoeFlashes.push({ x, y, r, life: 0.35 });
  }

  render(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    gw: number,
    gh: number,
    state: GameRenderState,
    entityRenderer: EntityRenderer,
  ) {
    const g = state.game;
    const { waypoints, pathCells, cols, rows } = map;

    // Grid bg
    ctx.fillStyle = '#111118'; ctx.fillRect(0, 0, gw, gh);
    ctx.strokeStyle = '#1a1a28'; ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, gh); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(gw, r * CELL_SIZE); ctx.stroke();
    }

    // Path cells
    ctx.fillStyle = '#1f1a0f';
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++)
        if (pathCells.has(`${c},${r}`)) ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Path line
    ctx.strokeStyle = '#554422'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    waypoints.forEach((wp, i) => i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y));
    ctx.stroke();

    // Arrows
    ctx.fillStyle = '#776644';
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1], b = waypoints[i];
      const ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Puddles
    for (const p of g.puddles) {
      const a = Math.min(1, p.remaining / 2) * 0.4;
      ctx.fillStyle = `rgba(40,120,255,${a})`;
      ctx.strokeStyle = `rgba(80,180,255,${a + 0.2})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // AoE flashes
    for (const f of this.aoeFlashes) {
      const a = (f.life / 0.35) * 0.4;
      ctx.fillStyle = `rgba(150,220,80,${a})`; ctx.strokeStyle = `rgba(180,255,100,${a + 0.2})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Hover highlight
    if (g.hoveredCell && g.hoveredCell.x < cols && g.hoveredCell.y < rows) {
      const hc = g.hoveredCell;
      const isMoving = !!g.movingTower;
      const blocked = pathCells.has(`${hc.x},${hc.y}`) || (!isMoving && state.towersAt(hc.x, hc.y).length >= 2);
      ctx.fillStyle = isMoving ? 'rgba(100,200,255,0.12)' : blocked ? 'rgba(255,50,50,0.10)' : 'rgba(100,255,100,0.10)';
      ctx.strokeStyle = isMoving ? 'rgba(100,200,255,0.6)' : blocked ? 'rgba(255,50,50,0.5)' : 'rgba(100,255,100,0.5)';
      ctx.lineWidth = 1;
      ctx.fillRect(hc.x * CELL_SIZE, hc.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeRect(hc.x * CELL_SIZE, hc.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      if (isMoving && g.movingTower) {
        ctx.globalAlpha = 0.4; entityRenderer.drawTower(ctx, g.movingTower); ctx.globalAlpha = 1;
      } else if (!blocked && g.selectedTowerType) {
        const def = towerRegistry.has(g.selectedTowerType) ? towerRegistry.getDef(g.selectedTowerType) : null;
        if (def) {
          ctx.beginPath();
          ctx.arc(hc.x * CELL_SIZE + CELL_SIZE / 2, hc.y * CELL_SIZE + CELL_SIZE / 2, def.baseRange, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    // Towers
    for (const t of g.towers) entityRenderer.drawTower(ctx, t);

    // Hovered tower range
    if (g.hoveredCell) {
      for (const t of state.towersAt(g.hoveredCell.x, g.hoveredCell.y)) {
        ctx.beginPath(); ctx.arc(t.pixelX, t.pixelY, t.def.baseRange, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // Projectiles
    for (const proj of g.projectiles) {
      const r = proj.isMagic ? 7 : proj.isCrit ? 6 : 4;
      ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color; ctx.shadowBlur = proj.isMagic ? 16 : proj.isCrit ? 10 : 5;
      ctx.fill(); ctx.shadowBlur = 0;
      if (proj.isMagic) {
        ctx.beginPath(); ctx.arc(proj.x, proj.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = proj.color + '66'; ctx.lineWidth = 2; ctx.stroke();
      }
      if (proj.components && proj.components.length > 1) {
        const secColor = ELEMENT_COLORS[proj.components[1].element];
        ctx.beginPath(); ctx.arc(proj.x, proj.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = secColor + 'aa'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // Enemies
    for (const e of g.enemies) entityRenderer.drawEnemy(ctx, e);

    // Floating texts
    for (const ft of g.floatingTexts) {
      ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.fillStyle = ft.color;
      ctx.font = ft.text.includes('CRÍTICO') ? 'bold 13px Segoe UI' : 'bold 11px Segoe UI';
      ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }
}
