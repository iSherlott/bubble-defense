// ─── Element System ───────────────────────────────────────────────────────────
export type ElementType = 'fire' | 'water' | 'earth' | 'wind';
export type StatKey = 'strength' | 'intelligence' | 'dexterity' | 'agility' | 'luck' | 'vitality';

export interface Stats {
  strength: number;       // +5% tower physical damage per point
  intelligence: number;   // +10% magic damage per point
  dexterity: number;      // hit chance vs enemy agility
  agility: number;        // +5% fire rate per point
  luck: number;           // crit chance = luck * 0.01; dual magic chance bonus
  vitality: number;       // reduces lives lost when enemy passes
}

// ─── Tower Definition (one element per tower) ─────────────────────────────────
export interface TowerDef {
  id: string;
  name: string;
  element: ElementType;
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;   // shots per second (water/wind = half of fire/earth)
  baseCost: number;       // always 50; 2nd tower on same cell costs 2×
  color: string;
  accentColor: string;
  magicBarMax: number;    // charge needed to fire magic
  magicBarGain: number;   // charge gained per normal shot (hit or miss)
  magicBaseDamage: number;
  description: string;
}

// ─── Enemy Definition ─────────────────────────────────────────────────────────
export interface EnemyDef {
  id: string;
  name: string;
  baseHp: number;
  speed: number;
  agility: number;
  immune: ElementType;
  halfElements: [ElementType, ElementType];
  color: string;
  size: number;
  baseLivesLost: number;
  reward: number;
  xp: number;
  description: string;
  isBoss?: boolean;
  golemType?: ElementType;   // elemental golem variant with special ability
  isElite?: boolean;         // elite unit (set at runtime, 10× power)
}

// ─── Puddle (water talent) ────────────────────────────────────────────────────
export interface Puddle {
  x: number;
  y: number;
  radius: number;
  remaining: number;   // seconds
  slowAmount: number;  // 0.05 = 5% slow
}

// ─── Runtime ─────────────────────────────────────────────────────────────────
export interface Vec2 { x: number; y: number; }

export interface ActiveEffect {
  type: 'slow' | 'burn';
  value: number;
  remaining: number;
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  element: ElementType;
  branch: number;    // 0=fire 1=water 2=earth 3=wind
  tier: number;      // 0-3
  requiredLevel: number;
  effectType: 'damage' | 'speed' | 'specialEffect' | 'magicSpeed';
  effectValue: number;
  purchased: boolean;
  cost: number;
}

// ─── Projectile ───────────────────────────────────────────────────────────────
export interface ProjectileData {
  id: number;
  x: number;
  y: number;
  targetEnemyId: number;
  speed: number;
  damage: number;
  element: ElementType;
  towerId: number;
  color: string;
  dead: boolean;
  isMagic: boolean;
  isCrit: boolean;
  isMiss: boolean;
  burnFromMagic: boolean;   // fire talent T3: burn on magic hit
}

// ─── Game Screens ─────────────────────────────────────────────────────────────
export type GameScreen = 'menu' | 'affinity' | 'game' | 'levelup' | 'talent' | 'gameover' | 'bestiary';

// ─── Save Data ────────────────────────────────────────────────────────────────
export interface SaveData {
  version: number;
  player: {
    level: number;
    xp: number;
    stats: Stats;
    talentPoints: number;
    affinity: ElementType;
    purchasedTalents: string[];
  };
  game: {
    gold: number;
    lives: number;
    wave: number;
    score: number;
    mapSeed?: number;
    towers: Array<{
      typeId: string;
      gridX: number;
      gridY: number;
      slotIndex: number;
      damageMult: number;
      speedMult: number;
      upgradeCount: number;
      upgradeHistory: Array<'damage'|'speed'>;
      dualMagic: boolean;
      placedCost: number;
      goldSpent: number;
      isSecondary: boolean;
    }>;
  };
  timestamp: number;
}
