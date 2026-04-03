// ─── SkillTree — Path-of-Exile-style node graph ────────────────────────────────
//
// Layout (logical 1000×700):
//
//   Wind cluster (top-left)        Fire cluster (top-right)
//      W4 ─ W3 ─ W2 ─ W1           F1 ─ F2 ─ F3 ─ F4
//                   \               /
//            jct_wind ─ ROOT ─ jct_fire
//                   /               \
//      E4 ─ E3 ─ E2 ─ E1           A1 ─ A2 ─ A3 ─ A4
//   Earth cluster (bot-left)       Water cluster (bot-right)
//
//  Cross-element junctions sit at the mid-point between adjacent elemental roots,
//  letting players unlock synergy bonuses that require two element branches.

import { SkillNode } from './SkillNode';
import type { SkillEffect } from './SkillNode';
import type { ElementType } from '../types';

// ─── Helper to build effect arrays ────────────────────────────────────────────
function fx(type: SkillEffect['type'], element: ElementType, value: number): SkillEffect {
  return { type, element, value };
}

// ─── Node graph definition ────────────────────────────────────────────────────
// Positions are in logical space (0–1000 × 0–700).
// The renderer scales this to fit the actual canvas.

const NODE_DEFS = [
  // ── Root (center, free) ──────────────────────────────────────────────────
  {
    id:'root', name:'Raízes Elementais', icon:'⭐', element:'neutral' as const,
    description:'O começo de todo poder elemental. Desbloqueado automaticamente.',
    position:{x:500,y:350},
    effects:[], requires:[], connections:[], cost:0, requiredLevel:0,
  },

  // ── Fire cluster (top-right) ─────────────────────────────────────────────
  {
    id:'fire_root', name:'Centelha Inicial', icon:'🔥', element:'fire' as const,
    description:'Acesso ao ramo de Fogo. Libera os talentos elementais de fogo.',
    position:{x:650,y:245},
    effects:[], requires:['root'], connections:['root'], cost:0, requiredLevel:1,
  },
  {
    id:'fire_t1', name:'Chamas Intensas', icon:'🔥', element:'fire' as const,
    description:'+20% dano das torres de Fogo.',
    position:{x:740,y:195},
    effects:[fx('damage','fire',0.20)],
    requires:['fire_root'], connections:['fire_root'], cost:1, requiredLevel:10,
  },
  {
    id:'fire_t2', name:'Velocidade Ígnea', icon:'⚡', element:'fire' as const,
    description:'+10% velocidade de ataque das torres de Fogo.',
    position:{x:845,y:170},
    effects:[fx('speed','fire',0.10)],
    requires:['fire_t1'], connections:['fire_t1'], cost:1, requiredLevel:20,
  },
  {
    id:'fire_t3', name:'Queimadura Arcana', icon:'💀', element:'fire' as const,
    description:'Magia de Fogo aplica queimadura: 1% HP/s por 5s.',
    position:{x:940,y:200},
    effects:[fx('specialEffect','fire',1)],
    requires:['fire_t2'], connections:['fire_t2'], cost:1, requiredLevel:30,
  },
  {
    id:'fire_t4', name:'Forno Infernal', icon:'♨', element:'fire' as const,
    description:'Torres de Fogo carregam magia 25% mais rápido.',
    position:{x:975,y:295},
    effects:[fx('magicSpeed','fire',0.25)],
    requires:['fire_t3'], connections:['fire_t3'], cost:1, requiredLevel:40,
  },

  // ── Wind cluster (top-left) ──────────────────────────────────────────────
  {
    id:'wind_root', name:'Brisa Primordial', icon:'💨', element:'wind' as const,
    description:'Acesso ao ramo de Vento. Libera os talentos elementais de vento.',
    position:{x:350,y:245},
    effects:[], requires:['root'], connections:['root'], cost:0, requiredLevel:1,
  },
  {
    id:'wind_t1', name:'Rajada Cortante', icon:'💨', element:'wind' as const,
    description:'+20% dano das torres de Vento.',
    position:{x:260,y:195},
    effects:[fx('damage','wind',0.20)],
    requires:['wind_root'], connections:['wind_root'], cost:1, requiredLevel:10,
  },
  {
    id:'wind_t2', name:'Ciclone Rápido', icon:'🌀', element:'wind' as const,
    description:'+10% velocidade de ataque das torres de Vento.',
    position:{x:155,y:170},
    effects:[fx('speed','wind',0.10)],
    requires:['wind_t1'], connections:['wind_t1'], cost:1, requiredLevel:20,
  },
  {
    id:'wind_t3', name:'Vórtice Paralisante', icon:'🌪', element:'wind' as const,
    description:'Após empurrão, inimigo fica 1s parado.',
    position:{x:60,y:200},
    effects:[fx('specialEffect','wind',1)],
    requires:['wind_t2'], connections:['wind_t2'], cost:1, requiredLevel:30,
  },
  {
    id:'wind_t4', name:'Furacão Primordial', icon:'⚡', element:'wind' as const,
    description:'Torres de Vento carregam magia 25% mais rápido.',
    position:{x:25,y:295},
    effects:[fx('magicSpeed','wind',0.25)],
    requires:['wind_t3'], connections:['wind_t3'], cost:1, requiredLevel:40,
  },

  // ── Water cluster (bottom-right) ─────────────────────────────────────────
  {
    id:'water_root', name:'Gota Profunda', icon:'💧', element:'water' as const,
    description:'Acesso ao ramo de Água. Libera os talentos elementais de água.',
    position:{x:650,y:455},
    effects:[], requires:['root'], connections:['root'], cost:0, requiredLevel:1,
  },
  {
    id:'water_t1', name:'Maré Profunda', icon:'💧', element:'water' as const,
    description:'+20% dano das torres de Água.',
    position:{x:740,y:505},
    effects:[fx('damage','water',0.20)],
    requires:['water_root'], connections:['water_root'], cost:1, requiredLevel:10,
  },
  {
    id:'water_t2', name:'Corrente Veloz', icon:'🌊', element:'water' as const,
    description:'+10% velocidade de ataque das torres de Água.',
    position:{x:845,y:530},
    effects:[fx('speed','water',0.10)],
    requires:['water_t1'], connections:['water_t1'], cost:1, requiredLevel:20,
  },
  {
    id:'water_t3', name:'Poça Elemental', icon:'❄', element:'water' as const,
    description:'Magia de Água tem 25% de chance de criar poça (lentidão 5% por 8s).',
    position:{x:940,y:500},
    effects:[fx('specialEffect','water',0.25)],
    requires:['water_t2'], connections:['water_t2'], cost:1, requiredLevel:30,
  },
  {
    id:'water_t4', name:'Tempestade Gelada', icon:'❄', element:'water' as const,
    description:'Torres de Água carregam magia 25% mais rápido.',
    position:{x:975,y:405},
    effects:[fx('magicSpeed','water',0.25)],
    requires:['water_t3'], connections:['water_t3'], cost:1, requiredLevel:40,
  },

  // ── Earth cluster (bottom-left) ──────────────────────────────────────────
  {
    id:'earth_root', name:'Fundação Rochosa', icon:'🌍', element:'earth' as const,
    description:'Acesso ao ramo de Terra. Libera os talentos elementais de terra.',
    position:{x:350,y:455},
    effects:[], requires:['root'], connections:['root'], cost:0, requiredLevel:1,
  },
  {
    id:'earth_t1', name:'Punho de Pedra', icon:'🌍', element:'earth' as const,
    description:'+20% dano das torres de Terra.',
    position:{x:260,y:505},
    effects:[fx('damage','earth',0.20)],
    requires:['earth_root'], connections:['earth_root'], cost:1, requiredLevel:10,
  },
  {
    id:'earth_t2', name:'Velocidade Sísmica', icon:'💥', element:'earth' as const,
    description:'+10% velocidade de ataque das torres de Terra.',
    position:{x:155,y:530},
    effects:[fx('speed','earth',0.10)],
    requires:['earth_t1'], connections:['earth_t1'], cost:1, requiredLevel:20,
  },
  {
    id:'earth_t3', name:'Terremoto Amplo', icon:'💣', element:'earth' as const,
    description:'Área da magia de Terra aumenta 50%.',
    position:{x:60,y:500},
    effects:[fx('specialEffect','earth',1.5)],
    requires:['earth_t2'], connections:['earth_t2'], cost:1, requiredLevel:30,
  },
  {
    id:'earth_t4', name:'Fúria da Montanha', icon:'⛰', element:'earth' as const,
    description:'Torres de Terra carregam magia 25% mais rápido.',
    position:{x:25,y:405},
    effects:[fx('magicSpeed','earth',0.25)],
    requires:['earth_t3'], connections:['earth_t3'], cost:1, requiredLevel:40,
  },

  // ── Cross-element junction nodes ─────────────────────────────────────────
  // These sit between two element roots; require BOTH roots to unlock.
  {
    id:'jct_fire_wind', name:'Tempestade de Chamas', icon:'🌪', element:'fire' as const,
    description:'Sinergia Fogo+Vento: torres de ambos os elementos causam +5% dano.',
    position:{x:500,y:200},
    effects:[fx('damage','fire',0.05), fx('damage','wind',0.05)],
    requires:['fire_root','wind_root'],
    connections:['fire_root','wind_root'], cost:1, requiredLevel:15,
  },
  {
    id:'jct_fire_water', name:'Vapor Abrasador', icon:'♨', element:'fire' as const,
    description:'Sinergia Fogo+Água: +5% dano de magia para ambos.',
    position:{x:680,y:350},
    effects:[fx('magicSpeed','fire',0.05), fx('magicSpeed','water',0.05)],
    requires:['fire_root','water_root'],
    connections:['fire_root','water_root'], cost:1, requiredLevel:15,
  },
  {
    id:'jct_wind_earth', name:'Ventania de Areia', icon:'🏜', element:'earth' as const,
    description:'Sinergia Vento+Terra: +5% dano de magia para ambos.',
    position:{x:320,y:350},
    effects:[fx('magicSpeed','wind',0.05), fx('magicSpeed','earth',0.05)],
    requires:['wind_root','earth_root'],
    connections:['wind_root','earth_root'], cost:1, requiredLevel:15,
  },
  {
    id:'jct_earth_water', name:'Lama Espessa', icon:'💩', element:'water' as const,
    description:'Sinergia Terra+Água: +5% dano para ambos os elementos.',
    position:{x:500,y:500},
    effects:[fx('damage','earth',0.05), fx('damage','water',0.05)],
    requires:['earth_root','water_root'],
    connections:['earth_root','water_root'], cost:1, requiredLevel:15,
  },
];

