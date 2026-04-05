export type Rect = { x: number; y: number; w: number; h: number };

export function drawButton(ctx: CanvasRenderingContext2D, rect: Rect, label: string, bg: string, fg: string) {
  ctx.fillStyle = bg; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.fill();
  ctx.strokeStyle = fg; ctx.lineWidth = 1.5; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.stroke();
  ctx.fillStyle = fg; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
}

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(' '), lines: string[] = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) { if (cur) lines.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur.trim()); return lines;
}

export function wrapTextLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = w;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, y);
}
