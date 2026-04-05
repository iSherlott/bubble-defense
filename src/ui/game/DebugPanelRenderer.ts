import type { Rect } from '../RenderUtils';
import { drawButton, roundedRect } from '../RenderUtils';

export class DebugPanelRenderer {
  private debugBtns: Record<string, Rect> = {};

  getDebugBtns() { return this.debugBtns; }

  render(ctx: CanvasRenderingContext2D) {
    this.debugBtns = {};
    const pw = 240, pad = 8, btnH = 26, gap = 4;
    const cmds: [string, string][] = [
      ['gold_1000',   '💰  +1 000 Ouro'],
      ['gold_10000',  '💰  +10 000 Ouro'],
      ['levelup',     '⬆  Level Up (escolha)'],
      ['levelup10',   '⬆  +10 Levels (auto)'],
      ['maxlevel',    '⬆  Max Level 50'],
      ['heal',        '❤  Curar (max vidas)'],
      ['kill_all',    '💀  Matar Todos'],
      ['skip_wave',   '⏭  Pular Onda'],
      ['skip10',      '⏭  Pular +10 Ondas'],
      ['give_item',   '🎁  Item Aleatório'],
      ['max_towers',  '🏗  Max Todas Torres'],
      ['god_mode',    '🛡  God Mode (9999 HP)'],
    ];
    const ph = pad * 2 + cmds.length * (btnH + gap) - gap + 24;
    const px = 10, py = 10;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    roundedRect(ctx, px, py, pw, ph, 8); ctx.fill();
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
    roundedRect(ctx, px, py, pw, ph, 8); ctx.stroke();

    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'left';
    ctx.fillText('🐛 DEBUG  (F12 para fechar)', px + pad, py + 18);

    let by = py + 28;
    for (const [id, label] of cmds) {
      const r = { x: px + pad, y: by, w: pw - pad * 2, h: btnH };
      drawButton(ctx, r, label, '#1a0a0a', '#ff8866');
      this.debugBtns[id] = r;
      by += btnH + gap;
    }
    ctx.textAlign = 'left';
  }
}
