import type { EnemyDef } from '../types';

// ─── Standard Enemies ─────────────────────────────────────────────────────────

export const ENEMY_DEFS: EnemyDef[] = [
  // ── Goblin — Runner ────────────────────────────────────────────────────────
  // Fast and fragile. Punishes slow towers and uncovered routes.
  // "Instinto de Fuga": when isolated (<2 allies nearby) gains 25% speed.
  {
    id: 'goblin', name: 'Goblin',
    baseHp: 80, speed: 82, agility: 4,
    immune: 'earth', halfElements: ['fire', 'wind'],
    color: '#33cc33', size: 12, baseLivesLost: 1, reward: 10, xp: 3,
    description: 'Runner veloz e frágil. Quando isolado, foge mais rápido. Punish builds lentas e rotas sem cobertura.',
    behaviorIds: ['flight_instinct'],
  },

  // ── Troll — Tank regenerador ───────────────────────────────────────────────
  // Front-line meat shield. Slowly regens HP when not under fire.
  // "Couro Grosso": if 3 s without damage, regens up to 75 % HP at 0.7 %/s.
  {
    id: 'troll', name: 'Troll',
    baseHp: 210, speed: 48, agility: 3,
    immune: 'water', halfElements: ['earth', 'fire'],
    color: '#887733', size: 18, baseLivesLost: 1, reward: 20, xp: 6,
    description: 'Tank robusto e lento. "Couro Grosso": regenera vida quando não toma dano por 3 s. Protege aliados atrás.',
    behaviorIds: ['thick_hide'],
  },

  // ── Harpia — Evasiva ──────────────────────────────────────────────────────
  // High-speed aerial. Breaks predictable firing rhythms with bursts.
  // "Rajada Lateral": periodic speed lunges making it hard to track.
  {
    id: 'harpy', name: 'Harpia',
    baseHp: 120, speed: 100, agility: 9,
    immune: 'wind', halfElements: ['water', 'fire'],
    color: '#cc55cc', size: 13, baseLivesLost: 1, reward: 15, xp: 4,
    description: 'Rápida e evasiva. "Rajada Lateral": acelera em intervalos, quebrando o ritmo das torres.',
    behaviorIds: ['lateral_burst'],
  },

  // ── Escudeiro Rochoso — Protetor de formação ──────────────────────────────
  // Medium tank that shelters allies in its aura zone.
  // "Postura Defensiva": allies within 85 px take 20 % less damage.
  {
    id: 'rocky_shielder', name: 'Escudeiro Rochoso',
    baseHp: 165, speed: 42, agility: 3,
    immune: 'earth', halfElements: ['fire', 'wind'],
    color: '#997755', size: 16, baseLivesLost: 1, reward: 22, xp: 7,
    description: 'Protetor de formação. "Postura Defensiva": aliados dentro de 85 px recebem 20 % menos dano.',
    behaviorIds: ['defensive_aura'],
  },

  // ── Xamã das Marés — Suporte de sustain ──────────────────────────────────
  // Fragile healer. Pulses a heal + burn-cleanse onto nearby allies.
  // "Rito das Águas": every 3.2 s heals nearby allies 2.5 % maxHP and removes burn.
  {
    id: 'tide_shaman', name: 'Xamã das Marés',
    baseHp: 115, speed: 62, agility: 4,
    immune: 'water', halfElements: ['earth', 'wind'],
    color: '#3399cc', size: 14, baseLivesLost: 1, reward: 25, xp: 8,
    description: 'Suporte vital. "Rito das Águas": a cada 3 s cura aliados próximos (2.5 % HP) e remove queimadura.',
    behaviorIds: ['tidal_rite'],
  },

  // ── Batedor Tempestuoso — Suporte de ritmo ────────────────────────────────
  // Swift support that drags the wave forward with its slipstream.
  // "Corrente Ascendente": allies within 100 px gain 15 % speed.
  {
    id: 'storm_ranger', name: 'Batedor Tempestuoso',
    baseHp: 105, speed: 88, agility: 6,
    immune: 'wind', halfElements: ['water', 'earth'],
    color: '#99dd44', size: 13, baseLivesLost: 1, reward: 25, xp: 8,
    description: 'Suporte de ritmo. "Corrente Ascendente": aliados dentro de 100 px ganham 15 % de velocidade.',
    behaviorIds: ['upcurrent'],
  },

  // ── Golem Sombrio — Elite adaptativo ─────────────────────────────────────
  // Heavy elite. Reads nearby towers and gains elemental resistance.
  // "Sombra Reativa": resists the dominant nearby tower element by 35 %.
  {
    id: 'golem', name: 'Golem Sombrio',
    baseHp: 360, speed: 35, agility: 2,
    immune: 'fire', halfElements: ['earth', 'wind'],
    color: '#3344aa', size: 22, baseLivesLost: 2, reward: 32, xp: 10,
    description: 'Elite técnico. "Sombra Reativa": lê as torres próximas e resiste ao elemento dominante em ~35 %.',
    behaviorIds: ['reactive_shadow'],
  },

  // ── Dragão — Elite de pressão de área ────────────────────────────────────
  // Mini-boss recurrente. Leaves a sustain trail that speeds nearby allies.
  // "Rastro Elemental": every 2.8 s drops a trail zone (+18 % speed for allies inside).
  {
    id: 'dragon', name: 'Dragão',
    baseHp: 510, speed: 58, agility: 7,
    immune: 'fire', halfElements: ['water', 'wind'],
    color: '#cc3300', size: 24, baseLivesLost: 3, reward: 52, xp: 20,
    description: 'Elite de pressão. "Rastro Elemental": deixa zonas de sustain que aceleram aliados em +18 %.',
    behaviorIds: ['elemental_trail'],
  },
];

