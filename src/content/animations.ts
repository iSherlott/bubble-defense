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

export function registerAnimations(): void {
  registerAnimation(aoeFlash);
  registerAnimation(fireBurst);
  registerAnimation(frostNova);
  registerAnimation(earthQuake);
  registerAnimation(windGust);
  registerAnimation(chainLightning);
  registerAnimation(fusionBurst);
}
