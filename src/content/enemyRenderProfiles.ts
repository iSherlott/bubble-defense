// ─── Register Enemy Render Profiles ──────────────────────────────────────────
// Moved from EntityRenderer's private methods into data-driven registry.

import { registerEnemyRenderProfile } from '../ui/EnemyRenderProfile';

export function registerEnemyRenderProfiles(): void {

  // ── Goblin ─────────────────────────────────────────────────────────────────
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

  // ── Troll ──────────────────────────────────────────────────────────────────
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

  // ── Harpia ─────────────────────────────────────────────────────────────────
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

  // ── Escudeiro Rochoso ──────────────────────────────────────────────────────
  // Stocky rocky body with a raised shield on left side.
  registerEnemyRenderProfile('rocky_shielder', (ctx, x, y, r, color) => {
    // Body — squat rectangle with rounded corners
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x + r * 0.1, y, r * 0.65, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    // Stone cracks
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y - r * 0.4); ctx.lineTo(x + r * 0.2, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.2); ctx.lineTo(x + r * 0.3, y + r * 0.6); ctx.stroke();
    // Shield on left
    ctx.fillStyle = '#8899bb';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.9);
    ctx.lineTo(x - r * 1.1, y - r * 0.5);
    ctx.lineTo(x - r * 1.1, y + r * 0.4);
    ctx.lineTo(x - r * 0.5, y + r * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ccddff'; ctx.lineWidth = 1.5; ctx.stroke();
    // Shield emblem
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath(); ctx.arc(x - r * 0.8, y - r * 0.05, r * 0.18, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(x - r * 0.05, y - r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
  });

  // ── Xamã das Marés ─────────────────────────────────────────────────────────
  // Robed shaman figure with water orb staff.
  registerEnemyRenderProfile('tide_shaman', (ctx, x, y, r, color) => {
    // Robe body
    ctx.fillStyle = color + 'cc';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y + r); ctx.lineTo(x - r * 0.7, y + r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y - r * 0.6, r * 0.42, 0, Math.PI * 2); ctx.fill();
    // Staff
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + r * 0.55, y + r * 0.9); ctx.lineTo(x + r * 0.7, y - r * 0.9); ctx.stroke();
    // Water orb at top of staff
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 500);
    ctx.beginPath(); ctx.arc(x + r * 0.75, y - r * 1.0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,200,255,${pulse})`; ctx.fill();
    ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1; ctx.stroke();
    // Eyes
    ctx.fillStyle = '#88eeff';
    ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.6, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.6, r * 0.12, 0, Math.PI * 2); ctx.fill();
  });

  // ── Batedor Tempestuoso ────────────────────────────────────────────────────
  // Sleek quick figure with wind-streak wings.
  registerEnemyRenderProfile('storm_ranger', (ctx, x, y, r, color) => {
    // Thin body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.45, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    // Wind streaks (wings)
    ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const oy = -r * 0.3 + i * r * 0.28;
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + oy); ctx.bezierCurveTo(x - r * 1.1, y + oy - r * 0.1, x - r * 1.4, y + oy + r * 0.2, x - r * 1.6, y + oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + r * 0.4, y + oy); ctx.bezierCurveTo(x + r * 1.1, y + oy - r * 0.1, x + r * 1.4, y + oy + r * 0.2, x + r * 1.6, y + oy); ctx.stroke();
    }
    // Head
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y - r * 0.6, r * 0.38, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath(); ctx.arc(x - r * 0.13, y - r * 0.62, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.13, y - r * 0.62, r * 0.12, 0, Math.PI * 2); ctx.fill();
  });

  // ── Golem (Shadow) ─────────────────────────────────────────────────────────
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

  // ── Dragon ─────────────────────────────────────────────────────────────────
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

  // ── Disabler (shared across all element variants) ─────────────────────────
  registerEnemyRenderProfile('disabler', (ctx, x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.9, py = y + Math.sin(a) * r * 0.9;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1.5; ctx.stroke();
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 250);
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,50,50,${pulse})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y - r * 0.35); ctx.lineTo(x + r * 0.35, y + r * 0.35);
    ctx.strokeStyle = `rgba(255,50,50,${pulse})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  BOSS RENDER PROFILES
  // ════════════════════════════════════════════════════════════════════════════

  // ── Colosso da Forja — Massive rocky+fire body ────────────────────────────
  registerEnemyRenderProfile('boss_forge_colossus', (ctx, x, y, r) => {
    // Molten core glow
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#331100';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Rock plates
    ctx.fillStyle = '#553311';
    ctx.fillRect(x - r * 0.7, y - r * 0.9, r * 1.4, r * 1.8);
    ctx.strokeStyle = '#884422'; ctx.lineWidth = 2;
    ctx.strokeRect(x - r * 0.7, y - r * 0.9, r * 1.4, r * 1.8);
    // Crack lines
    ctx.strokeStyle = '#ff6600aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.9); ctx.lineTo(x + r * 0.1, y - r * 0.2); ctx.lineTo(x - r * 0.2, y + r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.5); ctx.lineTo(x + r * 0.6, y + r * 0.5); ctx.stroke();
    // Molten eyes
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Crown/horns
    ctx.fillStyle = '#cc4400';
    for (let i = 0; i < 3; i++) {
      const hx = x - r * 0.4 + i * r * 0.4, hy = y - r * 0.9;
      ctx.beginPath(); ctx.moveTo(hx - r * 0.12, hy); ctx.lineTo(hx, hy - r * 0.4); ctx.lineTo(hx + r * 0.12, hy); ctx.closePath(); ctx.fill();
    }
  });

  // ── Leviatã das Marés — Serpentine water creature ────────────────────────
  registerEnemyRenderProfile('boss_tidal_leviathan', (ctx, x, y, r) => {
    // Outer water ripple
    const pulse = 0.3 + 0.25 * Math.sin(Date.now() / 400);
    ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,80,200,${pulse})`; ctx.fill();
    // Main body — elongated serpent
    ctx.fillStyle = '#003388';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2255cc';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.6, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Scales pattern
    ctx.strokeStyle = '#5588ff33'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x, y - r * 0.4 + i * r * 0.3, r * 0.4, 0, Math.PI); ctx.stroke();
    }
    // Fins
    ctx.fillStyle = '#5599ff88';
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.3); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.8, x - r * 1.8, y + r * 0.2, x - r * 0.6, y + r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.3); ctx.bezierCurveTo(x + r * 1.6, y - r * 0.8, x + r * 1.8, y + r * 0.2, x + r * 0.6, y + r * 0.3); ctx.closePath(); ctx.fill();
    // Eyes
    ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#00eeff';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#002255';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ── Rainha da Tempestade — Sleek wind queen with vortex ──────────────────
  registerEnemyRenderProfile('boss_storm_queen', (ctx, x, y, r) => {
    // Vortex aura
    const t = Date.now() / 800;
    for (let i = 0; i < 6; i++) {
      const a = t + (i / 6) * Math.PI * 2;
      const sr = r * 1.0 + Math.sin(t * 2 + i) * r * 0.15;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * sr * 0.5, y + Math.sin(a) * sr * 0.3, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,255,80,0.25)`; ctx.fill();
    }
    // Body
    ctx.fillStyle = '#1a3310';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.65, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#55aa22';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 0.5, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    // Wind wings
    ctx.fillStyle = '#88ff4488';
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.4); ctx.bezierCurveTo(x - r * 1.8, y - r * 1.2, x - r * 2.2, y, x - r * 0.5, y + r * 0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.4); ctx.bezierCurveTo(x + r * 1.8, y - r * 1.2, x + r * 2.2, y, x + r * 0.5, y + r * 0.4); ctx.closePath(); ctx.fill();
    // Crown
    ctx.fillStyle = '#ccff44';
    for (let i = 0; i < 5; i++) {
      const cx2 = x - r * 0.5 + i * r * 0.25, cy2 = y - r * 0.92;
      ctx.beginPath(); ctx.moveTo(cx2 - r * 0.08, cy2); ctx.lineTo(cx2, cy2 - r * 0.3); ctx.lineTo(cx2 + r * 0.08, cy2); ctx.closePath(); ctx.fill();
    }
    // Eyes
    ctx.shadowColor = '#ccff44'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ccff44';
    ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.22, y - r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#003300';
    ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.22, y - r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ── Guardião do Abismo — Dark shifting form ────────────────────────────────
  registerEnemyRenderProfile('boss_abyss_guardian', (ctx, x, y, r) => {
    // Shadow aura
    const p = 0.4 + 0.3 * Math.sin(Date.now() / 350);
    ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60,0,100,${p * 0.5})`; ctx.fill();
    // Body
    ctx.fillStyle = '#1a0033';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill();
    // Shadow tendrils
    ctx.strokeStyle = '#6600cc88'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Date.now() / 2000;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + Math.cos(a + 0.4) * r * 0.8, y + Math.sin(a + 0.4) * r * 0.8,
        x + Math.cos(a - 0.2) * r * 1.2, y + Math.sin(a - 0.2) * r * 1.2,
        x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4,
      );
      ctx.stroke();
    }
    // Core
    ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#330055';
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Eyes
    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#cc00ff';
    ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ── Avatar Prismático — Multi-colored crystalline form ────────────────────
  registerEnemyRenderProfile('boss_prismatic_avatar', (ctx, x, y, r) => {
    const t = Date.now() / 600;
    // Prismatic outer glow — cycles hue
    const hue = (t * 60) % 360;
    ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue},80%,50%,0.25)`; ctx.fill();
    ctx.shadowBlur = 0;

    // Crystal body — octagon
    ctx.fillStyle = `hsl(${(hue + 40) % 360},70%,25%)`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.88;
      const py = y + Math.sin(a) * r * 0.88;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `hsl(${hue},90%,70%)`; ctx.lineWidth = 2; ctx.stroke();

    // Inner crystal facets
    ctx.fillStyle = `hsla(${(hue + 120) % 360},60%,40%,0.6)`;
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 0.6); ctx.lineTo(x - r * 0.5, y); ctx.closePath(); ctx.fill();

    // Orbiting crystals
    for (let i = 0; i < 4; i++) {
      const a = t + (i / 4) * Math.PI * 2;
      const ox = x + Math.cos(a) * r * 0.75;
      const oy = y + Math.sin(a) * r * 0.55;
      const elHue = (hue + i * 90) % 360;
      ctx.fillStyle = `hsl(${elHue},90%,65%)`;
      ctx.beginPath(); ctx.arc(ox, oy, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }

    // Eyes
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `hsl(${hue},100%,50%)`;
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });
}