// ─── Elemental Golems (Anchors) ───────────────────────────────────────────────
// Golems no longer just have element immunities — they function as wave anchors,
// actively strengthening the composition around them.

export const GOLEM_DEFS: EnemyDef[] = [
  // ── Golem de Fogo — Anchor ofensivo ───────────────────────────────────────
  // Ember aura pushes nearby allies 12 % faster.
  {
    id: 'golem_fire', name: 'Golem de Fogo',
    baseHp: 310, speed: 35, agility: 2,
    immune: 'water', halfElements: ['wind', 'earth'],
    color: '#cc4400', size: 20, baseLivesLost: 2, reward: 36, xp: 12,
    description: 'Âncora ofensiva. Imune a fogo/queimadura. Aura de brasa: aliados em 130 px ficam 12 % mais rápidos.',
    golemType: 'fire',
    behaviorIds: ['fire_anchor'],
  },

  // ── Golem de Água — Anchor de sustain ─────────────────────────────────────
  // Periodic heal pulse for nearby allies; also removes burn.
  {
    id: 'golem_water', name: 'Golem de Água',
    baseHp: 310, speed: 35, agility: 2,
    immune: 'fire', halfElements: ['earth', 'wind'],
    color: '#0055cc', size: 20, baseLivesLost: 2, reward: 36, xp: 12,
    description: 'Âncora de sustain. A cada 3.5 s cura aliados em 110 px (1.8 % HP) e remove queimadura.',
    golemType: 'water',
    behaviorIds: ['water_anchor'],
  },

  // ── Golem de Terra — Anchor defensivo ────────────────────────────────────
  // Stone ward reduces incoming damage 18 % for nearby allies.
  {
    id: 'golem_earth', name: 'Golem de Terra',
    baseHp: 420, speed: 28, agility: 1,
    immune: 'wind', halfElements: ['fire', 'water'],
    color: '#665500', size: 22, baseLivesLost: 3, reward: 42, xp: 14,
    description: 'Âncora defensiva. Muralha viva: aliados em 100 px recebem 18 % menos dano enquanto ele vive.',
    golemType: 'earth',
    behaviorIds: ['earth_anchor'],
  },

  // ── Golem de Vento — Anchor de ritmo ─────────────────────────────────────
  // Periodic gust bursts (+25 % speed for 1.5 s) disrupt wave pacing.
  {
    id: 'golem_wind', name: 'Golem de Vento',
    baseHp: 285, speed: 46, agility: 3,
    immune: 'earth', halfElements: ['fire', 'water'],
    color: '#44aa77', size: 19, baseLivesLost: 2, reward: 36, xp: 12,
    description: 'Âncora de ritmo. Imune a empurrão. A cada 3 s dispara rajada: aliados em 120 px ficam 25 % mais rápidos por 1.5 s.',
    golemType: 'wind',
    behaviorIds: ['wind_anchor'],
  },
];

// ─── Disabler Enemies (post-wave 50) ─────────────────────────────────────────
// Each disabler shuts down towers of its element AND applies a secondary
// buff to nearby allied enemies (element-specific).

export const DISABLER_DEFS: EnemyDef[] = [
  // Anulador de Fogo — quebra composições centradas em fogo
  // Secondary: +10 % speed to nearby allies
  {
    id: 'disabler_fire', name: 'Anulador de Fogo',
    baseHp: 260, speed: 55, agility: 5,
    immune: 'fire', halfElements: ['wind', 'earth'],
    color: '#ff4400', size: 16, baseLivesLost: 1, reward: 28, xp: 10,
    description: 'Desativa torres de Fogo próximas. Bônus: aliados próximos ficam 10 % mais rápidos.',
    behaviorIds: ['disabler_aura'],
    disablerElement: 'fire',
    renderProfileId: 'disabler',
  },

  // Anulador de Água — quebra builds de controle
  // Secondary: strips slow debuffs from nearby allies
  {
    id: 'disabler_water', name: 'Anulador de Água',
    baseHp: 260, speed: 55, agility: 5,
    immune: 'water', halfElements: ['earth', 'wind'],
    color: '#2288ff', size: 16, baseLivesLost: 1, reward: 28, xp: 10,
    description: 'Desativa torres de Água próximas. Bônus: remove efeitos de slow de aliados próximos.',
    behaviorIds: ['disabler_aura'],
    disablerElement: 'water',
    renderProfileId: 'disabler',
  },

  // Anulador de Terra — quebra composições de sustain/consistência
  // Secondary: 12 % damage shield to nearby allies
  {
    id: 'disabler_earth', name: 'Anulador de Terra',
    baseHp: 260, speed: 55, agility: 5,
    immune: 'earth', halfElements: ['fire', 'water'],
    color: '#88aa22', size: 16, baseLivesLost: 1, reward: 28, xp: 10,
    description: 'Desativa torres de Terra próximas. Bônus: aliados próximos recebem 12 % menos dano.',
    behaviorIds: ['disabler_aura'],
    disablerElement: 'earth',
    renderProfileId: 'disabler',
  },

  // Anulador de Vento — quebra builds de reposicionamento
  // Secondary: +10 % speed to nearby allies
  {
    id: 'disabler_wind', name: 'Anulador de Vento',
    baseHp: 260, speed: 55, agility: 5,
    immune: 'wind', halfElements: ['fire', 'water'],
    color: '#aacc44', size: 16, baseLivesLost: 1, reward: 28, xp: 10,
    description: 'Desativa torres de Vento próximas. Bônus: aliados próximos ficam 10 % mais rápidos.',
    behaviorIds: ['disabler_aura'],
    disablerElement: 'wind',
    renderProfileId: 'disabler',
  },
];

