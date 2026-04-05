import type { Vec2, OwnedItem, ItemDropAnim, ItemDef } from '../../types';
import { ITEM_RARITY_COLORS, ITEM_RARITY_NAMES } from '../../constants';
import { itemRegistry } from '../../registries';
import { roundedRect, wrapText } from '../RenderUtils';

export class ItemsHudRenderer {
  render(ctx: CanvasRenderingContext2D, gw: number, items: OwnedItem[], mouse: Vec2) {
    if (items.length === 0) return;
    const padding = 4, iconSize = 28, gap = 3;
    const totalW = items.length * (iconSize + gap) - gap + padding * 2;
    const hx = gw / 2 - totalW / 2, hy = 2;

    ctx.fillStyle = 'rgba(10,10,30,0.75)';
    roundedRect(ctx, hx, hy, totalW, iconSize + padding * 2, 6); ctx.fill();
    ctx.strokeStyle = '#333366'; ctx.lineWidth = 1;
    roundedRect(ctx, hx, hy, totalW, iconSize + padding * 2, 6); ctx.stroke();

    let ix = hx + padding;
    let hoveredDef: ItemDef | null = null;
    let hoveredX = 0, hoveredStacks = 1;

    for (const owned of items) {
      const def = itemRegistry.getDef(owned.defId);
      if (!def) continue;
      const rc = ITEM_RARITY_COLORS[def.rarity];
      const itemRect = { x: ix, y: hy + padding, w: iconSize, h: iconSize };

      const hovered = mouse.x >= itemRect.x && mouse.x <= itemRect.x + itemRect.w &&
        mouse.y >= itemRect.y && mouse.y <= itemRect.y + itemRect.h;
      if (hovered) { hoveredDef = def; hoveredX = ix + iconSize / 2; hoveredStacks = owned.stacks; }

      ctx.fillStyle = def.rarity === 'legendary' ? '#2a2000'
        : def.rarity === 'epic' ? '#1a0030'
        : def.rarity === 'rare' ? '#0a1530'
        : '#141422';
      roundedRect(ctx, ix, hy + padding, iconSize, iconSize, 4); ctx.fill();
      ctx.strokeStyle = hovered ? rc : rc + 'aa'; ctx.lineWidth = hovered ? 2 : 1;
      roundedRect(ctx, ix, hy + padding, iconSize, iconSize, 4); ctx.stroke();

      ctx.font = '16px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(def.icon, ix + iconSize / 2, hy + padding + iconSize / 2 + 6);

      if (owned.stacks > 1) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'right';
        ctx.fillText(`×${owned.stacks}`, ix + iconSize - 1, hy + padding + iconSize - 1);
      }
      ctx.textAlign = 'left';
      ix += iconSize + gap;
    }

    if (hoveredDef) {
      const rc = ITEM_RARITY_COLORS[hoveredDef.rarity];
      const rarityName = ITEM_RARITY_NAMES[hoveredDef.rarity];
      const lines = wrapText(hoveredDef.description, 30);
      const tw = Math.max(180, hoveredDef.name.length * 8 + 20);
      const th = 20 + 14 * (lines.length + 1) + 8;
      const tx = Math.max(4, Math.min(hoveredX - tw / 2, gw - tw - 4));
      const ty = hy + padding + iconSize + 4;

      ctx.fillStyle = 'rgba(8,8,24,0.95)';
      roundedRect(ctx, tx, ty, tw, th, 8); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 1.5;
      roundedRect(ctx, tx, ty, tw, th, 8); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI';
      ctx.fillText(`${hoveredDef.name}${hoveredStacks > 1 ? ` ×${hoveredStacks}` : ''}`, tx + tw / 2, ty + 14);
      ctx.fillStyle = '#aaaacc'; ctx.font = '9px Segoe UI';
      ctx.fillText(`[${rarityName}]`, tx + tw / 2, ty + 24);
      lines.forEach((l, li) => {
        ctx.fillStyle = '#ddddee';
        ctx.fillText(l, tx + tw / 2, ty + 36 + li * 13);
      });
      ctx.textAlign = 'left';
    }
  }

  renderItemDropAnim(ctx: CanvasRenderingContext2D, gw: number, gh: number, anim: ItemDropAnim) {
    const cx = gw / 2, cy = gh / 2;
    const t = anim.timer;
    const item = anim.item;
    const rc = ITEM_RARITY_COLORS[item.rarity];

    ctx.save();

    if (anim.phase === 'rising') {
      const p = Math.min(1, t / 0.6);
      const scale = p * 1.2;
      ctx.globalAlpha = p;

      ctx.shadowColor = rc; ctx.shadowBlur = 30 + p * 20;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundedRect(ctx, cx - 100, cy - 60, 200, 120, 16); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      roundedRect(ctx, cx - 100, cy - 60, 200, 120, 16); ctx.stroke();

      ctx.font = `${Math.round(40 * scale)}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.icon, cx, cy + 5 * scale);

    } else if (anim.phase === 'showing') {
      ctx.globalAlpha = 1;
      const sparkle = 0.7 + 0.3 * Math.sin(t * 8);

      ctx.shadowColor = rc; ctx.shadowBlur = 25 * sparkle;
      ctx.fillStyle = 'rgba(8,8,25,0.92)';
      roundedRect(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      roundedRect(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.stroke();

      ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(), cx, cy - 60);
      ctx.font = '44px serif';
      ctx.fillText(item.icon, cx, cy + 4);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Segoe UI';
      ctx.fillText(item.name, cx, cy + 36);
      ctx.fillStyle = '#aaaacc'; ctx.font = '10px Segoe UI';
      ctx.fillText(item.description, cx, cy + 54);

      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * Math.PI * 2 + t * 2;
        const dist = 50 + 15 * Math.sin(t * 4 + i);
        const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
        ctx.fillStyle = `rgba(255,255,200,${sparkle * 0.6})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2 + sparkle, 0, Math.PI * 2); ctx.fill();
      }

    } else {
      const fadeStart = 2.0;
      const p = Math.max(0, 1 - (t - fadeStart) / 0.5);
      ctx.globalAlpha = p;

      ctx.fillStyle = 'rgba(8,8,25,0.92)';
      roundedRect(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      roundedRect(ctx, cx - 120, cy - 80, 240, 160, 16); ctx.stroke();

      ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(), cx, cy - 60);
      ctx.font = '44px serif'; ctx.fillText(item.icon, cx, cy + 4);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Segoe UI';
      ctx.fillText(item.name, cx, cy + 36);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
