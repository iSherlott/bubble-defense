// ─── Built-in Animation Definitions ──────────────────────────────────────────
// Register all stock animations here. To add a new animation:
//   1. Define an AnimationDefinition with a unique id + draw()
//   2. Call registerAnimation(def)
//   3. Use it anywhere: ctx.animations.request({ id: 'your_id', sourceX, sourceY })

import { registerAnimation } from '../registries/AnimationRegistry';
import type { AnimationDefinition } from '../types/animation';

// ─── AoE Flash (replaces hardcoded BoardRenderer.aoeFlashes) ─────────────────

const aoeFlash: AnimationDefinition = {
  id: 'aoe_flash',
  defaultDuration: 0.35,
  draw(ctx, inst) {
    const alpha = (1 - inst.progress) * 0.4;
    const strokeAlpha = Math.min(1, alpha + 0.2);
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, inst.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150,220,80,${alpha})`;
    ctx.strokeStyle = `rgba(180,255,100,${strokeAlpha})`;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  },
};

// ─── Fire Burst — expanding ring of flame ────────────────────────────────────

const fireBurst: AnimationDefinition = {
  id: 'fire_burst',
  defaultDuration: 0.4,
  draw(ctx, inst) {
    const alpha = (1 - inst.progress) * 0.5;
    const r = inst.radius * (0.3 + 0.7 * inst.progress);
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,120,30,${alpha * 0.4})`;
    ctx.strokeStyle = `rgba(255,80,20,${alpha})`;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
  },
};

// ─── Frost Nova — icy expanding ring with fade ───────────────────────────────

