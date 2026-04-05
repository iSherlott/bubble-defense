import type { FusionDef } from '../types';

export const FUSION_DEFS: FusionDef[] = [
  // Earth primary
  { id:'earth+fire',  name:'Magma',      primaryElement:'earth', secondaryElement:'fire',
    icon:'🌋', color:'#ff6600', description:'Lança magma derretido em área, queimando o chão.',
    magicDamageMult:1.8, specialEffect:'magma_pool' },
  { id:'earth+water', name:'Pântano',    primaryElement:'earth', secondaryElement:'water',
    icon:'🏞', color:'#556b2f', description:'Cria pântano que prende e envenena inimigos.',
    magicDamageMult:1.4, specialEffect:'swamp' },
  { id:'earth+wind',  name:'Tempestade de Areia', primaryElement:'earth', secondaryElement:'wind',
    icon:'🏜', color:'#daa520', description:'Reduz precisão dos inimigos e causa dano contínuo.',
    magicDamageMult:1.5, specialEffect:'sandstorm' },

  // Fire primary
  { id:'fire+earth',  name:'Bola de Fogo', primaryElement:'fire', secondaryElement:'earth',
    icon:'☄', color:'#ff4400', description:'Projétil explosivo com dano em área massivo.',
    magicDamageMult:2.0, specialEffect:'fireball_aoe' },
  { id:'fire+water',  name:'Vapor',       primaryElement:'fire', secondaryElement:'water',
    icon:'♨', color:'#ccaaff', description:'Vapor escaldante que cega e queima.',
    magicDamageMult:1.6, specialEffect:'steam' },
  { id:'fire+wind',   name:'Inferno',     primaryElement:'fire', secondaryElement:'wind',
    icon:'🔥', color:'#ff2200', description:'Fogo alimentado pelo vento, dano de queimadura triplicado.',
    magicDamageMult:1.5, specialEffect:'inferno' },

  // Water primary
  { id:'water+fire',  name:'Gêiser',      primaryElement:'water', secondaryElement:'fire',
    icon:'⛲', color:'#66ccff', description:'Erupção de água quente que atordoa.',
    magicDamageMult:1.7, specialEffect:'geyser' },
  { id:'water+earth', name:'Lama',        primaryElement:'water', secondaryElement:'earth',
    icon:'💩', color:'#8b7355', description:'Lama pesada que diminui muito a velocidade.',
    magicDamageMult:1.3, specialEffect:'mud' },
  { id:'water+wind',  name:'Nevasca',     primaryElement:'water', secondaryElement:'wind',
    icon:'❄', color:'#aaeeff', description:'Tempestade de gelo que congela em área.',
    magicDamageMult:1.6, specialEffect:'blizzard' },

  // Same-element fusions
  { id:'fire+fire',   name:'Núcleo Solar',          primaryElement:'fire',  secondaryElement:'fire',
    icon:'☀', color:'#ffcc00', description:'Domínio total do Fogo: dano mágico massivo em área e queimadura eterna.',
    magicDamageMult:2.5, specialEffect:'solar_core' },
  { id:'water+water', name:'Vórtice Abissal',        primaryElement:'water', secondaryElement:'water',
    icon:'🌀', color:'#00ccff', description:'Domínio total da Água: lentidão extrema e pulsos de gelo em área.',
    magicDamageMult:2.3, specialEffect:'abyssal_vortex' },
  { id:'earth+earth', name:'Terremoto Primordial',   primaryElement:'earth', secondaryElement:'earth',
    icon:'🌋', color:'#aacc44', description:'Domínio total da Terra: tremor colossal que atinge toda a tela.',
    magicDamageMult:2.8, specialEffect:'primal_quake' },
  { id:'wind+wind',   name:'Furacão Eterno',         primaryElement:'wind',  secondaryElement:'wind',
    icon:'⚡', color:'#eeff44', description:'Domínio do Vento: empurra 3 tiles todos em 1.5× o alcance. Carga de magia 2× mais lenta.',
    magicDamageMult:2.2, magicBarMaxMult:2, specialEffect:'eternal_hurricane' },

  // Wind primary (cross-element)
  { id:'wind+fire',   name:'Relâmpago',   primaryElement:'wind', secondaryElement:'fire',
    icon:'⚡', color:'#ffff00', description:'Raio devastador que atinge múltiplos alvos em cadeia.',
    magicDamageMult:2.2, specialEffect:'lightning' },
  { id:'wind+water',  name:'Tsunami',     primaryElement:'wind', secondaryElement:'water',
    icon:'🌊', color:'#0077cc', description:'Onda massiva que empurra todos os inimigos.',
    magicDamageMult:1.5, specialEffect:'tsunami' },
  { id:'wind+earth',  name:'Tornado',     primaryElement:'wind', secondaryElement:'earth',
    icon:'🌪', color:'#88cc44', description:'Tornado com detritos que causa dano contínuo em área.',
    magicDamageMult:1.8, specialEffect:'tornado' },
];

export function getFusionDef(primaryElement: string, secondaryElement: string): FusionDef | undefined {
  return FUSION_DEFS.find(f => f.id === `${primaryElement}+${secondaryElement}`);
}
