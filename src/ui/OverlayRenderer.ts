// types used indirectly via Player/TalentTree
import type { Player } from '../player/Player';
import type { SkillTree as TalentTree } from '../player/SkillTree';
import { STAT_LABELS, STAT_DESCRIPTIONS, STAT_ICONS,
  ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS,
  TALENT_POINT_EVERY, ITEM_RARITY_COLORS } from '../constants';
import { towerRegistry, evolutionRegistry, fusionRegistry, enemyRegistry, itemRegistry } from '../registries';
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
  private bestiarySource: 'game' | 'menu' = 'game';
  private gameOverBtns: Record<string, Rect> = {};
  private _mousePos: { x: number; y: number } | null = null;

  getLevelUpButtonRects() { return this.levelUpBtns; }
  getTalentRects() { return this.talentRects; }
  getTalentBackRect() { return this.talentBackRect; }
  getGameOverButtonRects() { return this.gameOverBtns; }
  getBestiaryRects() { return this.bestiaryRects; }
  getBestiarySource() { return this.bestiarySource; }
  setBestiarySource(src: 'game' | 'menu') { this.bestiarySource = src; }
  setMousePos(pos: { x: number; y: number }) { this._mousePos = pos; }

  handleBestiaryTabClick(p: { x: number; y: number }, hit: (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) => boolean) {
    for (let i = 0; i < 6; i++) {
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

  renderBestiary(ctx: CanvasRenderingContext2D, cw: number, ch: number, _returnScreen = 'game') {
    this.bestiaryRects = {};
    ctx.fillStyle = '#080814'; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';

    ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 20px Segoe UI';
    ctx.fillText('📖 Mostruário', cw / 2, 34);

    // ─── Tabs ──────────────────────────────────────────────────────────────────
    const tabs = ['Torres', 'Evoluções', 'Fusões', 'Inimigos', 'Golems', 'Relíquias'];
    const tw = 105, tgap = 8, totalTW = tabs.length * tw + (tabs.length - 1) * tgap;
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

    const startY = 90;
    const viewH = ch - startY - 60;

    // ── Content-height estimation (for scroll clamping) ─────────────────────
    let contentH = 0;
    if (this.bestiaryPage === 0) {
      const n = towerRegistry.getAllDefs().length;
      contentH = Math.ceil(n / 2) * (170 + 10);
    } else if (this.bestiaryPage === 1) {
      const elements: Array<'fire'|'water'|'earth'|'wind'> = ['fire','water','earth','wind'];
      let totalCards = 0;
      for (const el of elements) { totalCards += 1 + evolutionRegistry.getByElement(el).length; }
      contentH = Math.ceil(totalCards / 2) * (155 + 10);
    } else if (this.bestiaryPage === 2) {
      const allF = fusionRegistry.getAllDefs();
      const crossN = allF.filter(f => f.primaryElement !== f.secondaryElement).length;
      const sameN = allF.filter(f => f.primaryElement === f.secondaryElement).length;
      // header(2) + cross cards + align + header(2) + same cards
      let idx = 0;
      idx += 2; // first header row
      idx += crossN;
      if (idx % 2 !== 0) idx += 1; // align before second header
      idx += 2; // second header row
      idx += sameN;
      if (idx % 2 !== 0) idx += 1;
      contentH = (idx / 2) * (145 + 10);
    } else if (this.bestiaryPage === 3) {
      const n = [...enemyRegistry.getStandardDefs(), ...enemyRegistry.getBossDefs()].length;
      contentH = Math.ceil(n / 2) * (140 + 8);
    } else if (this.bestiaryPage === 4) {
      const n = enemyRegistry.getGolemDefs().length;
      contentH = Math.ceil(n / 2) * (155 + 12);
    } else {
      const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
      const items = itemRegistry.getAllDefs();
      let idx = 0;
      for (const r of rarities) {
        const cnt = items.filter(d => d.rarity === r).length;
        if (cnt === 0) continue;
        if (idx % 3 !== 0) idx += 3 - (idx % 3);
        idx += 3;
        idx += cnt;
        const rem = idx % 3;
        if (rem !== 0) idx += 3 - rem;
      }
      contentH = (idx / 3) * (100 + 8);
    }
    this.bestiaryContentH = contentH;
    this.bestiaryScroll = Math.max(0, Math.min(Math.max(0, contentH - viewH), this.bestiaryScroll));
    const sy = this.bestiaryScroll;

    // ── Clip scrollable area ────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, cw, viewH);
    ctx.clip();

    // ─── Tab 0: Torres ─────────────────────────────────────────────────────────
    if (this.bestiaryPage === 0) {
      const magicDesc: Record<string, string> = {
        fire:  '✨ Dispara 3 projéteis mágicos (1º, meio, último do range)',
        water: '✨ Aplica -5% de velocidade permanente por acerto mágico',
        earth: '✨ Explosão em área (80px de raio) com dano mágico',
        wind:  '✨ Empurra o alvo 3 tiles para trás na rota',
      };
      const cols = 2, bw = (cw - 60) / cols, bh = 170, gap = 10;
      towerRegistry.getAllDefs().forEach((def, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
        const ec = ELEMENT_COLORS[def.element];
        ctx.fillStyle = '#0d0d20'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = ec + '66'; ctx.lineWidth = 1.5; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        // Tower circle icon
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 36, by + 42, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = def.accentColor; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '18px serif'; ctx.fillStyle = ec; ctx.textAlign = 'center';
        ctx.fillText(ELEMENT_ICONS[def.element], bx + 36, by + 49);

        ctx.textAlign = 'left';
        ctx.fillStyle = ec; ctx.font = 'bold 13px Segoe UI';
        ctx.fillText(def.name, bx + 70, by + 22);
        ctx.fillStyle = '#8888aa'; ctx.font = '9px Segoe UI';
        ctx.fillText(`Elemento: ${ELEMENT_NAMES[def.element]}  |  Custo base: ${def.baseCost}g`, bx + 70, by + 36);
        ctx.fillStyle = '#777799';
        ctx.fillText(`Dano: ${def.baseDamage}  Alcance: ${def.baseRange}  Cadência: ${def.baseFireRate}/s`, bx + 70, by + 50);
        ctx.fillText(`Barra de magia: ${def.magicBarMax} pts  (${def.magicBarGain} pts/tiro)`, bx + 70, by + 63);
        ctx.fillText(`Dano mágico base: ${def.magicBaseDamage}`, bx + 70, by + 76);

        ctx.fillStyle = '#5566aa'; ctx.font = '10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 12, by + 100, bw - 20, 13);

        // Magic ability
        ctx.fillStyle = ec; ctx.font = 'bold 9px Segoe UI';
        wrapTextLeft(ctx, magicDesc[def.element] ?? '', bx + 12, by + bh - 22, bw - 20, 11);
      });
    }

    // ─── Tab 1: Evoluções ───────────────────────────────────────────────────────
    else if (this.bestiaryPage === 1) {
      const elements: Array<'fire'|'water'|'earth'|'wind'> = ['fire','water','earth','wind'];
      const cols = 2, bw = (cw - 60) / cols, bh = 155, gap = 10;
      let cardIdx = 0;
      for (const el of elements) {
        const ec = ELEMENT_COLORS[el];
        const baseDef = towerRegistry.getAllDefs().find(d => d.element === el);
        // Section header card (base tower)
        {
          const col = cardIdx % cols, row = Math.floor(cardIdx / cols);
          const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
          ctx.fillStyle = '#0a0a1a'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
          ctx.strokeStyle = ec + '44'; ctx.lineWidth = 1; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();
          // Base tower icon
          if (baseDef) {
            ctx.fillStyle = baseDef.color;
            ctx.beginPath(); ctx.arc(bx + 30, by + 32, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = baseDef.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillStyle = ec;
            ctx.fillText(ELEMENT_ICONS[el], bx + 30, by + 38);
          }
          ctx.textAlign = 'left';
          ctx.fillStyle = ec; ctx.font = 'bold 12px Segoe UI';
          ctx.fillText(`${ELEMENT_ICONS[el]} ${baseDef?.name ?? ELEMENT_NAMES[el]}`, bx + 56, by + 20);
          ctx.fillStyle = '#666688'; ctx.font = '9px Segoe UI';
          ctx.fillText('Torre Base — Pode evoluir no nível 11', bx + 56, by + 34);
          if (baseDef) {
            ctx.fillStyle = '#555577'; ctx.font = '9px Segoe UI';
            ctx.fillText(`Dano: ${baseDef.baseDamage}  Alcance: ${baseDef.baseRange}  Cadência: ${baseDef.baseFireRate}/s`, bx + 56, by + 48);
          }
          ctx.fillStyle = '#445566'; ctx.font = '9px Segoe UI';
          wrapTextLeft(ctx, baseDef?.description ?? '', bx + 10, by + 68, bw - 20, 12);
          // Label
          ctx.fillStyle = '#555577'; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'right';
          ctx.fillText('BASE', bx + bw - 10, by + 14); ctx.textAlign = 'left';
          cardIdx++;
        }
        // Evolution cards
        const evos = evolutionRegistry.getByElement(el);
        for (const evo of evos) {
          const col = cardIdx % cols, row = Math.floor(cardIdx / cols);
          const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
          ctx.fillStyle = '#0d0d28'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
          ctx.strokeStyle = evo.color + '88'; ctx.lineWidth = 2; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();
          // Glow accent
          ctx.shadowColor = evo.color; ctx.shadowBlur = 6;
          ctx.fillStyle = evo.color;
          ctx.beginPath(); ctx.arc(bx + 30, by + 32, 16, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = '14px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(evo.icon, bx + 30, by + 38);
          // Info
          ctx.textAlign = 'left';
          ctx.fillStyle = evo.color; ctx.font = 'bold 12px Segoe UI';
          ctx.fillText(`${evo.icon} ${evo.name}`, bx + 56, by + 20);
          ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 9px Segoe UI';
          ctx.fillText(evo.roleLabel, bx + 56, by + 33);
          // Mult stats
          const dm = evo.damageMult, fr = evo.fireRateMult, rn = evo.rangeMult, md = evo.magicDamageMult;
          ctx.fillStyle = '#777799'; ctx.font = '8px Segoe UI';
          ctx.fillText(`Dano ×${dm}  Cadência ×${fr}  Alcance ×${rn}  Magia ×${md}`, bx + 56, by + 46);
          // Description
          ctx.fillStyle = '#6688aa'; ctx.font = '9px Segoe UI';
          wrapTextLeft(ctx, evo.description, bx + 10, by + 64, bw - 20, 12);
          // Strengths/weaknesses
          ctx.fillStyle = '#55cc77'; ctx.font = '8px Segoe UI';
          wrapTextLeft(ctx, `✔ ${evo.strengths}`, bx + 10, by + bh - 36, bw - 20, 10);
          ctx.fillStyle = '#cc5555'; ctx.font = '8px Segoe UI';
          wrapTextLeft(ctx, `✖ ${evo.weaknesses}`, bx + 10, by + bh - 16, bw - 20, 10);
          // Label
          ctx.fillStyle = evo.color; ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'right';
          ctx.fillText('EVOLUÇÃO', bx + bw - 10, by + 14); ctx.textAlign = 'left';
          cardIdx++;
        }
      }
    }

    // ─── Tab 2: Fusões ─────────────────────────────────────────────────────────
    else if (this.bestiaryPage === 2) {
      const allFusions = fusionRegistry.getAllDefs();
      const crossFusions = allFusions.filter(f => f.primaryElement !== f.secondaryElement);
      const sameFusions = allFusions.filter(f => f.primaryElement === f.secondaryElement);
      const cols = 2, bw = (cw - 60) / cols, bh = 145, gap = 10;
      let cardIdx = 0;
      // Section: Cross-element fusions
      const drawSectionHeader = (label: string, color: string) => {
        if (cardIdx % cols !== 0) { cardIdx += cols - (cardIdx % cols); }
        const hy = startY + Math.floor(cardIdx / cols) * (bh + gap) - sy;
        ctx.fillStyle = color + '22';
        roundedRect(ctx, 30, hy - 2, cw - 60, 22, 4); ctx.fill();
        ctx.fillStyle = color; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText(label, cw / 2, hy + 13);
        ctx.textAlign = 'left';
        cardIdx += cols;
      };
      drawSectionHeader('⚔  FUSÕES ELEMENTAIS', '#8888ff');
      const drawFusionCard = (def: typeof allFusions[0]) => {
        const col = cardIdx % cols, row = Math.floor(cardIdx / cols);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
        const pc = ELEMENT_COLORS[def.primaryElement], sc = ELEMENT_COLORS[def.secondaryElement];
        const isSame = def.primaryElement === def.secondaryElement;
        // Premium background
        ctx.fillStyle = isSame ? '#14102a' : '#0c0c22';
        roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        // Dual-color border
        ctx.lineWidth = 2;
        ctx.strokeStyle = pc; ctx.beginPath();
        ctx.moveTo(bx + 10, by); ctx.lineTo(bx + bw - 10, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + 10, 10);
        ctx.lineTo(bx + bw, by + bh / 2); ctx.stroke();
        ctx.strokeStyle = sc; ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh / 2);
        ctx.lineTo(bx + bw, by + bh - 10);
        ctx.arcTo(bx + bw, by + bh, bx + bw - 10, by + bh, 10);
        ctx.lineTo(bx + 10, by + bh);
        ctx.arcTo(bx, by + bh, bx, by + bh - 10, 10);
        ctx.lineTo(bx, by + 10);
        ctx.arcTo(bx, by, bx + 10, by, 10); ctx.stroke();
        // Icon with glow
        ctx.shadowColor = def.color; ctx.shadowBlur = 10;
        ctx.fillStyle = def.color;
        ctx.font = '22px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
        ctx.fillText(def.icon, bx + 28, by + 36);
        ctx.shadowBlur = 0;
        // Element combo
        ctx.font = '10px serif';
        ctx.fillStyle = pc; ctx.fillText(ELEMENT_ICONS[def.primaryElement], bx + 16, by + 54);
        ctx.fillStyle = '#555577'; ctx.fillText('+', bx + 28, by + 54);
        ctx.fillStyle = sc; ctx.fillText(ELEMENT_ICONS[def.secondaryElement], bx + 40, by + 54);
        // Name & role
        ctx.textAlign = 'left';
        ctx.fillStyle = def.color; ctx.font = 'bold 13px Segoe UI';
        ctx.fillText(def.name, bx + 56, by + 20);
        ctx.fillStyle = '#aaaacc'; ctx.font = 'bold 9px Segoe UI';
        ctx.fillText(def.roleLabel, bx + 56, by + 33);
        // Element names
        ctx.fillStyle = '#666688'; ctx.font = '8px Segoe UI';
        ctx.fillText(`${ELEMENT_NAMES[def.primaryElement]} + ${ELEMENT_NAMES[def.secondaryElement]}`, bx + 56, by + 45);
        // Stats
        ctx.fillStyle = '#777799'; ctx.font = '8px Segoe UI';
        ctx.fillText(`Dano mágico ×${def.magicDamageMult}`, bx + 56, by + 57);
        // Description
        ctx.fillStyle = '#7799bb'; ctx.font = '9px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 10, by + 76, bw - 20, 12);
        // Label
        ctx.fillStyle = isSame ? '#ffcc44' : def.color;
        ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'right';
        ctx.fillText(isSame ? 'FUSÃO APEX' : 'FUSÃO', bx + bw - 10, by + 14);
        ctx.textAlign = 'left';
        cardIdx++;
      };
      for (const f of crossFusions) drawFusionCard(f);
      drawSectionHeader('👑  FUSÕES APEX (mesmo elemento)', '#ffcc44');
      for (const f of sameFusions) drawFusionCard(f);
    }

    // ─── Tab 3: Inimigos ───────────────────────────────────────────────────────
    else if (this.bestiaryPage === 3) {
      const allEnemies = [...enemyRegistry.getStandardDefs(), ...enemyRegistry.getBossDefs()];
      const cols = 2, bw = (cw - 60) / cols, bh = 140, gap = 8;
      const bossAbilityDesc: Record<string, string> = {
        summon_adds:  '💀 Habilidade: Invoca goblins a cada 25% de HP perdido',
        fire_trail:   '💀 Habilidade: Deixa rastro de fogo que danifica torres',
        shield_phase: '💀 Habilidade: Fica imune por 3s ao chegar a 50% de HP',
      };
      allEnemies.forEach((def, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
        ctx.fillStyle = def.isBoss ? '#1a0a1a' : '#0d0d1e';
        roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = def.color + '55'; ctx.lineWidth = 1.5; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 30, by + 32, def.isBoss ? 20 : 14, 0, Math.PI * 2); ctx.fill();
        if (def.isBoss) {
          ctx.strokeStyle = '#ff44ff'; ctx.lineWidth = 2; ctx.stroke();
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = def.isBoss ? '#ff88ff' : def.color; ctx.font = `bold 12px Segoe UI`;
        ctx.fillText(`${def.isBoss ? '💀 ' : ''}${def.name}`, bx + 58, by + 18);
        ctx.fillStyle = '#777799'; ctx.font = '9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}  Vidas: ${def.baseLivesLost}  XP: ${def.xp}  Recomp.: ${def.reward}g`, bx + 58, by + 32);

        // Elemental info
        const allEl: Array<'fire' | 'water' | 'earth' | 'wind'> = ['fire', 'water', 'earth', 'wind'];
        const weakEl = allEl.filter(e => e !== def.immune && !def.halfElements.includes(e));
        const immStr = `${ELEMENT_ICONS[def.immune]} Imune: ${ELEMENT_NAMES[def.immune]}`;
        const halfStr = def.halfElements.length > 0
          ? `  |  ½: ${def.halfElements.map(e => ELEMENT_NAMES[e]).join(', ')}`
          : '';
        const weakStr = weakEl.length > 0
          ? `  |  Fraco: ${weakEl.map(e => ELEMENT_NAMES[e]).join(', ')}`
          : '';
        ctx.fillText(immStr + halfStr + weakStr, bx + 58, by + 46);

        ctx.fillStyle = '#556688'; ctx.font = '9px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 8, by + 65, bw - 16, 12);

        if (def.isBoss && def.bossAbility && bossAbilityDesc[def.bossAbility]) {
          ctx.fillStyle = '#cc66cc'; ctx.font = 'bold 9px Segoe UI';
          ctx.fillText(bossAbilityDesc[def.bossAbility], bx + 8, by + bh - 10);
        }
      });
    }

    // ─── Tab 4: Golems ─────────────────────────────────────────────────────────
    else if (this.bestiaryPage === 4) {
      const bw = (cw - 60) / 2, bh = 155, gap = 12;
      const golemAbilities: Record<string, string> = {
        fire:  '🔥 Imune a qualquer dano com componente de Fogo',
        water: '💧 Recupera HP dentro de poças de água (+0.01% máx/s)',
        earth: '🌍 Absorve parte do dano recebido por golems aliados próximos (raio 80px)',
        wind:  '💨 Completamente imune ao efeito de empurrão do Vento',
      };
      enemyRegistry.getGolemDefs().forEach((def, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
        const ec = ELEMENT_COLORS[def.golemType!];
        ctx.fillStyle = '#0e0e18'; roundedRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = ec + '88'; ctx.lineWidth = 2; roundedRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(bx + 32, by + 42, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ec; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '13px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
        ctx.fillStyle = ec;
        ctx.fillText(ELEMENT_ICONS[def.golemType!], bx + 32, by + 56);

        ctx.textAlign = 'left';
        ctx.fillStyle = ec; ctx.font = 'bold 13px Segoe UI';
        ctx.fillText(def.name, bx + 60, by + 22);
        ctx.fillStyle = '#888899'; ctx.font = '9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}  Vidas: ${def.baseLivesLost}`, bx + 60, by + 36);
        ctx.fillText(`${ELEMENT_ICONS[def.immune]} Imune: ${ELEMENT_NAMES[def.immune]}  |  Recomp.: ${def.reward}g`, bx + 60, by + 48);

        ctx.fillStyle = '#6688aa'; ctx.font = '10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx + 8, by + 70, bw - 16, 12);

        ctx.fillStyle = ec; ctx.font = 'bold 9px Segoe UI';
        wrapTextLeft(ctx, golemAbilities[def.golemType!] ?? '', bx + 8, by + bh - 22, bw - 16, 11);
      });
    }

    // ─── Tab 5: Relíquias ──────────────────────────────────────────────────────
    else if (this.bestiaryPage === 5) {
      const rarityOrder = ['common', 'rare', 'epic', 'legendary'] as const;
      const rarityLabel: Record<string, string> = {
        common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária',
      };
      const allItems = itemRegistry.getAllDefs();
      const cols = 3, bw = (cw - 60) / cols, bh = 100, gap = 8;
      let globalIdx = 0;

      for (const rarity of rarityOrder) {
        const group = allItems.filter(d => d.rarity === rarity);
        if (group.length === 0) continue;

        // Rarity section header
        if (globalIdx % cols !== 0) globalIdx += cols - (globalIdx % cols); // align to row start
        const hRow = Math.floor(globalIdx / cols);
        const hY = startY + hRow * (bh + gap) - sy;
        const rc = ITEM_RARITY_COLORS[rarity];
        ctx.fillStyle = rc + '33';
        roundedRect(ctx, 30, hY - 4, cw - 60, 18, 4); ctx.fill();
        ctx.fillStyle = rc; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'left';
        ctx.fillText(`── ${rarityLabel[rarity].toUpperCase()} ──`, 38, hY + 9);
        ctx.textAlign = 'center';
        globalIdx += cols; // skip header row

        for (const def of group) {
          const col = globalIdx % cols, row = Math.floor(globalIdx / cols);
          const bx = 30 + col * (bw + gap), by = startY + row * (bh + gap) - sy;
          const rc2 = ITEM_RARITY_COLORS[def.rarity];

          ctx.fillStyle = def.rarity === 'legendary' ? '#1a1000'
            : def.rarity === 'epic' ? '#130020'
            : def.rarity === 'rare' ? '#07102a'
            : '#0d0d1c';
          roundedRect(ctx, bx, by, bw, bh, 8); ctx.fill();
          ctx.strokeStyle = rc2 + '99'; ctx.lineWidth = 1.5;
          roundedRect(ctx, bx, by, bw, bh, 8); ctx.stroke();

          // Icon
          ctx.font = '22px "Segoe UI Emoji", serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(def.icon, bx + 22, by + 34);

          // Name + rarity
          ctx.textAlign = 'left';
          ctx.fillStyle = rc2; ctx.font = 'bold 10px Segoe UI';
          ctx.fillText(def.name, bx + 42, by + 16);
          ctx.fillStyle = rc2 + 'aa'; ctx.font = '8px Segoe UI';
          ctx.fillText(`[${rarityLabel[def.rarity]}]`, bx + 42, by + 27);

          // Description
          ctx.fillStyle = '#aaaacc'; ctx.font = '9px Segoe UI';
          wrapTextLeft(ctx, def.description, bx + 8, by + 50, bw - 16, 12);

          globalIdx++;
        }
        // fill rest of last row
        const rem = globalIdx % cols;
        if (rem !== 0) globalIdx += cols - rem;
      }
    }

    ctx.restore();

    // ── Scrollbar ───────────────────────────────────────────────────────────
    if (contentH > viewH) {
      const trackX = cw - 14, trackW = 8;
      ctx.fillStyle = '#1a1a2e';
      roundedRect(ctx, trackX, startY, trackW, viewH, 4); ctx.fill();
      const thumbH = Math.max(30, (viewH / contentH) * viewH);
      const maxSy = contentH - viewH;
      const thumbY = startY + (sy / maxSy) * (viewH - thumbH);
      ctx.fillStyle = '#6666aaaa';
      roundedRect(ctx, trackX, thumbY, trackW, thumbH, 4); ctx.fill();
    }

    // ─── Back button ───────────────────────────────────────────────────────────
    const backLabel = this.bestiarySource === 'menu' ? '← Voltar ao Menu' : '← Voltar ao Jogo';
    const backR = { x: 20, y: ch - 50, w: 200, h: 34 };
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
