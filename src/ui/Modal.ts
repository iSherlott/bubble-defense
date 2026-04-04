import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';
import type { Stats } from '../types';
import type { TalentTree } from '../player/TalentTree';
import { ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS, MAX_TOWER_LEVEL } from '../constants';

export class Modal {
  private overlay: HTMLElement;
  private content: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('modal-overlay')!;
    this.content = document.getElementById('modal-content')!;
    document.getElementById('modal-close-btn')!.onclick = () => this.hide();
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.hide(); });
  }

  hide() { this.overlay.classList.remove('visible'); }

  showEnemy(enemy: Enemy) {
    const def = enemy.def;
    const weakness = enemy.weakElement();
    const badge = (el: string) =>
      `<span class="element-badge elem-${el}">${ELEMENT_ICONS[el as keyof typeof ELEMENT_ICONS]} ${ELEMENT_NAMES[el as keyof typeof ELEMENT_NAMES]}</span>`;

    const permSlowPct = Math.round(enemy.permanentSlowStacks * 5);

    this.content.innerHTML = `
      <h2 style="color:${def.color}">${def.isBoss?'💀 BOSS — ':''}${def.name}</h2>
      <p style="color:#555;font-size:0.84em;margin-bottom:8px">${def.description}</p>
      <hr class="modal-divider">
      <div class="modal-row"><span class="label">❤ Vida</span><span class="value">${Math.ceil(enemy.hp)} / ${enemy.maxHp}</span></div>
      <div class="modal-row"><span class="label">🏃 Velocidade</span><span class="value">${Math.round(enemy.baseSpeed)} px/s</span></div>
      <div class="modal-row"><span class="label">🎯 Agilidade</span><span class="value">${enemy.agility}</span></div>
      <div class="modal-row"><span class="label">💰 Recompensa</span><span class="value">${def.reward}g</span></div>
      <div class="modal-row"><span class="label">⭐ Experiência</span><span class="value">${def.xp} XP</span></div>
      ${permSlowPct>0 ? `<div class="modal-row"><span class="label">💧 Lentidão Perm.</span><span class="value" style="color:#66aaff">-${permSlowPct}% vel (${enemy.permanentSlowStacks} pilhas)</span></div>`:''}
      ${enemy.stunRemaining>0 ? `<div class="modal-row"><span class="label">💨 Atordoado</span><span class="value" style="color:#ffffaa">${enemy.stunRemaining.toFixed(1)}s</span></div>`:''}
      <hr class="modal-divider">
      <div style="font-size:0.8em;color:#666;margin-bottom:5px">Resistências:</div>
      <div class="modal-row"><span class="label">🛡 Imunidade</span><span class="resist-immune">${badge(def.immune)} — 0×</span></div>
      <div class="modal-row"><span class="label">⬇ Metade</span><span class="resist-half">${badge(def.halfElements[0])} ${badge(def.halfElements[1])} — 0.5×</span></div>
      <div class="modal-row"><span class="label">💥 Fraqueza</span><span class="resist-weak">${badge(weakness)} — 2×</span></div>
      ${enemy.effects.length > 0 ? `
      <hr class="modal-divider">
      <div style="font-size:0.8em;color:#555;margin-bottom:3px">Efeitos Ativos:</div>
      ${enemy.effects.map(e => `
        <div class="modal-row">
          <span class="label">${e.type==='burn'?'🔥 Queimadura':'❄ Lentidão'}</span>
          <span class="value">${e.remaining.toFixed(1)}s</span>
        </div>`).join('')}` : ''}
    `;
    this.overlay.classList.add('visible');
  }

  showTower(tower: Tower, stats: Stats, talentTree: TalentTree) {
    const def = tower.def;
    const spBonus  = talentTree.speedBonusForElement(def.element);
    const fireRate = tower.getFireRate(stats, spBonus);
    const range    = tower.getRange();
    const magicPct = Math.round(tower.magicBarRatio() * 100);
    const col      = ELEMENT_COLORS[def.element];
    const isMax    = tower.isMaxLevel;

    // Build upgrade history dots
    const histDots = tower.upgradeHistory.map(h =>
      h === 'damage'
        ? `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#cc4444;margin:1px" title="Dano +${(0.1*100).toFixed(0)}%"></span>`
        : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#44aaff;margin:1px" title="Velocidade +${(0.1*100).toFixed(0)}%"></span>`
    ).join('');

    const levelColor = isMax ? '#ffcc00' : '#aaddff';
    const levelLabel = isMax
      ? `<span style="color:#ffcc00;font-size:0.85em">★ NÍVEL MÁXIMO</span>`
      : `<span style="color:#aaddff">Nível ${tower.level} / ${MAX_TOWER_LEVEL}</span>`;

    this.content.innerHTML = `
      <h2 style="color:${def.accentColor}">${def.name}${tower.dualMagic?' <span style="color:#ffff44;font-size:0.7em">✨DUAL</span>':''}</h2>
      <p style="color:#555;font-size:0.84em;margin-bottom:6px">${def.description}</p>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="element-badge elem-${def.element}">${ELEMENT_ICONS[def.element]} ${ELEMENT_NAMES[def.element]}</span>
        ${levelLabel}
      </div>
      ${tower.upgradeCount>0?`
      <div style="background:#111122;border-radius:6px;padding:6px 8px;margin-bottom:8px">
        <div style="font-size:0.75em;color:#777;margin-bottom:4px">Histórico de upgrades (🟥 Dano · 🔵 Velocidade):</div>
        <div>${histDots}</div>
      </div>`:''}
      <hr class="modal-divider">
      <div class="modal-row"><span class="label">⚔ Dano Base</span><span class="value">${def.baseDamage} × <span style="color:${levelColor}">${tower.damageMult.toFixed(1)}</span></span></div>
      <div class="modal-row"><span class="label">🎯 Alcance</span><span class="value">${Math.round(range)} px</span></div>
      <div class="modal-row"><span class="label">⚡ Cadência</span><span class="value">${fireRate.toFixed(2)} /s <span style="color:${levelColor}">×${tower.speedMult.toFixed(1)}</span></span></div>
      <div class="modal-row"><span class="label">🔮 Dano Magia</span><span class="value">${def.magicBaseDamage} (base)</span></div>
      <div class="modal-row"><span class="label">⬆ Upgrades</span><span class="value">${tower.upgradeCount}/${MAX_TOWER_LEVEL}${isMax?' <span style="color:#ffcc00">★ Máximo!</span>':''}</span></div>
      <hr class="modal-divider">
      <div style="font-size:0.8em;color:#666;margin-bottom:4px">Barra de Magia (${magicPct}%):</div>
      <div style="background:#1a1a1a;border-radius:4px;height:12px;margin:3px 0 6px">
        <div style="height:100%;width:${magicPct}%;background:${col};border-radius:4px"></div>
      </div>
      <div style="font-size:0.8em;color:#555;text-align:center">${def.magicBarGain} carga/disparo · ${tower.dualMagic?'<span style="color:#ffff44">Dispara 2×</span>':'1 lançamento'}</div>
      <hr class="modal-divider">
      <div class="modal-row"><span class="label">☠ Abates</span><span class="value">${tower.totalKills}</span></div>
      <div class="modal-row"><span class="label">💥 Dano Total</span><span class="value">${Math.round(tower.totalDamageDealt)}</span></div>
    `;
    this.overlay.classList.add('visible');
  }
}