// ─── SkillTree class ──────────────────────────────────────────────────────────
export class SkillTree {
  readonly nodes: Map<string, SkillNode>;

  constructor() {
    this.nodes = new Map();
    for (const data of NODE_DEFS) {
      this.nodes.set(data.id, new SkillNode(data));
    }
    // Root node is free and auto-purchased at game start
    this.nodes.get('root')!.purchased = true;
  }

  // ─── Query helpers (same API as old TalentTree for Game.ts compat) ─────────
  private purchasedSet(): ReadonlySet<string> {
    const s = new Set<string>();
    for (const [id, n] of this.nodes) if (n.purchased) s.add(id);
    return s;
  }

  canPurchase(nodeId: string, playerLevel: number, talentPoints: number): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    return node.canPurchase(this.purchasedSet(), playerLevel, talentPoints);
  }

  purchase(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    node.purchased = true;
    return true;
  }

  /** All edges as { from, to, active } — used by the renderer to draw the graph */
  getConnectionLines(): Array<{ fromId: string; toId: string; active: boolean }> {
    const lines: Array<{ fromId: string; toId: string; active: boolean }> = [];
    const seen = new Set<string>();
    for (const node of this.nodes.values()) {
      for (const otherId of node.connections) {
        const key = [node.id, otherId].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const other = this.nodes.get(otherId);
        const active = !!(node.purchased && other?.purchased);
        lines.push({ fromId: node.id, toId: otherId, active });
      }
    }
    return lines;
  }

  // ─── Bonus queries (mirror TalentTree API) ────────────────────────────────
  damageBonusForElement(element: ElementType): number {
    let total = 0;
    for (const n of this.nodes.values())
      if (n.purchased) total += n.effectsOf('damage', element);
    return total;
  }

  speedBonusForElement(element: ElementType): number {
    let total = 0;
    for (const n of this.nodes.values())
      if (n.purchased) total += n.effectsOf('speed', element);
    return total;
  }

  magicSpeedBonusForElement(element: ElementType): number {
    let total = 0;
    for (const n of this.nodes.values())
      if (n.purchased) total += n.effectsOf('magicSpeed', element);
    return total;
  }

  fireBurnOnMagic(): boolean {
    const n = this.nodes.get('fire_t3');
    return !!n?.purchased;
  }

  waterPuddleChance(): number {
    const n = this.nodes.get('water_t3');
    return n?.purchased ? n.primaryEffectValue : 0;
  }

  earthAoERadiusMult(): number {
    const n = this.nodes.get('earth_t3');
    return n?.purchased ? n.primaryEffectValue : 1.0;
  }

  windStunDuration(): number {
    const n = this.nodes.get('wind_t3');
    return n?.purchased ? 1.0 : 0;
  }

  // ─── Serialization ────────────────────────────────────────────────────────
  getPurchasedIds(): string[] {
    return Array.from(this.nodes.values())
      .filter(n => n.purchased && n.id !== 'root')
      .map(n => n.id);
  }

  loadFromIds(ids: string[]) {
    for (const n of this.nodes.values()) {
      n.purchased = n.id === 'root' || ids.includes(n.id);
    }
  }
}