// ─── Boss Definitions (5 unique encounters) ───────────────────────────────────
// Ordered from first to last appearance (rotation: wave 10, 20, 30, 40, 50, then repeats).

export const BOSS_DEFS: EnemyDef[] = [
  // ── Colosso da Forja (wave 10) — Fogo + Terra ────────────────────────────
  // Slow pressure. Drops lava fissures. Rages at 50 % HP.
  {
    id: 'boss_forge_colossus', name: 'Colosso da Forja',
    baseHp: 1400, speed: 44, agility: 6,
    immune: 'earth', halfElements: ['fire', 'wind'],
    color: '#cc5500', size: 36, baseLivesLost: 5, reward: 160, xp: 55,
    description: 'Boss de pressão crescente. Dropa fissuras de lava pelo caminho. Ao chegar a 50% HP entra em Fúria da Forja.',
    isBoss: true,
    behaviorIds: ['boss_forge_colossus'],
  },

  // ── Leviatã das Marés (wave 20) — Água ───────────────────────────────────
  // Sustain + terrain control. Alternates Protected/Vulnerable phases.
  {
    id: 'boss_tidal_leviathan', name: 'Leviatã das Marés',
    baseHp: 2000, speed: 40, agility: 5,
    immune: 'fire', halfElements: ['earth', 'wind'],
    color: '#0044cc', size: 40, baseLivesLost: 5, reward: 250, xp: 80,
    description: 'Boss de sustain. Alterna entre fases Protegida (50% redução) e Vulnerável. Pulsa cura em aliados próximos.',
    isBoss: true,
    behaviorIds: ['boss_tidal_leviathan'],
  },

  // ── Rainha da Tempestade (wave 30) — Vento ───────────────────────────────
  // Chaos and acceleration. Summons harpies. Storm frenzy at 40 % HP.
  {
    id: 'boss_storm_queen', name: 'Rainha da Tempestade',
    baseHp: 1850, speed: 65, agility: 10,
    immune: 'wind', halfElements: ['water', 'fire'],
    color: '#88dd22', size: 38, baseLivesLost: 5, reward: 300, xp: 90,
    description: 'Boss de caos. Rápida e imprevisível. Invoca harpias periodicamente. A 40% HP entra em Fúria da Tempestade.',
    isBoss: true,
    behaviorIds: ['boss_storm_queen'],
  },

  // ── Guardião do Abismo (wave 40) — Sombrio ────────────────────────────────
  // Adaptive boss. Reads dominant nearby element; resists it. Summons shadow adds at HP thresholds.
  {
    id: 'boss_abyss_guardian', name: 'Guardião do Abismo',
    baseHp: 2600, speed: 44, agility: 7,
    immune: 'water', halfElements: ['earth', 'fire'],
    color: '#440088', size: 44, baseLivesLost: 5, reward: 380, xp: 110,
    description: 'Boss técnico. Detecta o elemento dominante próximo e o resiste em 40%. Invoca sombras em limiares de HP.',
    isBoss: true,
    behaviorIds: ['boss_abyss_guardian'],
  },

  // ── Avatar Prismático (wave 50) — Multi-elemental ─────────────────────────
  // Cycles through 4 elemental phases (12 s each); final form at 25 % HP.
  {
    id: 'boss_prismatic_avatar', name: 'Avatar Prismático',
    baseHp: 3200, speed: 50, agility: 8,
    immune: 'earth', halfElements: ['fire', 'water'],
    color: '#ff88ff', size: 50, baseLivesLost: 5, reward: 500, xp: 140,
    description: 'Boss final de adaptação. Cicla por 4 fases elementais (fogo/água/terra/vento). Fase Final ao chegar a 25% HP.',
    isBoss: true,
    behaviorIds: ['boss_prismatic_avatar'],
  },
];
