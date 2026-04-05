// types used indirectly via Player/TalentTree
import type { Player } from '../player/Player';
import type { SkillTree as TalentTree } from '../player/SkillTree';
import { STAT_LABELS, STAT_DESCRIPTIONS, STAT_ICONS,
  ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS,
  TALENT_POINT_EVERY } from '../constants';
import { towerRegistry, enemyRegistry, evolutionRegistry } from '../registries';
import type { Rect } from './RenderUtils';
import { drawButton, roundedRect, mulberry32, wrapText, wrapTextLeft } from './RenderUtils';

export class OverlayRenderer {
  private levelUpBtns: Record<string, Rect> = {};
  private talentRects: Map<string, Rect> = new Map();
  private talentBackRect: Rect | null = null;
  private bestiaryRects: Record<string, Rect> = {};
  private bestiaryPage = 0;
  private bestiaryScroll = 0;
  private bestiaryContentH = 0;
  private gameOverBtns: Record<string, Rect> = {};
  private _mousePos: { x: number; y: number } | null = null;

  getLevelUpButtonRects() { return this.levelUpBtns; }
  getTalentRects() { return this.talentRects; }
  getTalentBackRect() { return this.talentBackRect; }
  getGameOverButtonRects() { return this.gameOverBtns; }
  getBestiaryRects() { return this.bestiaryRects; }
  setMousePos(pos: { x: number; y: number }) { this._mousePos = pos; }

  handleBestiaryTabClick(p: { x: number; y: number }, hit: (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) => boolean) {
    for (let i = 0; i < 3; i++) {
      const r = this.bestiaryRects[`tab_${i}`];
      if (r && hit(p, r)) { this.bestiaryPage = i; this.bestiaryScroll = 0; break; }
    }
  }

  handleBestiaryWheel(deltaY: number, viewH: number) {
    const startY = 88;
    const maxScroll = Math.max(0, this.bestiaryContentH - (viewH - startY - 60));
    this.bestiaryScroll = Math.max(0, Math.min(maxScroll, this.bestiaryScroll + deltaY * 0.5));
  }

  renderLevelUp(ctx: CanvasRenderingContext2D, cw: number, ch: number, player: Player) {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddddff'; ctx.font = 'bold 38px Segoe UI';
    ctx.fillText(`🎉  Nível ${player.level}!`, cw / 2, 106);
    if (player.level % TALENT_POINT_EVERY === 0) {
      ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 16px Segoe UI';
      ctx.fillText('⭐ Ponto de Talento desbloqueado!', cw / 2, 140);
    }
    ctx.font = '16px Segoe UI'; ctx.fillStyle = '#9999cc';
    ctx.fillText('Escolha um atributo:', cw / 2, player.level % TALENT_POINT_EVERY === 0 ? 166 : 148);

    const keys = ['strength', 'intelligence', 'dexterity', 'agility', 'luck', 'vitality'] as const;
    const cols = 3, bw = 240, bh = 84, gap = 16, totalW = cols * bw + (cols - 1) * gap;
    const startX = cw / 2 - totalW / 2, startY = player.level % TALENT_POINT_EVERY === 0 ? 188 : 170;
    this.levelUpBtns = {};
    keys.forEach((stat, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const rect = { x: startX + col * (bw + gap), y: startY + row * (bh + gap), w: bw, h: bh };
      ctx.fillStyle = '#0c0c22'; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
      ctx.strokeStyle = '#4444aa'; ctx.lineWidth = 1.5; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
      ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 15px Segoe UI';
      ctx.fillText(`${STAT_ICONS[stat]} ${STAT_LABELS[stat]}`, rect.x + bw / 2, rect.y + 26);
      ctx.fillStyle = '#7777aa'; ctx.font = '12px Segoe UI';
      ctx.fillText(STAT_DESCRIPTIONS[stat], rect.x + bw / 2, rect.y + 44);
      ctx.fillStyle = '#6666aa'; ctx.font = '11px Segoe UI';
      ctx.fillText(`Atual: ${player.stats[stat]}`, rect.x + bw / 2, rect.y + 62);
      this.levelUpBtns[stat] = rect;
    });
  }

