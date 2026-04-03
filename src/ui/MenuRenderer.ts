import type { ElementType, Stats } from '../types';
import type { Player } from '../player/Player';
import { ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS, ELEMENT_DESCRIPTIONS,
  STAT_LABELS, STAT_DESCRIPTIONS, STAT_ICONS, OPPOSITE_ELEMENT,
  ARCHETYPE_DEFS } from '../constants';
import { hasSave } from '../game/SaveSystem';
import type { Rect } from './RenderUtils';
import { btn, rr, mulberry32, wrapText } from './RenderUtils';

export class MenuRenderer {
  private menuBtns: Record<string, Rect> = {};
  private affinityRects: Map<string, Rect> = new Map();
  private archetypeRects: Map<string, Rect> = new Map();
  private archetypeBackRect: Rect | null = null;
  private bonusStatBtns: Record<string, Rect> = {};
  private bonusStartBtn: Rect | null = null;
  private bonusBackBtn: Rect | null = null;

  getMenuButtonRects() { return this.menuBtns; }
  getAffinityRects() { return this.affinityRects; }
  getArchetypeRects() { return this.archetypeRects; }
  getArchetypeBackRect() { return this.archetypeBackRect; }
  getBonusStatBtns() { return this.bonusStatBtns; }
  getBonusStartBtn() { return this.bonusStartBtn; }
  getBonusBackBtn() { return this.bonusBackBtn; }