const frostNova: AnimationDefinition = {
  id: 'frost_nova',
  defaultDuration: 0.6,
  draw(ctx, inst) {
    const alpha = 1 - inst.progress;
    const r = inst.radius * inst.progress;
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,200,255,${alpha * 0.3})`;
    ctx.strokeStyle = `rgba(150,230,255,${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  },
};

// ─── Earth Quake — concentric ripple rings ───────────────────────────────────

const earthQuake: AnimationDefinition = {
  id: 'earth_quake',
  defaultDuration: 0.5,
  draw(ctx, inst) {
    const alpha = (1 - inst.progress) * 0.6;
    for (let i = 0; i < 3; i++) {
      const wave = (inst.progress + i * 0.15) % 1;
      const r = inst.radius * wave;
      ctx.beginPath();
      ctx.arc(inst.sourceX, inst.sourceY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180,160,60,${alpha * (1 - wave)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  },
};

// ─── Wind Gust — directional arc sweep ───────────────────────────────────────

const windGust: AnimationDefinition = {
  id: 'wind_gust',
  defaultDuration: 0.35,
  draw(ctx, inst) {
    const alpha = (1 - inst.progress) * 0.5;
    const dx = inst.targetX - inst.sourceX;
    const dy = inst.targetY - inst.sourceY;
    const angle = Math.atan2(dy, dx);
    const r = inst.radius * (0.4 + 0.6 * inst.progress);
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, r, angle - 0.5, angle + 0.5);
    ctx.strokeStyle = `rgba(200,255,150,${alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  },
};

// ─── Chain Lightning — jagged line between source and target ─────────────────

const chainLightning: AnimationDefinition = {
  id: 'chain_lightning',
  defaultDuration: 0.3,
  draw(ctx, inst) {
    const alpha = 1 - inst.progress;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const segs = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = sx + (tx - sx) * t + (Math.random() - 0.5) * 16;
      const my = sy + (ty - sy) * t + (Math.random() - 0.5) * 16;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = `rgba(180,200,255,${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#aaccff';
    ctx.shadowBlur = 8 * alpha;
    ctx.stroke();
    ctx.shadowBlur = 0;
  },
};

// ─── Fusion Burst — dual-color expanding ring ────────────────────────────────

const fusionBurst: AnimationDefinition = {
  id: 'fusion_burst',
  defaultDuration: 0.5,
  draw(ctx, inst) {
    const alpha = (1 - inst.progress) * 0.6;
    const r = inst.radius * (0.2 + 0.8 * inst.progress);
    // Outer ring — primary color
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, r, 0, Math.PI * 2);
    ctx.strokeStyle = inst.color.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
    // Fallback for hex colors
    ctx.strokeStyle = `${inst.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Inner ring — secondary color
    ctx.beginPath();
    ctx.arc(inst.sourceX, inst.sourceY, r * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `${inst.secondaryColor}${Math.round(alpha * 200).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 2;
    ctx.stroke();
  },
};

// ─── Register All ────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
//  Fusion-specific Animations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1) MAGMA (earth+fire) — fissure + lava pools ───────────────────────────

const fusionMagma: AnimationDefinition = {
  id: 'fusion_magma',
  defaultDuration: 1.0,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const poolCount = lateFusion ? 5 : 3;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;

    // Fissure line cracks radiating from center
    const fissures = lateFusion ? 5 : 3;
    for (let i = 0; i < fissures; i++) {
      const ang = (i / fissures) * Math.PI * 2 + 0.4;
      const len = r * 0.7 * Math.min(1, t * 4);
      const fAlpha = alpha * 0.8;
      // Glowing vein effect
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const segs = 6;
      for (let s = 1; s <= segs; s++) {
        const st = s / segs;
        const jitter = (Math.sin(s * 3.7 + i * 2.1 + t * 8) * 4);
        const px = cx + Math.cos(ang) * len * st + Math.cos(ang + Math.PI / 2) * jitter;
        const py = cy + Math.sin(ang) * len * st + Math.sin(ang + Math.PI / 2) * jitter;
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(255,60,0,${fAlpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 8 * alpha;
      ctx.stroke();
      // Inner glow vein
      ctx.strokeStyle = `rgba(255,200,50,${fAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Lava pools with bubbling effect
    for (let i = 0; i < poolCount; i++) {
      const poolAng = (i / poolCount) * Math.PI * 2 + 1.2;
      const poolDist = r * 0.35 * (0.5 + 0.5 * Math.sin(i * 1.7));
      const px = cx + Math.cos(poolAng) * poolDist;
      const py = cy + Math.sin(poolAng) * poolDist;
      const poolR = r * 0.12 * (lateFusion ? 1.3 : 1);
      const pAlpha = alpha * 0.6;
      // Pool base
      const grd = ctx.createRadialGradient(px, py, 0, px, py, poolR);
      grd.addColorStop(0, `rgba(255,120,0,${pAlpha})`);
      grd.addColorStop(0.6, `rgba(200,50,0,${pAlpha * 0.6})`);
      grd.addColorStop(1, `rgba(80,20,0,${pAlpha * 0.1})`);
      ctx.beginPath();
      ctx.arc(px, py, poolR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      // Bubbles
      const bubbleT = (t * 3 + i * 0.7) % 1;
      const bubbleR = 2 + bubbleT * 2;
      const bubbleAlpha = (1 - bubbleT) * pAlpha;
      const bx = px + Math.cos(t * 5 + i) * poolR * 0.4;
      const by = py - bubbleT * 8;
      ctx.beginPath();
      ctx.arc(bx, by, bubbleR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,180,50,${bubbleAlpha})`;
      ctx.fill();
    }

    // Heat pulse glow
    const pulseT = (t * 2) % 1;
    const pulseAlpha = (1 - pulseT) * alpha * 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5 * pulseT, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,80,0,${pulseAlpha})`;
    ctx.fill();
  },
};

// ─── 2) FIREBALL (fire+earth) — meteor/orb with trail + shrapnel ────────────

const fusionFireball: AnimationDefinition = {
  id: 'fusion_fireball',
  defaultDuration: 0.6,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const sx = inst.sourceX, sy = inst.sourceY;

    // Phase 1: Travel (0-0.35)
    if (t < 0.35) {
      const travelT = t / 0.35;
      const mx = sx + (cx - sx) * travelT;
      const my = sy + (cy - sy) * travelT;
      // Ember trail
      for (let i = 0; i < 6; i++) {
        const tt = Math.max(0, travelT - i * 0.04);
        const trailX = sx + (cx - sx) * tt + (Math.random() - 0.5) * 6;
        const trailY = sy + (cy - sy) * tt + (Math.random() - 0.5) * 6;
        const trailAlpha = (1 - i / 6) * 0.5;
        ctx.beginPath();
        ctx.arc(trailX, trailY, 3 - i * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${100 + i * 20},20,${trailAlpha})`;
        ctx.fill();
      }
      // Main orb
      const orbR = 6 + (lateFusion ? 3 : 0);
      ctx.beginPath();
      ctx.arc(mx, my, orbR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,160,40,0.9)';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, orbR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,200,0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Phase 2: Impact explosion (0.35-1)
    else {
      const impT = (t - 0.35) / 0.65;
      const alpha = (1 - impT) * 0.8;
      // Main explosion
      const expR = r * 0.4 * (0.3 + 0.7 * impT);
      ctx.beginPath();
      ctx.arc(cx, cy, expR, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, expR);
      grd.addColorStop(0, `rgba(255,200,80,${alpha * 0.7})`);
      grd.addColorStop(0.5, `rgba(255,100,20,${alpha * 0.4})`);
      grd.addColorStop(1, `rgba(180,40,0,${alpha * 0.05})`);
      ctx.fillStyle = grd;
      ctx.fill();
      // Shrapnel fragments
      const shrapCount = lateFusion ? 8 : 5;
      for (let i = 0; i < shrapCount; i++) {
        const sAng = (i / shrapCount) * Math.PI * 2 + 0.3;
        const sDist = r * 0.15 + r * 0.45 * impT;
        const fx = cx + Math.cos(sAng) * sDist;
        const fy = cy + Math.sin(sAng) * sDist;
        const sAlpha = (1 - impT) * 0.7;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(sAng + impT * 4);
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(3, -1);
        ctx.lineTo(1, 3);
        ctx.lineTo(-2, 2);
        ctx.closePath();
        ctx.fillStyle = `rgba(200,80,20,${sAlpha})`;
        ctx.strokeStyle = `rgba(255,140,40,${sAlpha})`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Impact shockwave ring
      const ringR = r * 0.5 * impT;
      const ringAlpha = (1 - impT) * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,120,30,${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  },
};

// ─── 3) SWAMP (earth+water) — rot zone with bubbles & tendrils ──────────────

const fusionSwamp: AnimationDefinition = {
  id: 'fusion_swamp',
  defaultDuration: 1.2,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.75 ? (1 - t) / 0.25 : 1;
    const zoneR = r * (lateFusion ? 0.65 : 0.5);

    // Swamp ground area (green-brown gradient)
    ctx.beginPath();
    ctx.arc(cx, cy, zoneR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, zoneR);
    grd.addColorStop(0, `rgba(60,80,20,${alpha * 0.5})`);
    grd.addColorStop(0.5, `rgba(50,70,30,${alpha * 0.35})`);
    grd.addColorStop(1, `rgba(40,50,20,${alpha * 0.1})`);
    ctx.fillStyle = grd;
    ctx.fill();

    // Putrid bubbles rising
    const bubbleCount = lateFusion ? 8 : 5;
    for (let i = 0; i < bubbleCount; i++) {
      const bAng = (i / bubbleCount) * Math.PI * 2;
      const bDist = zoneR * 0.5 * (0.3 + 0.7 * Math.sin(i * 2.3));
      const bubbleT = (t * 2.5 + i * 0.3) % 1;
      const bx = cx + Math.cos(bAng) * bDist;
      const by = cy + Math.sin(bAng) * bDist - bubbleT * 12;
      const br = 2 + bubbleT * 1.5;
      const bAlpha = (1 - bubbleT) * alpha * 0.6;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,140,40,${bAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(80,110,30,${bAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Root tendrils reaching out
    const tendrilCount = lateFusion ? 5 : 3;
    for (let i = 0; i < tendrilCount; i++) {
      const tAng = (i / tendrilCount) * Math.PI * 2 + 0.8;
      const tLen = zoneR * 0.8 * Math.min(1, t * 3);
      const tAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const seg = 5;
      for (let s = 1; s <= seg; s++) {
        const st = s / seg;
        const wave = Math.sin(st * Math.PI * 2 + t * 4 + i) * 6;
        const px = cx + Math.cos(tAng) * tLen * st + Math.cos(tAng + Math.PI / 2) * wave;
        const py = cy + Math.sin(tAng) * tLen * st + Math.sin(tAng + Math.PI / 2) * wave;
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(70,90,30,${tAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Edge goo drip effect
    ctx.beginPath();
    ctx.arc(cx, cy, zoneR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(80,100,30,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  },
};

// ─── 4) MUD (water+earth) — heavy sludge wave + viscous terrain ──────────────

const fusionMud: AnimationDefinition = {
  id: 'fusion_mud',
  defaultDuration: 0.7,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = (1 - t) * 0.7;
    const spread = r * 0.5 * (lateFusion ? 1.3 : 1);

    // Heavy mud wave expanding low
    const waveR = spread * (0.3 + 0.7 * t);
    ctx.beginPath();
    // Flatten ellipse to look "low/heavy"
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, waveR);
    grd.addColorStop(0, `rgba(120,90,50,${alpha * 0.6})`);
    grd.addColorStop(0.7, `rgba(100,75,40,${alpha * 0.35})`);
    grd.addColorStop(1, `rgba(70,50,25,${alpha * 0.1})`);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();

    // Thick splatter drops
    const dropCount = lateFusion ? 8 : 5;
    for (let i = 0; i < dropCount; i++) {
      const dAng = (i / dropCount) * Math.PI * 2 + 0.5;
      const dDist = waveR * 0.8 * (0.5 + 0.5 * Math.sin(i * 2.7));
      const dx = cx + Math.cos(dAng) * dDist;
      const dy = cy + Math.sin(dAng) * dDist * 0.6;
      const dr = 4 + Math.sin(i) * 2;
      const dAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(90,65,35,${dAlpha})`;
      ctx.fill();
    }

    // Impact ring (heavy feel)
    if (t < 0.4) {
      const ringT = t / 0.4;
      const ringAlpha = (1 - ringT) * 0.5;
      ctx.beginPath();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.6);
      ctx.arc(0, 0, spread * 0.6 * ringT, 0, Math.PI * 2);
      ctx.restore();
      ctx.strokeStyle = `rgba(140,100,55,${ringAlpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  },
};

// ─── 5) SANDSTORM (earth+wind) — abrasive spinning column ───────────────────

const fusionSandstorm: AnimationDefinition = {
  id: 'fusion_sandstorm',
  defaultDuration: 0.9,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1;
    const cloudR = r * 0.5 * (lateFusion ? 1.3 : 1);

    // Dense abrasive cloud (filled circle with noise)
    ctx.beginPath();
    ctx.arc(cx, cy, cloudR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudR);
    grd.addColorStop(0, `rgba(200,170,100,${alpha * 0.35})`);
    grd.addColorStop(0.7, `rgba(180,150,80,${alpha * 0.2})`);
    grd.addColorStop(1, `rgba(150,120,60,${alpha * 0.05})`);
    ctx.fillStyle = grd;
    ctx.fill();

    // Spinning sand particles (lots of small particles in spiral)
    const particleCount = lateFusion ? 30 : 20;
    const rotSpeed = t * Math.PI * 6;
    for (let i = 0; i < particleCount; i++) {
      const pAng = (i / particleCount) * Math.PI * 2 + rotSpeed + Math.sin(i * 0.7) * 0.5;
      const pDist = cloudR * (0.15 + 0.75 * ((i * 0.618) % 1));
      const px = cx + Math.cos(pAng) * pDist;
      const py = cy + Math.sin(pAng) * pDist;
      const pAlpha = alpha * (0.3 + 0.4 * Math.sin(i * 1.3 + t * 5));
      const pSize = 1 + Math.sin(i * 2.1) * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,180,110,${pAlpha})`;
      ctx.fill();
    }

    // Erosion cut marks (sharp small lines)
    const cutCount = 5;
    for (let i = 0; i < cutCount; i++) {
      const cAng = (i / cutCount) * Math.PI * 2 + rotSpeed * 0.3;
      const cDist = cloudR * 0.6;
      const ccx = cx + Math.cos(cAng) * cDist;
      const ccy = cy + Math.sin(cAng) * cDist;
      const cutAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.moveTo(ccx - 4, ccy - 1);
      ctx.lineTo(ccx + 4, ccy + 1);
      ctx.strokeStyle = `rgba(180,140,60,${cutAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Outer swirl boundary
    ctx.beginPath();
    ctx.arc(cx, cy, cloudR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190,160,90,${alpha * 0.25})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  },
};

// ─── 6) TORNADO (wind+earth) — vertical column with debris ──────────────────

const fusionTornado: AnimationDefinition = {
  id: 'fusion_tornado',
  defaultDuration: 1.0,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.75 ? (1 - t) / 0.25 : 1;
    const height = r * (lateFusion ? 1.4 : 1.0);
    const baseWidth = r * 0.3;
    const topWidth = r * 0.08;

    // Funnel shape (trapezoid from bottom wide to top narrow)
    const rotSpeed = t * Math.PI * 8;
    const layers = 8;
    for (let i = 0; i < layers; i++) {
      const lt = i / layers;
      const ly = cy - height * lt;
      const lw = baseWidth * (1 - lt) + topWidth * lt;
      const lAlpha = alpha * (0.4 - lt * 0.2);
      // Rotating arc segments for each layer
      const arcAng = rotSpeed + lt * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, ly, lw, arcAng, arcAng + Math.PI * 1.2);
      ctx.strokeStyle = `rgba(140,180,100,${lAlpha})`;
      ctx.lineWidth = 3 - lt * 2;
      ctx.stroke();
    }

    // Orbiting debris rocks
    const debrisCount = lateFusion ? 6 : 4;
    for (let i = 0; i < debrisCount; i++) {
      const dH = height * (0.2 + 0.6 * ((i * 0.37) % 1));
      const dAng = rotSpeed * 1.2 + (i / debrisCount) * Math.PI * 2;
      const dW = baseWidth * (1 - dH / height) + topWidth * (dH / height);
      const dx = cx + Math.cos(dAng) * dW * 0.8;
      const dy = cy - dH + Math.sin(dAng) * 3;
      const dAlpha = alpha * 0.7;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(dAng + t * 5);
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(3, -1);
      ctx.lineTo(2, 3);
      ctx.lineTo(-2, 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(120,100,60,${dAlpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Ground disturb ring at base
    ctx.beginPath();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.35);
    ctx.arc(0, 0, baseWidth * 1.2, 0, Math.PI * 2);
    ctx.restore();
    ctx.strokeStyle = `rgba(160,140,80,${alpha * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dust trail at base
    for (let i = 0; i < 4; i++) {
      const dAng2 = rotSpeed * 0.5 + i * Math.PI / 2;
      const dd = baseWidth * 1.5 * t;
      const ddx = cx + Math.cos(dAng2) * dd;
      const ddy = cy + Math.sin(dAng2) * 2;
      const dAlpha2 = (1 - t) * alpha * 0.2;
      ctx.beginPath();
      ctx.arc(ddx, ddy, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,140,90,${dAlpha2})`;
      ctx.fill();
    }
  },
};

// ─── 7) STEAM (fire+water) — superheated pressure cloud ─────────────────────

const fusionSteam: AnimationDefinition = {
  id: 'fusion_steam',
  defaultDuration: 0.9,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.65 ? (1 - t) / 0.35 : 1;
    const cloudR = r * 0.45 * (lateFusion ? 1.3 : 1);

    // Steam cloud (white-pink pulsing area)
    const pulseR = cloudR * (1 + 0.08 * Math.sin(t * 15));
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    grd.addColorStop(0, `rgba(255,240,250,${alpha * 0.4})`);
    grd.addColorStop(0.4, `rgba(220,200,230,${alpha * 0.25})`);
    grd.addColorStop(1, `rgba(180,160,200,${alpha * 0.05})`);
    ctx.fillStyle = grd;
    ctx.fill();

    // Heat distortion lines (wavy horizontal)
    const lineCount = lateFusion ? 6 : 4;
    for (let i = 0; i < lineCount; i++) {
      const ly = cy - cloudR * 0.6 + (i / lineCount) * cloudR * 1.2;
      const lAlpha = alpha * 0.3;
      ctx.beginPath();
      for (let s = 0; s <= 10; s++) {
        const sx2 = cx - cloudR * 0.7 + (s / 10) * cloudR * 1.4;
        const wave = Math.sin(s * 0.8 + t * 8 + i * 1.5) * 3;
        if (s === 0) ctx.moveTo(sx2, ly + wave);
        else ctx.lineTo(sx2, ly + wave);
      }
      ctx.strokeStyle = `rgba(255,220,240,${lAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Pressure pulses outward
    const pulseT = (t * 3) % 1;
    const ppR = cloudR * 0.3 + cloudR * 0.7 * pulseT;
    const ppAlpha = (1 - pulseT) * alpha * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, ppR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(250,230,255,${ppAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rising steam wisps
    for (let i = 0; i < 4; i++) {
      const wispT = (t * 2 + i * 0.25) % 1;
      const wx = cx + Math.sin(i * 2.3 + t * 3) * cloudR * 0.3;
      const wy = cy - wispT * cloudR * 1.5;
      const wAlpha = (1 - wispT) * alpha * 0.35;
      ctx.beginPath();
      ctx.arc(wx, wy, 3 + wispT * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,230,250,${wAlpha})`;
      ctx.fill();
    }
  },
};

// ─── 8) GEYSER (water+fire) — vertical eruption column ──────────────────────

const fusionGeyser: AnimationDefinition = {
  id: 'fusion_geyser',
  defaultDuration: 0.7,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const colHeight = r * (lateFusion ? 1.5 : 1.0);

    // Phase 1: Pressure buildup (0-0.2) — ground rumble
    if (t < 0.2) {
      const bT = t / 0.2;
      const bAlpha = bT * 0.4;
      // Ground circles pulsing
      for (let i = 0; i < 3; i++) {
        const pR = r * 0.1 * (1 + bT * i * 0.3);
        ctx.beginPath();
        ctx.arc(cx, cy, pR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,180,255,${bAlpha * (1 - i * 0.3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Phase 2: Eruption (0.2-0.7)
    if (t >= 0.2 && t < 0.7) {
      const eT = (t - 0.2) / 0.5;
      const eAlpha = 0.8 * (t < 0.5 ? 1 : (1 - (t - 0.5) / 0.5));
      const topY = cy - colHeight * Math.min(1, eT * 1.5);
      // Water column
      const colW = r * 0.12 * (lateFusion ? 1.3 : 1);
      ctx.beginPath();
      ctx.moveTo(cx - colW, cy);
      ctx.lineTo(cx - colW * 0.5, topY);
      ctx.lineTo(cx + colW * 0.5, topY);
      ctx.lineTo(cx + colW, cy);
      ctx.closePath();
      const grd = ctx.createLinearGradient(cx, cy, cx, topY);
      grd.addColorStop(0, `rgba(80,160,255,${eAlpha * 0.6})`);
      grd.addColorStop(0.5, `rgba(120,200,255,${eAlpha * 0.4})`);
      grd.addColorStop(1, `rgba(200,230,255,${eAlpha * 0.2})`);
      ctx.fillStyle = grd;
      ctx.fill();
      // Steam at top
      const steamR = colW * 2;
      ctx.beginPath();
      ctx.arc(cx, topY, steamR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${eAlpha * 0.3})`;
      ctx.fill();
      // Side splash droplets
      for (let i = 0; i < 5; i++) {
        const dAng = -Math.PI / 2 + (i - 2) * 0.4;
        const dDist = colW * 2 * eT;
        const dx = cx + Math.cos(dAng) * dDist;
        const dy = topY + Math.sin(dAng) * dDist * 0.5 + eT * 8;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150,210,255,${eAlpha * 0.5})`;
        ctx.fill();
      }
    }

    // Phase 3: Falloff spray (0.7-1)
    if (t >= 0.7) {
      const fT = (t - 0.7) / 0.3;
      const fAlpha = (1 - fT) * 0.5;
      for (let i = 0; i < 6; i++) {
        const dAng = (i / 6) * Math.PI * 2;
        const dDist = r * 0.2 * (0.5 + fT);
        const dx = cx + Math.cos(dAng) * dDist;
        const dy = cy - colHeight * (1 - fT * 0.8) + Math.sin(dAng) * 5 + fT * 20;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${fAlpha})`;
        ctx.fill();
      }
    }
  },
};

// ─── 9) INFERNO (fire+wind) — combustion beam/focus with detonation ─────────

const fusionInferno: AnimationDefinition = {
  id: 'fusion_inferno',
  defaultDuration: 0.55,
  draw(ctx, inst) {
    const t = inst.progress;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    // Phase 1: Ignition beam (0-0.4)
    if (t < 0.4) {
      const beamT = t / 0.4;
      const beamLen = dist * beamT;
      const alpha = 0.7;
      // Fire beam
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang) * beamLen, sy + Math.sin(ang) * beamLen);
      ctx.strokeStyle = `rgba(255,100,20,${alpha})`;
      ctx.lineWidth = lateFusion ? 4 : 3;
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 10;
      ctx.stroke();
      // Inner bright core beam
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang) * beamLen, sy + Math.sin(ang) * beamLen);
      ctx.strokeStyle = `rgba(255,220,100,${alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Wind-pulled flame wisps along beam
      for (let i = 0; i < 4; i++) {
        const wPos = beamLen * (i / 4);
        const perpOff = Math.sin(t * 12 + i * 2) * 5;
        const wx = sx + Math.cos(ang) * wPos + Math.cos(ang + Math.PI / 2) * perpOff;
        const wy = sy + Math.sin(ang) * wPos + Math.sin(ang + Math.PI / 2) * perpOff;
        ctx.beginPath();
        ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,180,50,${alpha * 0.5})`;
        ctx.fill();
      }
    }

    // Phase 2: Detonation at target (0.4-1)
    if (t >= 0.4) {
      const detT = (t - 0.4) / 0.6;
      const alpha = (1 - detT) * 0.8;
      // Combustion burst
      const burstR = (lateFusion ? 20 : 14) * (0.3 + 0.7 * detT);
      ctx.beginPath();
      ctx.arc(tx, ty, burstR, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, burstR);
      grd.addColorStop(0, `rgba(255,255,150,${alpha * 0.8})`);
      grd.addColorStop(0.4, `rgba(255,120,20,${alpha * 0.5})`);
      grd.addColorStop(1, `rgba(200,50,0,${alpha * 0.1})`);
      ctx.fillStyle = grd;
      ctx.fill();
      // Combustion lines radiating
      for (let i = 0; i < 6; i++) {
        const lAng = (i / 6) * Math.PI * 2;
        const lLen = burstR * (1 + detT * 0.5);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(lAng) * lLen, ty + Math.sin(lAng) * lLen);
        ctx.strokeStyle = `rgba(255,80,0,${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  },
};

// ─── 10) LIGHTNING (wind+fire) — chain bolts between targets ─────────────────

const fusionLightning: AnimationDefinition = {
  id: 'fusion_lightning',
  defaultDuration: 0.4,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.9;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const chainTargets = (inst.payload['chainTargets'] as number[][]) ?? [];

    // Draw main bolt with thicker, more electric feel
    drawJaggedBolt(ctx, sx, sy, tx, ty, alpha, lateFusion ? 3.5 : 2.5, 20);

    // Chain bolts to subsequent targets
    let prevX = tx, prevY = ty;
    for (let c = 0; c < chainTargets.length; c++) {
      const [ntx, nty] = chainTargets[c];
      const chainAlpha = alpha * (1 - c * 0.15);
      drawJaggedBolt(ctx, prevX, prevY, ntx, nty, chainAlpha, lateFusion ? 2.5 : 1.5, 14);
      // Terminal flash at each chain target
      const flashR = (lateFusion ? 8 : 5) * (1 - t);
      ctx.beginPath();
      ctx.arc(ntx, nty, flashR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,200,${chainAlpha * 0.5})`;
      ctx.fill();
      prevX = ntx;
      prevY = nty;
    }

    // Terminal flash at primary target
    const mainFlashR = (lateFusion ? 10 : 7) * (1 - t * 0.7);
    ctx.beginPath();
    ctx.arc(tx, ty, mainFlashR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${alpha * 0.6})`;
    ctx.shadowColor = '#ffff88';
    ctx.shadowBlur = 12 * alpha;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Source charge flash
    if (t < 0.2) {
      const chargeAlpha = (1 - t / 0.2) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${chargeAlpha})`;
      ctx.fill();
    }
  },
};

function drawJaggedBolt(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, alpha: number, width: number, jitterAmt: number) {
  const segs = 8;
  // Glow layer
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const points: [number, number][] = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const st = i / segs;
    const mx = x0 + (x1 - x0) * st + (Math.random() - 0.5) * jitterAmt;
    const my = y0 + (y1 - y0) * st + (Math.random() - 0.5) * jitterAmt;
    ctx.lineTo(mx, my);
    points.push([mx, my]);
  }
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = `rgba(150,180,255,${alpha * 0.3})`;
  ctx.lineWidth = width + 3;
  ctx.shadowColor = '#aaccff';
  ctx.shadowBlur = 10 * alpha;
  ctx.stroke();
  // Bright core
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (const [px, py] of points.slice(1)) ctx.lineTo(px, py);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = `rgba(220,230,255,${alpha})`;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── 11) BLIZZARD (water+wind) — sweeping ice front ─────────────────────────

const fusionBlizzard: AnimationDefinition = {
  id: 'fusion_blizzard',
  defaultDuration: 0.85,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.65 ? (1 - t) / 0.35 : 1;
    const stormR = r * 0.55 * (lateFusion ? 1.3 : 1);

    // Front cold zone
    ctx.beginPath();
    ctx.arc(cx, cy, stormR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, stormR);
    grd.addColorStop(0, `rgba(180,220,255,${alpha * 0.3})`);
    grd.addColorStop(0.6, `rgba(140,200,240,${alpha * 0.15})`);
    grd.addColorStop(1, `rgba(100,170,220,${alpha * 0.03})`);
    ctx.fillStyle = grd;
    ctx.fill();

    // Wind-driven snow particles (horizontal drift)
    const snowCount = lateFusion ? 25 : 16;
    const windDir = Math.PI * 0.15; // slight angle
    for (let i = 0; i < snowCount; i++) {
      const sPhase = (t * 3 + i * 0.13) % 1;
      const sStartX = cx - stormR + (i % 5) * stormR * 0.5;
      const sStartY = cy - stormR * 0.8 + ((i * 7) % 11) * stormR * 0.15;
      const sx2 = sStartX + Math.cos(windDir) * stormR * 2 * sPhase;
      const sy2 = sStartY + Math.sin(windDir) * stormR * sPhase + Math.sin(sPhase * Math.PI * 2) * 4;
      const sAlpha = Math.sin(sPhase * Math.PI) * alpha * 0.6;
      const sSize = 1 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(sx2, sy2, sSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${sAlpha})`;
      ctx.fill();
    }

    // Ice crystal sparkles
    const crystalCount = lateFusion ? 5 : 3;
    for (let i = 0; i < crystalCount; i++) {
      const cAng = (i / crystalCount) * Math.PI * 2 + t * 2;
      const cDist = stormR * 0.4 * (0.5 + 0.5 * Math.sin(i * 1.7));
      const ccx = cx + Math.cos(cAng) * cDist;
      const ccy = cy + Math.sin(cAng) * cDist;
      const cAlpha = alpha * 0.7 * Math.abs(Math.sin(t * 6 + i * 2));
      // 6-point star crystal
      ctx.strokeStyle = `rgba(200,235,255,${cAlpha})`;
      ctx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        const sa = s * Math.PI / 3 + t;
        ctx.beginPath();
        ctx.moveTo(ccx + Math.cos(sa) * 4, ccy + Math.sin(sa) * 4);
        ctx.lineTo(ccx - Math.cos(sa) * 4, ccy - Math.sin(sa) * 4);
        ctx.stroke();
      }
    }

    // Freeze ring edge
    const freezeT = (t * 2) % 1;
    const fR = stormR * (0.5 + 0.5 * freezeT);
    const fAlpha = (1 - freezeT) * alpha * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, fR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,210,255,${fAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  },
};

// ─── 12) TSUNAMI (wind+water) — wall of water sweeping across ────────────────

const fusionTsunami: AnimationDefinition = {
  id: 'fusion_tsunami',
  defaultDuration: 0.75,
  draw(ctx, inst) {
    const t = inst.progress;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.15 ? t / 0.15 : (1 - t) * 1.2;
    const clampAlpha = Math.min(alpha, 0.8);

    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    const perpAng = ang + Math.PI / 2;
    const waveWidth = r * 0.5 * (lateFusion ? 1.4 : 1);
    const wavePos = Math.min(1, t * 1.8); // wave front travels fast

    // Wave front position
    const frontX = sx + Math.cos(ang) * dist * wavePos;
    const frontY = sy + Math.sin(ang) * dist * wavePos;

    // Water wall (tall arc perpendicular to direction)
    const wallHeight = r * 0.3 * (lateFusion ? 1.3 : 1) * (1 - t * 0.3);
    ctx.beginPath();
    const halfW = waveWidth;
    const leftX = frontX + Math.cos(perpAng) * halfW;
    const leftY = frontY + Math.sin(perpAng) * halfW;
    const rightX = frontX - Math.cos(perpAng) * halfW;
    const rightY = frontY - Math.sin(perpAng) * halfW;
    const crX = frontX - Math.sin(ang) * wallHeight;
    const crY = frontY + Math.cos(ang) * wallHeight * 0.3 - wallHeight;
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(crX, crY, rightX, rightY);
    ctx.strokeStyle = `rgba(0,120,220,${clampAlpha * 0.7})`;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Fill behind the wave
    ctx.lineTo(rightX, rightY + 5);
    ctx.lineTo(leftX, leftY + 5);
    ctx.closePath();
    ctx.fillStyle = `rgba(50,150,230,${clampAlpha * 0.25})`;
    ctx.fill();

    // Foam/crest on top
    const foamCount = 6;
    for (let i = 0; i < foamCount; i++) {
      const ft = (i / foamCount);
      const fx = leftX + (rightX - leftX) * ft;
      const fy = leftY + (rightY - leftY) * ft - wallHeight * 0.4 * Math.sin(ft * Math.PI);
      const fAlpha = clampAlpha * 0.6;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${fAlpha})`;
      ctx.fill();
    }

    // Residual water on ground behind wave
    if (t > 0.3) {
      const resT = (t - 0.3) / 0.7;
      const resAlpha = (1 - resT) * clampAlpha * 0.2;
      const resW = waveWidth * 1.2;
      ctx.beginPath();
      ctx.save();
      ctx.translate(sx + Math.cos(ang) * dist * 0.5, sy + Math.sin(ang) * dist * 0.5);
      ctx.rotate(ang);
      ctx.scale(1, 0.3);
      ctx.arc(0, 0, resW, 0, Math.PI * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(80,160,230,${resAlpha})`;
      ctx.fill();
    }
  },
};

// ─── 13) SOLAR CORE (fire+fire) — pulsing sun sphere ────────────────────────

const fusionSolarCore: AnimationDefinition = {
  id: 'fusion_solar_core',
  defaultDuration: 1.2,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const coreR = r * 0.12 * (lateFusion ? 1.4 : 1);

    // Corona rays
    const rayCount = lateFusion ? 10 : 7;
    for (let i = 0; i < rayCount; i++) {
      const rAng = (i / rayCount) * Math.PI * 2 + t * 2;
      const rayLen = coreR * (2 + Math.sin(t * 8 + i * 1.5) * 0.8);
      const rAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rAng) * rayLen, cy + Math.sin(rAng) * rayLen);
      ctx.strokeStyle = `rgba(255,200,50,${rAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Core sphere with glow
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    grd.addColorStop(0, `rgba(255,255,200,${alpha * 0.9})`);
    grd.addColorStop(0.5, `rgba(255,200,50,${alpha * 0.7})`);
    grd.addColorStop(1, `rgba(255,120,0,${alpha * 0.4})`);
    ctx.fillStyle = grd;
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 20 * alpha;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pulse explosions at intervals
    const pulseInterval = lateFusion ? 0.2 : 0.3;
    const pulsePhase = (t % pulseInterval) / pulseInterval;
    const pulseR = r * 0.4 * pulsePhase;
    const pulseAlpha = (1 - pulsePhase) * alpha * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,180,50,${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Heat zone
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    const hGrd = ctx.createRadialGradient(cx, cy, coreR, cx, cy, r * 0.45);
    hGrd.addColorStop(0, `rgba(255,100,0,${alpha * 0.15})`);
    hGrd.addColorStop(1, `rgba(200,50,0,${alpha * 0.02})`);
    ctx.fillStyle = hGrd;
    ctx.fill();
  },
};

// ─── 14) ABYSSAL VORTEX (water+water) — deep dark whirlpool ─────────────────

const fusionAbyssalVortex: AnimationDefinition = {
  id: 'fusion_abyssal_vortex',
  defaultDuration: 1.1,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
    const vortexR = r * 0.5 * (lateFusion ? 1.3 : 1);

    // Deep dark background pool
    ctx.beginPath();
    ctx.arc(cx, cy, vortexR, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, vortexR);
    grd.addColorStop(0, `rgba(0,20,60,${alpha * 0.7})`);
    grd.addColorStop(0.5, `rgba(0,40,90,${alpha * 0.4})`);
    grd.addColorStop(1, `rgba(0,30,70,${alpha * 0.05})`);
    ctx.fillStyle = grd;
    ctx.fill();

    // Spiral arms (4 arms, rotating inward)
    const armCount = lateFusion ? 5 : 4;
    const rotSpeed = t * Math.PI * 5;
    ctx.lineWidth = 2;
    for (let a = 0; a < armCount; a++) {
      const baseAng = (a / armCount) * Math.PI * 2 + rotSpeed;
      ctx.beginPath();
      for (let s = 0; s <= 25; s++) {
        const st = s / 25;
        const spiralR = vortexR * (1 - st * 0.9);
        const ang = baseAng + st * Math.PI * 2.5;
        const px = cx + Math.cos(ang) * spiralR;
        const py = cy + Math.sin(ang) * spiralR;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(60,140,220,${alpha * 0.5})`;
      ctx.stroke();
    }

    // Particles being pulled inward
    const particleCount = lateFusion ? 10 : 6;
    for (let i = 0; i < particleCount; i++) {
      const pAng = (i / particleCount) * Math.PI * 2 + rotSpeed * 0.7;
      const pT = (t * 2 + i * 0.15) % 1;
      const pDist = vortexR * (1 - pT * 0.8);
      const px = cx + Math.cos(pAng + pT * Math.PI) * pDist;
      const py = cy + Math.sin(pAng + pT * Math.PI) * pDist;
      const pAlpha = alpha * pT * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,180,255,${pAlpha})`;
      ctx.fill();
    }

    // Dark center eye
    ctx.beginPath();
    ctx.arc(cx, cy, vortexR * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,10,40,${alpha * 0.9})`;
    ctx.fill();

    // Pressure ring at edge
    const edgeT = (t * 2.5) % 1;
    const edgeR = vortexR * (0.7 + 0.3 * edgeT);
    ctx.beginPath();
    ctx.arc(cx, cy, edgeR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(40,100,180,${(1 - edgeT) * alpha * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
};

// ─── 15) PRIMAL QUAKE (earth+earth) — seismic fissures + aftershocks ────────

const fusionPrimalQuake: AnimationDefinition = {
  id: 'fusion_primal_quake',
  defaultDuration: 0.9,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : (1 - t) * 1.1;
    const clampAlpha = Math.min(alpha, 0.8);

    // Screen shake hint (offset drawing randomly)
    const shakeAmt = t < 0.3 ? 3 * (1 - t / 0.3) : 0;
    const shakeX = (Math.random() - 0.5) * shakeAmt;
    const shakeY = (Math.random() - 0.5) * shakeAmt;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Radial fissure cracks
    const fissureCount = lateFusion ? 8 : 5;
    for (let i = 0; i < fissureCount; i++) {
      const fAng = (i / fissureCount) * Math.PI * 2 + i * 0.3;
      const fLen = r * 0.7 * Math.min(1, t * 3);
      const fAlpha = clampAlpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const segs = 7;
      for (let s = 1; s <= segs; s++) {
        const st = s / segs;
        const jitter = Math.sin(s * 4.3 + i * 1.7) * 5;
        const px = cx + Math.cos(fAng) * fLen * st + Math.cos(fAng + Math.PI / 2) * jitter;
        const py = cy + Math.sin(fAng) * fLen * st + Math.sin(fAng + Math.PI / 2) * jitter;
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(140,120,50,${fAlpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Glow inside cracks
      ctx.strokeStyle = `rgba(200,180,80,${fAlpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Seismic wave rings
    for (let w = 0; w < 3; w++) {
      const wT = Math.max(0, t - w * 0.1);
      if (wT <= 0) continue;
      const wR = r * 0.8 * wT;
      const wAlpha = (1 - wT) * clampAlpha * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, wR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160,140,60,${wAlpha})`;
      ctx.lineWidth = 3 - w;
      ctx.stroke();
    }

    // Dust clouds rising
    const dustCount = lateFusion ? 8 : 5;
    for (let i = 0; i < dustCount; i++) {
      const dAng = (i / dustCount) * Math.PI * 2;
      const dDist = r * 0.3 * (0.5 + 0.5 * Math.sin(i * 2.1));
      const dT = Math.min(1, t * 2);
      const dx = cx + Math.cos(dAng) * dDist;
      const dy = cy + Math.sin(dAng) * dDist - dT * 15;
      const dAlpha = (1 - dT) * clampAlpha * 0.3;
      ctx.beginPath();
      ctx.arc(dx, dy, 4 + dT * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,160,100,${dAlpha})`;
      ctx.fill();
    }

    // Aftershock spots at fissure tips
    if (t > 0.4) {
      const asT = (t - 0.4) / 0.6;
      for (let i = 0; i < fissureCount; i++) {
        const fAng = (i / fissureCount) * Math.PI * 2 + i * 0.3;
        const fLen = r * 0.65;
        const fx = cx + Math.cos(fAng) * fLen;
        const fy = cy + Math.sin(fAng) * fLen;
        const asAlpha = (1 - asT) * clampAlpha * 0.4;
        const asR = 6 * (asT);
        ctx.beginPath();
        ctx.arc(fx, fy, asR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,80,${asAlpha * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(160,140,60,${asAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  },
};

// ─── 16) ETERNAL HURRICANE (wind+wind) — massive wind circulation ────────────

const fusionEternalHurricane: AnimationDefinition = {
  id: 'fusion_eternal_hurricane',
  defaultDuration: 1.0,
  draw(ctx, inst) {
    const t = inst.progress;
    const cx = inst.sourceX, cy = inst.sourceY;
    const r = inst.radius;
    const lateFusion = (inst.payload['late'] as boolean) ?? false;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1;
    const stormR = r * (lateFusion ? 0.9 : 0.7);

    // Wind ring bands (concentric)
    const ringCount = lateFusion ? 5 : 3;
    const rotSpeed = t * Math.PI * 6;
    for (let i = 0; i < ringCount; i++) {
      const ringR = stormR * (0.3 + 0.7 * (i / ringCount));
      const rAng = rotSpeed * (1 + i * 0.2);
      const rAlpha = alpha * (0.35 - i * 0.05);
      // Draw partial arcs (wind lanes)
      for (let a = 0; a < 3; a++) {
        const aStart = rAng + (a / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, aStart, aStart + Math.PI * 0.5);
        ctx.strokeStyle = `rgba(180,230,130,${rAlpha})`;
        ctx.lineWidth = 2.5 - i * 0.3;
        ctx.stroke();
      }
    }

    // Debris particles orbiting at various speeds
    const debrisCount = lateFusion ? 10 : 6;
    for (let i = 0; i < debrisCount; i++) {
      const dR = stormR * (0.3 + 0.6 * ((i * 0.618) % 1));
      const dAng = rotSpeed * (0.8 + i * 0.1) + (i / debrisCount) * Math.PI * 2;
      const dx = cx + Math.cos(dAng) * dR;
      const dy = cy + Math.sin(dAng) * dR;
      const dAlpha = alpha * 0.6;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(dAng + t * 3);
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.lineTo(2, 0);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(150,200,100,${dAlpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Outer pressure boundary
    ctx.beginPath();
    ctx.arc(cx, cy, stormR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,210,120,${alpha * 0.2})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Edge drift visual (small arcs near boundary)
    for (let i = 0; i < 4; i++) {
      const eAng = rotSpeed * 0.5 + (i / 4) * Math.PI * 2;
      const eR = stormR * 0.95;
      ctx.beginPath();
      ctx.arc(cx, cy, eR, eAng, eAng + 0.4);
      ctx.strokeStyle = `rgba(200,240,150,${alpha * 0.35})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Calm center eye
    ctx.beginPath();
    ctx.arc(cx, cy, stormR * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,255,200,${alpha * 0.4})`;
    ctx.fill();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Evolution-specific Animations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FIRE EVOLUTIONS ─────────────────────────────────────────────────────────

/**
 * Incineradora — concentrated heavy-strike impact.
 * Crosshair lines converge, then imploding bright core at target.
 */
const fireIncinerator: AnimationDefinition = {
  id: 'fire_incinerator',
  defaultDuration: 0.45,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.9;
    const cx = inst.targetX, cy = inst.targetY;
    // Converging crosshair lines
    const lineLen = inst.radius * 0.5 * (1 - t);
    ctx.strokeStyle = `rgba(255,68,0,${alpha})`;
    ctx.lineWidth = 2;
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 2 + t * 0.3;
      const outer = lineLen;
      const inner = lineLen * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
      ctx.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
      ctx.stroke();
    }
    // Imploding bright core
    const coreR = inst.radius * 0.15 * (1 - t * 0.7);
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,200,50,${alpha * 0.8})`;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 12 * alpha;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Harsh impact ring (expands then fades fast)
    if (t < 0.5) {
      const ringR = inst.radius * 0.25 * (t / 0.5);
      const ringAlpha = (1 - t / 0.5) * 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,100,20,${ringAlpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },
};

/**
 * Lança-Chamas — cone/fan spray of flame from tower toward targets.
 * Wide arc with streaking flame particles.
 */
const fireFlamethrower: AnimationDefinition = {
  id: 'fire_flamethrower',
  defaultDuration: 0.5,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.6;
    const sx = inst.sourceX, sy = inst.sourceY;
    const dx = inst.targetX - sx, dy = inst.targetY - sy;
    const baseAngle = Math.atan2(dy, dx);
    const coneHalf = 0.55; // ~63° total cone
    const reach = inst.radius * (0.4 + 0.6 * t);
    // Flame cone fill
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, reach, baseAngle - coneHalf, baseAngle + coneHalf);
    ctx.closePath();
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach);
    grad.addColorStop(0, `rgba(255,200,50,${alpha * 0.6})`);
    grad.addColorStop(0.5, `rgba(255,120,20,${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(200,50,0,${alpha * 0.1})`);
    ctx.fillStyle = grad;
    ctx.fill();
    // Flame edge streaks
    ctx.strokeStyle = `rgba(255,140,30,${alpha * 0.8})`;
    ctx.lineWidth = 2;
    const streakCount = 5;
    for (let i = 0; i < streakCount; i++) {
      const ang = baseAngle - coneHalf + (2 * coneHalf) * (i / (streakCount - 1));
      const len = reach * (0.7 + 0.3 * Math.sin(t * 10 + i));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      ctx.stroke();
    }
  },
};

/**
 * Fornalha Viva — pulsing territorial heat zone on the ground.
 * Concentric heat rings with ember-like rising particles.
 */
const fireFurnace: AnimationDefinition = {
  id: 'fire_furnace',
  defaultDuration: 0.8,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.5;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    // Heat haze ground circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, `rgba(220,60,0,${alpha * 0.5})`);
    grd.addColorStop(0.6, `rgba(180,40,0,${alpha * 0.25})`);
    grd.addColorStop(1, `rgba(100,20,0,${alpha * 0.05})`);
    ctx.fillStyle = grd;
    ctx.fill();
    // Pulsing concentric rings
    for (let i = 0; i < 3; i++) {
      const phase = (t * 2 + i * 0.33) % 1;
      const ringR = r * phase;
      const ringAlpha = (1 - phase) * alpha * 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,100,20,${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Ember particles rising
    const embers = 6;
    for (let i = 0; i < embers; i++) {
      const ang = (i / embers) * Math.PI * 2 + t * 2;
      const dist = r * 0.3 + r * 0.5 * ((i + t * 3) % 1);
      const ey = cy + Math.sin(ang) * dist * 0.3 - t * 20;
      const ex = cx + Math.cos(ang) * dist;
      const ep = ((i * 0.17 + t * 2) % 1);
      const ea = (1 - ep) * alpha;
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${150 + Math.round(ep * 100)},30,${ea})`;
      ctx.fill();
    }
  },
};

// ─── WATER EVOLUTIONS ────────────────────────────────────────────────────────

/**
 * Criomante — crystalline ice shards radiating from target.
 * Geometric freeze burst with frosted edges.
 */
const waterCryomancer: AnimationDefinition = {
  id: 'water_cryomancer',
  defaultDuration: 0.55,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.8;
    const cx = inst.targetX, cy = inst.targetY;
    // Ice shard spikes radiating outward
    const shardCount = 8;
    const maxLen = inst.radius * 0.5 * (0.3 + 0.7 * t);
    ctx.strokeStyle = `rgba(150,230,255,${alpha})`;
    ctx.fillStyle = `rgba(200,240,255,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < shardCount; i++) {
      const ang = (i / shardCount) * Math.PI * 2;
      const len = maxLen * (0.6 + 0.4 * Math.sin(i * 1.5));
      const tipX = cx + Math.cos(ang) * len;
      const tipY = cy + Math.sin(ang) * len;
      const perpAng = ang + Math.PI / 2;
      const w = len * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * len * 0.1, cy + Math.sin(ang) * len * 0.1);
      ctx.lineTo(tipX + Math.cos(perpAng) * w, tipY + Math.sin(perpAng) * w);
      ctx.lineTo(tipX + Math.cos(ang) * w * 0.5, tipY + Math.sin(ang) * w * 0.5);
      ctx.lineTo(tipX - Math.cos(perpAng) * w, tipY - Math.sin(perpAng) * w);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Central frost core
    const coreR = inst.radius * 0.08 * (1 - t);
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,250,255,${alpha * 0.9})`;
    ctx.shadowColor = '#88ddff';
    ctx.shadowBlur = 10 * alpha;
    ctx.fill();
    ctx.shadowBlur = 0;
  },
};

/**
 * Maré Pressurizada — hydraulic pressure waves expanding outward.
 * Thick concentric rings that pulse rapidly.
 */
const waterPressureTide: AnimationDefinition = {
  id: 'water_pressure_tide',
  defaultDuration: 0.45,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.7;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    // Three thick pressure waves
    for (let i = 0; i < 3; i++) {
      const waveT = Math.max(0, t - i * 0.12);
      if (waveT <= 0) continue;
      const waveR = r * waveT;
      const waveAlpha = (1 - waveT) * alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34,136,204,${waveAlpha})`;
      ctx.lineWidth = 4 - i;
      ctx.stroke();
      // White crest on leading edge
      if (i === 0 && waveT < 0.7) {
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220,240,255,${waveAlpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // Central splash burst
    if (t < 0.3) {
      const splashAlpha = (1 - t / 0.3) * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,230,255,${splashAlpha})`;
      ctx.fill();
    }
  },
};

/**
 * Poço Abissal — dark vortex/whirlpool spinning at target position.
 * Inward-pulling spiral, debuff territory feel.
 */
const waterAbyssalWell: AnimationDefinition = {
  id: 'water_abyssal_well',
  defaultDuration: 0.9,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.6;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    // Dark vortex background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, `rgba(0,40,80,${alpha * 0.5})`);
    grd.addColorStop(0.7, `rgba(0,60,120,${alpha * 0.2})`);
    grd.addColorStop(1, `rgba(0,30,60,0)`);
    ctx.fillStyle = grd;
    ctx.fill();
    // Spiral arms rotating inward
    const arms = 3;
    const rotSpeed = t * Math.PI * 4;
    ctx.strokeStyle = `rgba(100,180,255,${alpha * 0.7})`;
    ctx.lineWidth = 2;
    for (let a = 0; a < arms; a++) {
      const baseAng = (a / arms) * Math.PI * 2 + rotSpeed;
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const st = s / 20;
        const spiralR = r * (1 - st) * (0.5 + 0.5 * (1 - t));
        const ang = baseAng + st * Math.PI * 1.5;
        const px = cx + Math.cos(ang) * spiralR;
        const py = cy + Math.sin(ang) * spiralR;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Central dark eye
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,50,100,${alpha * 0.9})`;
    ctx.fill();
  },
};

// ─── EARTH EVOLUTIONS ────────────────────────────────────────────────────────

/**
 * Balista Rochosa — heavy bolt trail from source to target with impact crack.
 * Linear piercing visual, solid and dry.
 */
const earthBallista: AnimationDefinition = {
  id: 'earth_ballista',
  defaultDuration: 0.35,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.8;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const dx = tx - sx, dy = ty - sy;
    const ang = Math.atan2(dy, dx);
    // Bolt trail (thick line, shrinks as it fades)
    const trailStart = Math.min(1, t * 3); // leading edge travels fast
    ctx.beginPath();
    const s0 = trailStart * 0.7;
    const s1 = Math.min(1, trailStart);
    ctx.moveTo(sx + dx * s0, sy + dy * s0);
    ctx.lineTo(sx + dx * s1, sy + dy * s1);
    ctx.strokeStyle = `rgba(136,102,34,${alpha})`;
    ctx.lineWidth = 4 * (1 - t * 0.5);
    ctx.stroke();
    // Impact crack at target (X-shaped)
    if (t > 0.15) {
      const crackAlpha = (1 - (t - 0.15) / 0.85) * 0.7;
      const crackLen = 12 + 8 * ((t - 0.15) / 0.85);
      ctx.strokeStyle = `rgba(160,140,80,${crackAlpha})`;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const ca = ang + Math.PI / 4 + (i * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(ca) * crackLen, ty + Math.sin(ca) * crackLen);
        ctx.stroke();
      }
    }
    // Debris particles at impact
    if (t > 0.2 && t < 0.7) {
      const dt2 = (t - 0.2) / 0.5;
      const debAlpha = (1 - dt2) * 0.6;
      for (let i = 0; i < 4; i++) {
        const da = i * Math.PI / 2 + t * 2;
        const dd = 8 + 15 * dt2;
        ctx.beginPath();
        ctx.arc(tx + Math.cos(da) * dd, ty + Math.sin(da) * dd, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,120,60,${debAlpha})`;
        ctx.fill();
      }
    }
  },
};

/**
 * Pedreira — debris fragments flying outward from center.
 * Multiple angular rock shards scattering.
 */
const earthQuarry: AnimationDefinition = {
  id: 'earth_quarry',
  defaultDuration: 0.5,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.7;
    const cx = inst.targetX, cy = inst.targetY;
    const r = inst.radius;
    // Ground crack ring
    const crackR = r * (0.3 + 0.7 * t);
    ctx.beginPath();
    ctx.arc(cx, cy, crackR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,100,40,${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Flying rock fragments
    const fragCount = 10;
    for (let i = 0; i < fragCount; i++) {
      const ang = (i / fragCount) * Math.PI * 2 + i * 0.4;
      const dist = r * 0.15 + r * 0.85 * t * (0.5 + 0.5 * Math.sin(i * 2.3));
      const fx = cx + Math.cos(ang) * dist;
      const fy = cy + Math.sin(ang) * dist - t * 5; // slight upward drift
      const fSize = 3 + 2 * Math.sin(i);
      const fAlpha = alpha * (1 - t * 0.3);
      // Draw angular rock shape
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang + t * 3);
      ctx.beginPath();
      ctx.moveTo(-fSize, -fSize * 0.5);
      ctx.lineTo(fSize * 0.5, -fSize);
      ctx.lineTo(fSize, fSize * 0.3);
      ctx.lineTo(-fSize * 0.3, fSize);
      ctx.closePath();
      ctx.fillStyle = `rgba(150,130,70,${fAlpha})`;
      ctx.strokeStyle = `rgba(100,90,50,${fAlpha})`;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Dust cloud at center
    if (t < 0.5) {
      const dustAlpha = (1 - t / 0.5) * alpha * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,160,100,${dustAlpha})`;
      ctx.fill();
    }
  },
};

/**
 * Monólito — support aura pulse radiating from tower.
 * Diamond-shaped aura with upward rising buff symbols. Not explosive.
 */
const earthMonolith: AnimationDefinition = {
  id: 'earth_monolith',
  defaultDuration: 0.7,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.6;
    const cx = inst.sourceX, cy = inst.sourceY;
    const r = inst.radius * (0.3 + 0.7 * t);
    // Diamond-shaped aura ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    ctx.strokeStyle = `rgba(153,204,68,${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner diamond
    const ir = r * 0.4;
    ctx.beginPath();
    ctx.rect(-ir, -ir, ir * 2, ir * 2);
    ctx.strokeStyle = `rgba(170,220,100,${alpha * 0.4})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // Soft aura glow
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
    grd.addColorStop(0, `rgba(160,200,80,${alpha * 0.2})`);
    grd.addColorStop(1, `rgba(140,180,60,0)`);
    ctx.fillStyle = grd;
    ctx.fill();
    // Rising buff symbols (small upward arrows)
    const arrowCount = 4;
    for (let i = 0; i < arrowCount; i++) {
      const ang = (i / arrowCount) * Math.PI * 2 + t;
      const ad = r * 0.35;
      const ax = cx + Math.cos(ang) * ad;
      const ay = cy + Math.sin(ang) * ad - t * 25;
      const aa = (1 - t) * 0.6;
      ctx.strokeStyle = `rgba(200,240,100,${aa})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 5);
      ctx.lineTo(ax, ay - 5);
      ctx.moveTo(ax - 3, ay - 2);
      ctx.lineTo(ax, ay - 5);
      ctx.lineTo(ax + 3, ay - 2);
      ctx.stroke();
    }
  },
};

// ─── WIND EVOLUTIONS ─────────────────────────────────────────────────────────

/**
 * Arpão Tempestivo — multiple thin fast bolts radiating from tower.
 * Sharp, precise, rapid-fire feel.
 */
const windHarpoon: AnimationDefinition = {
  id: 'wind_harpoon',
  defaultDuration: 0.3,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.7;
    const sx = inst.sourceX, sy = inst.sourceY;
    const tx = inst.targetX, ty = inst.targetY;
    const baseAng = Math.atan2(ty - sy, tx - sx);
    // Multiple thin bolts (3 converging)
    const spread = 0.2; // narrow spread
    const boltLen = inst.radius * 0.6;
    for (let i = -1; i <= 1; i++) {
      const ang = baseAng + i * spread;
      const headPos = Math.min(1, t * 2.5); // bolts travel fast
      const tailPos = Math.max(0, headPos - 0.4);
      const hx = sx + Math.cos(ang) * boltLen * headPos;
      const hy = sy + Math.sin(ang) * boltLen * headPos;
      const tStartX = sx + Math.cos(ang) * boltLen * tailPos;
      const tStartY = sy + Math.sin(ang) * boltLen * tailPos;
      ctx.beginPath();
      ctx.moveTo(tStartX, tStartY);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = `rgba(204,238,68,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Bright tip
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,255,100,${alpha})`;
      ctx.fill();
    }
  },
};

/**
 * Tempestade de Lâminas — slash/arc marks connecting between targets.
 * Ricochet feel with curved connecting lines.
 */
const windBladeStorm: AnimationDefinition = {
  id: 'wind_blade_storm',
  defaultDuration: 0.45,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.7;
    const cx = inst.sourceX, cy = inst.sourceY;
    const r = inst.radius;
    // Slash arcs radiating from center (ricochet feel)
    const slashCount = 5;
    ctx.lineWidth = 2;
    for (let i = 0; i < slashCount; i++) {
      const delay = i * 0.08;
      const st = Math.max(0, t - delay);
      if (st <= 0) continue;
      const sAlpha = (1 - st / (1 - delay)) * alpha;
      const ang = (i / slashCount) * Math.PI * 2 + t * 1.5;
      const dist = r * 0.2 + r * 0.6 * (st / (1 - delay));
      const sx2 = cx + Math.cos(ang) * dist;
      const sy2 = cy + Math.sin(ang) * dist;
      // Curved slash mark
      ctx.beginPath();
      const slashLen = 15;
      const perpAng = ang + Math.PI / 2;
      ctx.moveTo(sx2 - Math.cos(perpAng) * slashLen, sy2 - Math.sin(perpAng) * slashLen);
      ctx.quadraticCurveTo(
        sx2 + Math.cos(ang) * 8, sy2 + Math.sin(ang) * 8,
        sx2 + Math.cos(perpAng) * slashLen, sy2 + Math.sin(perpAng) * slashLen
      );
      ctx.strokeStyle = `rgba(170,221,170,${sAlpha})`;
      ctx.stroke();
    }
    // Central wind burst
    const burstR = r * 0.1 * (1 - t);
    ctx.beginPath();
    ctx.arc(cx, cy, burstR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,255,200,${alpha * 0.4})`;
    ctx.fill();
  },
};

/**
 * Ciclone Tático — rotating circular wind currents around tower.
 * Spiral control pattern, tactical slow feel.
 */
const windTacticalCyclone: AnimationDefinition = {
  id: 'wind_tactical_cyclone',
  defaultDuration: 0.65,
  draw(ctx, inst) {
    const t = inst.progress;
    const alpha = (1 - t) * 0.6;
    const cx = inst.sourceX, cy = inst.sourceY;
    const r = inst.radius * (0.4 + 0.6 * (1 - t * 0.3));
    // Rotating wind arcs (multiple partial circles)
    const arcCount = 4;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < arcCount; i++) {
      const baseAng = (i / arcCount) * Math.PI * 2 + t * Math.PI * 3;
      const arcR = r * (0.4 + 0.3 * i / arcCount);
      const arcAlpha = alpha * (1 - i * 0.15);
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, baseAng, baseAng + Math.PI * 0.7);
      ctx.strokeStyle = `rgba(119,204,170,${arcAlpha})`;
      ctx.stroke();
    }
    // Outer boundary ring (dashed, rotating)
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(150,230,200,${alpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    // Center calm eye
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,255,220,${alpha * 0.5})`;
    ctx.fill();
  },
};

// ─── Register All ────────────────────────────────────────────────────────────

export function registerAnimations(): void {
  registerAnimation(aoeFlash);
  registerAnimation(fireBurst);
  registerAnimation(frostNova);
  registerAnimation(earthQuake);
  registerAnimation(windGust);
  registerAnimation(chainLightning);
  registerAnimation(fusionBurst);
  // Evolution-specific animations
  registerAnimation(fireIncinerator);
  registerAnimation(fireFlamethrower);
  registerAnimation(fireFurnace);
  registerAnimation(waterCryomancer);
  registerAnimation(waterPressureTide);
  registerAnimation(waterAbyssalWell);
  registerAnimation(earthBallista);
  registerAnimation(earthQuarry);
  registerAnimation(earthMonolith);
  registerAnimation(windHarpoon);
  registerAnimation(windBladeStorm);
  registerAnimation(windTacticalCyclone);
  // Fusion-specific animations
  registerAnimation(fusionMagma);
  registerAnimation(fusionFireball);
  registerAnimation(fusionSwamp);
  registerAnimation(fusionMud);
  registerAnimation(fusionSandstorm);
  registerAnimation(fusionTornado);
  registerAnimation(fusionSteam);
  registerAnimation(fusionGeyser);
  registerAnimation(fusionInferno);
  registerAnimation(fusionLightning);
  registerAnimation(fusionBlizzard);
  registerAnimation(fusionTsunami);
  registerAnimation(fusionSolarCore);
  registerAnimation(fusionAbyssalVortex);
  registerAnimation(fusionPrimalQuake);
  registerAnimation(fusionEternalHurricane);
}