  renderTalents(ctx: CanvasRenderingContext2D, cw: number, ch: number, player: Player, talentTree: TalentTree) {
    ctx.fillStyle = '#04040f'; ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const rng = mulberry32(77);
    for (let i = 0; i < 200; i++) ctx.fillRect(rng() * cw, rng() * ch, rng() * 1.5 + 0.5, rng() * 1.5 + 0.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ccccff'; ctx.font = 'bold 22px Segoe UI';
    ctx.fillText('✨  Constelação de Talentos', cw / 2, 30);
    ctx.fillStyle = '#6666aa'; ctx.font = '12px Segoe UI';
    const nextPt = Math.ceil(Math.max(1, player.level) / TALENT_POINT_EVERY) * TALENT_POINT_EVERY;
    ctx.fillText(`Pontos: ${player.talentPoints}  ·  Nível ${player.level}  ·  Próximo ponto: nível ${nextPt}`, cw / 2, 50);

    const LOGIC_W = 1000, LOGIC_H = 700;
    const pad = 60;
    const scaleX = (cw - pad * 2) / LOGIC_W, scaleY = (ch - pad - 70) / LOGIC_H;
    const scale = Math.min(scaleX, scaleY);
    const originX = cw / 2 - LOGIC_W * scale / 2;
    const originY = 70;
    const sx = (lx: number) => originX + lx * scale;
    const sy = (ly: number) => originY + ly * scale;

    const elColor: Record<string, string> = {
      fire: '#ff6633', water: '#3399ff', earth: '#77cc33', wind: '#ffee33', neutral: '#aaaaff',
    };

    const lines = talentTree.getConnectionLines();
    for (const { fromId, toId, active } of lines) {
      const a = talentTree.nodes.get(fromId), b = talentTree.nodes.get(toId);
      if (!a || !b) continue;
      const aPurch = a.purchased, bPurch = b.purchased;
      const bothPurch = aPurch && bPurch;
      ctx.beginPath();
      ctx.moveTo(sx(a.position.x), sy(a.position.y));
      ctx.lineTo(sx(b.position.x), sy(b.position.y));
      if (bothPurch) {
        const col = elColor[a.element] ?? '#aaaaff';
        ctx.strokeStyle = col + '99'; ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = col + '44'; ctx.lineWidth = 7;
        ctx.stroke();
      } else if (active || (aPurch || bPurch)) {
        ctx.strokeStyle = '#445566'; ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    this.talentRects.clear();
    const nodeR = Math.max(16, Math.round(22 * scale));

    for (const node of talentTree.nodes.values()) {
      const nx = sx(node.position.x), ny = sy(node.position.y);
      const purchased = node.purchased;
      const canBuy = node.cost > 0 && talentTree.canPurchase(node.id, player.level, player.talentPoints);
      const col = elColor[node.element] ?? '#aaaaff';

      if (canBuy) {
        ctx.beginPath(); ctx.arc(nx, ny, nodeR + 6, 0, Math.PI * 2);
        ctx.fillStyle = col + '22'; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      if (purchased) ctx.fillStyle = col + '55';
      else if (canBuy) ctx.fillStyle = '#1a1a3a';
      else ctx.fillStyle = '#0a0a16';
      ctx.fill();

      ctx.beginPath(); ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      ctx.strokeStyle = purchased ? col : canBuy ? (col + '88') : '#2a2a44';
      ctx.lineWidth = purchased ? 2.5 : 1.5;
      ctx.stroke();

      const iconSize = Math.max(10, Math.round(14 * scale));
      ctx.font = `${iconSize}px "Segoe UI Emoji", serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = purchased ? '#ffffff' : canBuy ? col + 'cc' : '#334455';
      ctx.fillText(node.icon, nx, ny + iconSize * 0.35);

      const labelSize = Math.max(7, Math.round(9 * scale));
      ctx.font = `${purchased ? 'bold ' : ''} ${labelSize}px Segoe UI`;
      ctx.fillStyle = purchased ? col : canBuy ? '#9999cc' : '#334455';
      ctx.fillText(node.name, nx, ny + nodeR + labelSize + 2);

      if (!purchased && node.cost > 0) {
        const badgeSize = Math.max(6, Math.round(8 * scale));
        ctx.font = `${badgeSize}px Segoe UI`;
        ctx.fillStyle = canBuy ? '#ffee44' : '#445544';
        ctx.fillText(`${node.cost}pt`, nx, ny + nodeR + labelSize + badgeSize + 4);
      }

      const hw = nodeR * 2 + 20, hh = nodeR * 2 + 30;
      this.talentRects.set(node.id, { x: nx - hw / 2, y: ny - nodeR, w: hw, h: hh });
    }

    for (const [id, r] of this.talentRects) {
      if (this._mousePos && this._mousePos.x >= r.x && this._mousePos.x <= r.x + r.w
        && this._mousePos.y >= r.y && this._mousePos.y <= r.y + r.h) {
        const node = talentTree.nodes.get(id);
        if (node) this._renderSkillTooltip(ctx, cw, ch, node, player.talentPoints,
          talentTree.canPurchase(id, player.level, player.talentPoints), elColor);
        break;
      }
    }

    const backRect = { x: 20, y: ch - 48, w: 160, h: 34 };
    drawButton(ctx, backRect, '← Voltar', '#1a1a2e', '#6666aa');
    this.talentBackRect = backRect;
    ctx.textAlign = 'center';
  }

  private _renderSkillTooltip(
    ctx: CanvasRenderingContext2D,
    cw: number, ch: number,
    node: { name: string; description: string; element: string; requires: string[]; requiredLevel: number; cost: number; purchased: boolean },
    _talentPoints: number,
    canBuy: boolean,
    elColor: Record<string, string>,
  ) {
    const mx = this._mousePos!.x, my = this._mousePos!.y;
    const tw = 220, lines = wrapText(node.description, 32);
    const th = 22 + 14 * (lines.length + 2) + 12;
    let tx = mx + 16, ty = my - th / 2;
    if (tx + tw > cw - 8) tx = mx - tw - 8;
    if (ty < 8) ty = 8;
    if (ty + th > ch - 8) ty = ch - th - 8;

    ctx.fillStyle = '#0c0c22ee';
    roundedRect(ctx, tx, ty, tw, th, 8); ctx.fill();
    ctx.strokeStyle = elColor[node.element] ?? '#aaaaff';
    ctx.lineWidth = 1.5; roundedRect(ctx, tx, ty, tw, th, 8); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = elColor[node.element] ?? '#ccccff'; ctx.font = 'bold 12px Segoe UI';
    ctx.fillText(node.name, tx + 10, ty + 16);
    ctx.fillStyle = '#778899'; ctx.font = '10px Segoe UI';
    lines.forEach((l, i) => ctx.fillText(l, tx + 10, ty + 30 + i * 13));
    const reqY = ty + 30 + lines.length * 13 + 4;
    if (node.requires.length > 0) {
      ctx.fillStyle = '#556677'; ctx.font = '9px Segoe UI';
      ctx.fillText('Requer: ' + node.requires.join(', '), tx + 10, reqY + 10);
    }
    ctx.fillStyle = node.purchased ? '#44cc44' : canBuy ? '#ffee44' : '#664444';
    ctx.font = '9px Segoe UI';
    ctx.fillText(node.purchased ? '✓ Comprado' : canBuy ? `${node.cost}pt — disponível` : `Nível ${node.requiredLevel} necessário`, tx + 10, reqY + 22);
    ctx.textAlign = 'center';
  }

  renderBestiary(ctx: CanvasRenderingContext2D, cw: number, ch: number, returnScreen = 'game') {
    this.bestiaryRects = {};
    ctx.fillStyle = '#080814'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';

    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 20px Segoe UI';
    ctx.fillText('📖 Mostruário', cw / 2, 34);

    const tabs = ['Torres', 'Inimigos', 'Golems Elementais'];
    const tw = 180, tgap = 12, totalTW = tabs.length * tw + (tabs.length - 1) * tgap;
    const tx0 = cw / 2 - totalTW / 2;
    tabs.forEach((tab, i) => {
      const r = { x: tx0 + i * (tw + tgap), y: 48, w: tw, h: 28 };
      const sel = this.bestiaryPage === i;
      ctx.fillStyle = sel ? '#1e1e44' : '#0e0e22';
      roundedRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
      ctx.strokeStyle = sel ? '#8888ff' : '#333355'; ctx.lineWidth = sel ? 2 : 1;
      roundedRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.stroke();
      ctx.fillStyle = sel ? '#ddddff' : '#666688'; ctx.font = `${sel ? 'bold ' : ''}11px Segoe UI`;
      ctx.fillText(tab, r.x + tw / 2, r.y + 19);
      this.bestiaryRects[`tab_${i}`] = r;
    });

    const startY = 88;
    const scrollY = this.bestiaryScroll;

    // Clip content area below tabs
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, cw, ch - startY - 60);
    ctx.clip();

    if (this.bestiaryPage === 0) {
      const cols = 2, bw = (cw - 60) / cols, bh = 230, gap = 12;
      const defs = towerRegistry.getAllDefs();
      const rows = Math.ceil(defs.length / cols);
      this.bestiaryContentH = rows * (bh + gap);
      defs.forEach((def, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - scrollY;
        const ec = ELEMENT_COLORS[def.element];
        ctx.fillStyle = '#0d0d20'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = ec + '66'; ctx.lineWidth = 1.5; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 36, by + 40, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = def.accentColor; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '18px serif'; ctx.fillStyle = ec; ctx.textAlign = 'center';
        ctx.fillText(ELEMENT_ICONS[def.element], bx + 36, by + 47);

        ctx.textAlign = 'left';
        ctx.fillStyle = ec; ctx.font = 'bold 13px Segoe UI';
        ctx.fillText(def.name, bx + 70, by + 22);
        ctx.fillStyle = '#8888aa'; ctx.font = '9px Segoe UI';
        ctx.fillText(`Elemento: ${ELEMENT_NAMES[def.element]}  |  Custo base: ${def.baseCost}g`, bx + 70, by + 36);
        ctx.fillStyle = '#777799'; ctx.font = '9px Segoe UI';
        ctx.fillText(`Dano: ${def.baseDamage}  Range: ${def.baseRange}  Cadência: ${def.baseFireRate}/s`, bx + 70, by + 50);
        ctx.fillText(`Magia: ${def.magicBaseDamage} dmg  |  Barra: ${def.magicBarMax} (gain ${def.magicBarGain}/tiro)`, bx + 70, by + 63);

        ctx.fillStyle = '#5566aa'; ctx.font = '10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 12, by + 85, bw - 20, 14);

        // ── Evolution paths ─────────────────
        const evoDefs = evolutionRegistry.getByElement(def.element);
        if (evoDefs.length > 0) {
          const evoY = by + 125;
          ctx.fillStyle = '#ffffff33';
          ctx.fillRect(bx + 12, evoY, bw - 24, 1);
          ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 9px Segoe UI';
          ctx.fillText('⚡ Evoluções (nível 10):', bx + 12, evoY + 14);

          evoDefs.forEach((evo, ei) => {
            const ey = evoY + 20 + ei * 28;
            ctx.fillStyle = evo.color; ctx.font = 'bold 9px Segoe UI';
            ctx.fillText(`${evo.icon} ${evo.name}`, bx + 16, ey + 10);
            ctx.fillStyle = '#667788'; ctx.font = '8px Segoe UI';
            ctx.fillText(evo.roleLabel, bx + 16 + ctx.measureText(`${evo.icon} ${evo.name}  `).width, ey + 10);
            ctx.fillStyle = '#556677'; ctx.font = '7px Segoe UI';
            ctx.fillText(`✅ ${evo.strengths}  ⚠ ${evo.weaknesses}`, bx + 16, ey + 22);
          });
        }
      });
    }

    else if (this.bestiaryPage === 1) {
      const allEnemies = [...enemyRegistry.getStandardDefs(), ...enemyRegistry.getBossDefs()];
      const cols = 2, bw = (cw - 60) / cols, bh = 130, gap = 10;
      const rows = Math.ceil(allEnemies.length / cols);
      this.bestiaryContentH = rows * (bh + gap);
      allEnemies.forEach((def, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - scrollY;
        ctx.fillStyle = def.isBoss ? '#1a0a1a' : '#0d0d1e';
        roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = def.color + '55'; ctx.lineWidth = 1.5; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 30, by + 35, def.isBoss ? 20 : 15, 0, Math.PI * 2); ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = def.isBoss ? '#ff88ff' : def.color; ctx.font = `bold 12px Segoe UI`;
        ctx.fillText(`${def.isBoss ? '💀 ' : ''} ${def.name}`, bx + 60, by + 18);
        ctx.fillStyle = '#777799'; ctx.font = '9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}  Vidas: ${def.baseLivesLost}  XP: ${def.xp}`, bx + 60, by + 32);
        const immN = ELEMENT_NAMES[def.immune];
        const halfN = def.halfElements.map(e => ELEMENT_NAMES[e]).join(', ');
        const allEl: Array<'fire' | 'water' | 'earth' | 'wind'> = ['fire', 'water', 'earth', 'wind'];
        const weak = allEl.find(e => e !== def.immune && !def.halfElements.includes(e))!;
        ctx.fillText(`Imune: ${immN}  |  Metade: ${halfN}  |  Fraco: ${ELEMENT_NAMES[weak]}`, bx + 60, by + 46);
        ctx.fillStyle = '#556688'; ctx.font = '9px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 8, by + 68, bw - 16, 13);
      });
    }

    else {
      const bw = (cw - 60) / 2, bh = 150, gap = 12;
      const defs = enemyRegistry.getGolemDefs();
      const rows = Math.ceil(defs.length / 2);
      this.bestiaryContentH = rows * (bh + gap);
      defs.forEach((def, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - scrollY;
        const ec = ELEMENT_COLORS[def.golemType!];
        ctx.fillStyle = '#0e0e18'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = ec + '88'; ctx.lineWidth = 2; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 32, by + 40, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ec; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#111'; ctx.fillRect(bx + 23, by + 35, 18, 5);
        ctx.fillStyle = ec; ctx.font = 'bold 9px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText(ELEMENT_ICONS[def.golemType!], bx + 32, by + 55);

        ctx.textAlign = 'left';
        ctx.fillStyle = ec; ctx.font = 'bold 13px Segoe UI';
        ctx.fillText(def.name, bx + 58, by + 22);
        ctx.fillStyle = '#888899'; ctx.font = '9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}`, bx + 58, by + 36);
        ctx.fillText(`Imune: ${ELEMENT_NAMES[def.immune]}`, bx + 58, by + 48);
        ctx.fillStyle = '#6688aa'; ctx.font = '10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 8, by + 75, bw - 16, 13);
        const abilities: Record<string, string> = {
          fire: '🔥 Âncora ofensiva: aliados em 130px ficam 12% mais rápidos e imunes a queimadura',
          water: '💧 Âncora de sustain: a cada 3.5s cura aliados em 110px (1.8% HP)',
          earth: '🌍 Âncora defensiva: aliados em 100px recebem 18% menos dano',
          wind: '💨 Âncora de ritmo: rajadas periódicas (+25% velocidade por 1.5s)',
        };
        ctx.fillStyle = ec; ctx.font = 'bold 9px Segoe UI';
        ctx.fillText(abilities[def.golemType!] ?? '', bx + 8, by + bh - 12);
      });
    }

    // Restore clip
    ctx.restore();

    // ── Scrollbar ──────────────────────────────────────────────────────────
    const viewH = ch - startY - 60;
    if (this.bestiaryContentH > viewH) {
      const trackX = cw - 14, trackY = startY + 4, trackH = viewH - 8;
      const ratio = viewH / this.bestiaryContentH;
      const thumbH = Math.max(24, trackH * ratio);
      const maxScroll = this.bestiaryContentH - viewH;
      const thumbY = trackY + (maxScroll > 0 ? (scrollY / maxScroll) * (trackH - thumbH) : 0);
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(trackX, trackY, 8, trackH);
      ctx.fillStyle = '#4444aa'; roundedRect(ctx, trackX, thumbY, 8, thumbH, 4); ctx.fill();
    }

    const backLabel = returnScreen === 'menu' ? '← Voltar ao Menu' : '← Voltar ao Jogo';
    const backR = { x: 20, y: ch - 50, w: 180, h: 34 };
    drawButton(ctx, backR, backLabel, '#1a1a2e', '#6666aa');
    this.bestiaryRects['back'] = backR;
    ctx.textAlign = 'center';
  }

  renderGameOver(ctx: CanvasRenderingContext2D, cw: number, ch: number, score: number, wave: number) {
    ctx.fillStyle = 'rgba(10,0,0,0.95)'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 50px Segoe UI';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.fillText('💀  GAME OVER', cw / 2, 170); ctx.shadowBlur = 0;
    ctx.fillStyle = '#cc8888'; ctx.font = '20px Segoe UI';
    ctx.fillText(`Onda: ${wave}    |    Pontuação: ${score}`, cw / 2, 230);
    const bw = 230, bh = 48, bx = cw / 2 - bw / 2;
    const restartRect = { x: bx, y: 295, w: bw, h: bh };
    drawButton(ctx, restartRect, '⚔  Novo Jogo', '#3a0000', '#ff6666'); this.gameOverBtns['restart'] = restartRect;
    const menuRect = { x: bx, y: 360, w: bw, h: bh };
    drawButton(ctx, menuRect, '🏠  Menu Principal', '#1a1a2e', '#6666aa'); this.gameOverBtns['menu'] = menuRect;
  }
}