  renderMenu(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#08081a'); bg.addColorStop(1, '#0d0d22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

    const rng = mulberry32(42);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 110; i++) ctx.fillRect(rng() * cw, rng() * ch, rng() * 2 + 0.5, rng() * 2 + 0.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 58px Segoe UI';
    ctx.shadowColor = '#6666ff'; ctx.shadowBlur = 22;
    ctx.fillText('DEFENSE POWER', cw / 2, 140); ctx.shadowBlur = 0;
    ctx.font = '17px Segoe UI'; ctx.fillStyle = '#6666aa';
    ctx.fillText('4 Elementos · Torres Evolutivas · Magia · Talentos', cw / 2, 184);

    const bw = 260, bh = 50, bx = cw / 2 - bw / 2;
    const ng = { x: bx, y: 240, w: bw, h: bh };
    btn(ctx, ng, '⚔  Novo Jogo', '#2a2a5a', '#8888ff'); this.menuBtns['newGame'] = ng;
    const hasS = hasSave();
    const lg = { x: bx, y: 308, w: bw, h: bh };
    btn(ctx, lg, '💾  Carregar Save', hasS ? '#1a3a1a' : '#1a1a2a', hasS ? '#55cc55' : '#445566');
    this.menuBtns['loadGame'] = lg;

    const elems: ElementType[] = ['fire', 'water', 'earth', 'wind'];
    const ew = 192, eh = 74, gap = 8, tw = elems.length * (ew + gap) - gap;
    elems.forEach((el, i) => {
      const rx = cw / 2 - tw / 2 + i * (ew + gap), ry = 400;
      ctx.fillStyle = ELEMENT_COLORS[el] + '22'; ctx.strokeStyle = ELEMENT_COLORS[el] + '88';
      ctx.lineWidth = 1; rr(ctx, rx, ry, ew, eh, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ELEMENT_COLORS[el]; ctx.font = '24px serif'; ctx.fillText(ELEMENT_ICONS[el], rx + 24, ry + 42);
      ctx.font = 'bold 13px Segoe UI'; ctx.fillText(ELEMENT_NAMES[el], rx + ew / 2 + 12, ry + 28);
      ctx.font = '10px Segoe UI'; ctx.fillStyle = '#666688';
      ctx.fillText('vs ' + ELEMENT_NAMES[OPPOSITE_ELEMENT[el]], rx + ew / 2 + 12, ry + 46);
    });
    ctx.fillStyle = '#444466'; ctx.font = '12px Segoe UI';
    ctx.fillText('Clique direito → detalhes  |  P = pausar  |  Custo inicial: 50g (multiplica por torres colocadas)', cw / 2, 520);
  }

  renderAffinity(ctx: CanvasRenderingContext2D, cw: number, ch: number, player: Player) {
    ctx.fillStyle = '#09091c'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddddff'; ctx.font = 'bold 36px Segoe UI';
    ctx.fillText('✨  Escolha sua Aptidão Elemental', cw / 2, 72);
    ctx.font = '14px Segoe UI'; ctx.fillStyle = '#8888aa';
    ctx.fillText('Seu elemento: torres desse tipo causam 2× dano.  Sem penalidade nos demais.', cw / 2, 104);
    ctx.fillText('50 atributos iniciais distribuídos aleatoriamente (mín. 5 cada).', cw / 2, 122);

    const elems: ElementType[] = ['fire', 'water', 'earth', 'wind'];
    const cW = 206, cH = 268, gap = 16, total = elems.length * (cW + gap) - gap;
    const startX = cw / 2 - total / 2, cardY = 150;
    this.affinityRects.clear();
    elems.forEach((el, i) => {
      const rx = startX + i * (cW + gap);
      ctx.fillStyle = ELEMENT_COLORS[el] + '18'; ctx.strokeStyle = ELEMENT_COLORS[el] + 'cc';
      ctx.lineWidth = 2; rr(ctx, rx, cardY, cW, cH, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ELEMENT_COLORS[el]; ctx.font = '48px serif';
      ctx.fillText(ELEMENT_ICONS[el], rx + cW / 2, cardY + 64);
      ctx.font = 'bold 18px Segoe UI'; ctx.fillText(ELEMENT_NAMES[el], rx + cW / 2, cardY + 96);
      ctx.font = '12px Segoe UI'; ctx.fillStyle = '#88ff88';
      ctx.fillText('2× dano para torres deste elemento', rx + cW / 2, cardY + 118);
      ctx.fillStyle = '#778899'; ctx.font = '10px Segoe UI';
      wrapText(ELEMENT_DESCRIPTIONS[el], 28).forEach((l, li) => ctx.fillText(l, rx + cW / 2, cardY + 144 + li * 14));
      const by = cardY + cH - 40;
      rr(ctx, rx + 14, by, cW - 28, 30, 8);
      ctx.fillStyle = ELEMENT_COLORS[el] + '44'; ctx.fill();
      ctx.strokeStyle = ELEMENT_COLORS[el]; ctx.lineWidth = 1.5;
      rr(ctx, rx + 14, by, cW - 28, 30, 8); ctx.stroke();
      ctx.fillStyle = ELEMENT_COLORS[el]; ctx.font = 'bold 12px Segoe UI';
      ctx.fillText('Escolher', rx + cW / 2, by + 20);
      this.affinityRects.set(el, { x: rx, y: cardY, w: cW, h: cH });
    });
    ctx.fillStyle = '#555566'; ctx.font = '12px Segoe UI';
    ctx.fillText('Clique em um elemento para iniciar', cw / 2, cardY + cH + 26);
  }

  renderArchetype(ctx: CanvasRenderingContext2D, cw: number, ch: number, affinity: ElementType) {
    ctx.fillStyle = '#09091c'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddddff'; ctx.font = 'bold 32px Segoe UI';
    ctx.fillText('🛡  Escolha seu Arquétipo', cw / 2, 60);
    ctx.font = '13px Segoe UI'; ctx.fillStyle = '#8888aa';
    ctx.fillText(`Aptidão: ${ELEMENT_ICONS[affinity]} ${ELEMENT_NAMES[affinity]}  —  Cada arquétipo define seus atributos base + 5 pontos bônus.`, cw / 2, 90);

    const archs = ARCHETYPE_DEFS;
    const cW = 200, cH = 280, gap = 16, total = archs.length * (cW + gap) - gap;
    const startX = cw / 2 - total / 2, cardY = 115;
    this.archetypeRects.clear();

    const statKeys: (keyof Stats)[] = ['strength', 'intelligence', 'dexterity', 'agility', 'luck', 'vitality'];
    archs.forEach((arch, i) => {
      const rx = startX + i * (cW + gap);
      ctx.fillStyle = arch.color + '18'; ctx.strokeStyle = arch.color + 'cc';
      ctx.lineWidth = 2; rr(ctx, rx, cardY, cW, cH, 14); ctx.fill(); ctx.stroke();

      ctx.fillStyle = arch.color; ctx.font = '42px serif';
      ctx.fillText(arch.icon, rx + cW / 2, cardY + 52);
      ctx.font = 'bold 17px Segoe UI'; ctx.fillText(arch.name, rx + cW / 2, cardY + 78);

      ctx.font = '10px Segoe UI'; ctx.fillStyle = '#aaaacc';
      wrapText(arch.description, 24).forEach((l, li) => ctx.fillText(l, rx + cW / 2, cardY + 96 + li * 13));

      let sy = cardY + 148;
      ctx.textAlign = 'left';
      for (const k of statKeys) {
        const v = arch.baseStats[k];
        ctx.fillStyle = '#667788'; ctx.font = '9px Segoe UI';
        ctx.fillText(`${STAT_ICONS[k]} ${STAT_LABELS[k]}`, rx + 10, sy + 9);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(rx + 100, sy, 86, 10);
        const pct = Math.min(1, v / 20);
        ctx.fillStyle = arch.color + '88';
        ctx.fillRect(rx + 100, sy, 86 * pct, 10);
        ctx.fillStyle = '#ddddee'; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'right';
        ctx.fillText(String(v), rx + cW - 10, sy + 9);
        ctx.textAlign = 'left';
        sy += 16;
      }
      ctx.textAlign = 'center';

      const by = cardY + cH - 36;
      rr(ctx, rx + 14, by, cW - 28, 28, 8);
      ctx.fillStyle = arch.color + '44'; ctx.fill();
      ctx.strokeStyle = arch.color; ctx.lineWidth = 1.5;
      rr(ctx, rx + 14, by, cW - 28, 28, 8); ctx.stroke();
      ctx.fillStyle = arch.color; ctx.font = 'bold 12px Segoe UI';
      ctx.fillText('Escolher', rx + cW / 2, by + 19);
      this.archetypeRects.set(arch.id, { x: rx, y: cardY, w: cW, h: cH });
    });

    const backW = 120, backH = 28;
    const backRect = { x: cw / 2 - backW / 2, y: cardY + cH + 16, w: backW, h: backH };
    btn(ctx, backRect, '← Voltar', '#1a1a2a', '#8888aa');
    this.archetypeBackRect = backRect;

    ctx.textAlign = 'left';
  }

  renderBonus(ctx: CanvasRenderingContext2D, cw: number, ch: number, player: Player) {
    ctx.fillStyle = '#09091c'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddddff'; ctx.font = 'bold 28px Segoe UI';
    ctx.fillText('🎲  Distribua seus Pontos Bônus', cw / 2, 50);
    ctx.fillStyle = '#8888aa'; ctx.font = '13px Segoe UI';
    ctx.fillText(`Pontos restantes: ${player.bonusPoints}`, cw / 2, 78);

    const statKeys: (keyof Stats)[] = ['strength', 'intelligence', 'dexterity', 'agility', 'luck', 'vitality'];
    const statColors: Record<string, string> = { strength: '#ff6644', intelligence: '#aa66ff', dexterity: '#66ccff', agility: '#ffcc33', luck: '#44dd44', vitality: '#ff6699' };
    const rowH = 52, startY = 110;
    const panelW = 440, panelX = cw / 2 - panelW / 2;
    this.bonusStatBtns = {};

    statKeys.forEach((k, i) => {
      const y = startY + i * rowH;
      ctx.fillStyle = i % 2 === 0 ? '#0d0d1e' : '#10102a';
      ctx.fillRect(panelX, y, panelW, rowH - 4);

      ctx.textAlign = 'left';
      ctx.fillStyle = statColors[k]; ctx.font = 'bold 14px Segoe UI';
      ctx.fillText(`${STAT_ICONS[k]} ${STAT_LABELS[k]}`, panelX + 14, y + 22);
      ctx.fillStyle = '#7777aa'; ctx.font = '10px Segoe UI';
      ctx.fillText(STAT_DESCRIPTIONS[k], panelX + 14, y + 38);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#eeeeff'; ctx.font = 'bold 22px Segoe UI';
      ctx.fillText(String(player.stats[k]), panelX + panelW - 90, y + 30);

      const btnR = { x: panelX + panelW - 50, y: y + 8, w: 36, h: 32 };
      const canAdd = player.bonusPoints > 0;
      rr(ctx, btnR.x, btnR.y, btnR.w, btnR.h, 6);
      ctx.fillStyle = canAdd ? statColors[k] + '33' : '#1a1a2a'; ctx.fill();
      rr(ctx, btnR.x, btnR.y, btnR.w, btnR.h, 6);
      ctx.strokeStyle = canAdd ? statColors[k] : '#333344'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = canAdd ? '#eeeeff' : '#444455'; ctx.font = 'bold 18px Segoe UI';
      ctx.fillText('+', btnR.x + btnR.w / 2, btnR.y + 23);
      this.bonusStatBtns[k] = btnR;
    });

    ctx.textAlign = 'center';

    const allSpent = player.bonusPoints <= 0;
    const startW = 180, startH = 38;
    const startRect = { x: cw / 2 - startW / 2, y: startY + statKeys.length * rowH + 20, w: startW, h: startH };
    rr(ctx, startRect.x, startRect.y, startRect.w, startRect.h, 10);
    ctx.fillStyle = allSpent ? '#224422' : '#1a1a2a'; ctx.fill();
    rr(ctx, startRect.x, startRect.y, startRect.w, startRect.h, 10);
    ctx.strokeStyle = allSpent ? '#55cc55' : '#333344'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = allSpent ? '#55ff55' : '#555566'; ctx.font = 'bold 16px Segoe UI';
    ctx.fillText(allSpent ? '⚔ Iniciar Partida' : 'Distribua todos os pontos', startRect.x + startRect.w / 2, startRect.y + 25);
    this.bonusStartBtn = startRect;

    const backW = 120, backH = 28;
    const backRect = { x: cw / 2 - backW / 2, y: startRect.y + startH + 14, w: backW, h: backH };
    btn(ctx, backRect, '← Voltar', '#1a1a2a', '#8888aa');
    this.bonusBackBtn = backRect;

    ctx.textAlign = 'left';
  }
}
