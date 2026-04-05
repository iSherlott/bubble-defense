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
  /** Short label for the sidebar describing magic effect. */
  magicDescription?: string;

  // ── Behavior IDs (optional — defaults to element-based lookup) ──
  /** Magic behavior to use. Defaults to element if not set. */
  magicBehaviorId?: string;
  /** Targeting strategy. Defaults to 'nearest_furthest' if not set. */
  targetingBehaviorId?: string;
  /** Render profile for visual appearance. */
  renderProfileId?: string;
  /** Skill animation to play on magic cast. */
  skillAnimationId?: string;
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
  /** @deprecated Use behaviorIds instead. Kept for backward compatibility. */
  bossAbility?: string;
  /** Behavior IDs to attach from the enemy behavior registry. Works on any enemy type. */
  behaviorIds?: string[];
  golemType?: ElementType;   // elemental golem variant with special ability
  isElite?: boolean;         // elite unit (set at runtime, 10× power)
  /** Render profile ID for visual appearance. Defaults to enemy id if not set. */
  renderProfileId?: string;
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

// ─── Multi-Element Damage ─────────────────────────────────────────────────────
export interface DamageComponent {
  element: ElementType;
  amount: number;
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
  /** Multi-element damage components. When present, overrides single damage+element for resolution. */
  components?: DamageComponent[];
  towerId: number;
  color: string;
  dead: boolean;
  isMagic: boolean;
  isCrit: boolean;
  isMiss: boolean;
  burnFromMagic: boolean;   // fire talent T3: burn on magic hit
}

// ─── Game Screens ─────────────────────────────────────────────────────────────
export type GameScreen = 'menu' | 'affinity' | 'archetype' | 'bonus' | 'game' | 'levelup' | 'talent' | 'gameover' | 'bestiary';
// ─── Archetype System ────────────────────────────────────────────────────────
export interface ArchetypeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  baseStats: Stats;
}
// ─── Fusion System ────────────────────────────────────────────────────────────
export type FusionId = string;  // e.g. 'fire+earth' => 'magma'

export interface FusionDef {
  id: FusionId;
  name: string;
  primaryElement: ElementType;
  secondaryElement: ElementType;
  icon: string;
  color: string;
  description: string;
  /** Magic damage multiplier applied on top of primary magic damage */
  magicDamageMult: number;
  /** Multiplier on the magic bar max (e.g. 2 = takes 2× longer to charge) */
  magicBarMaxMult?: number;
  /** Special effect ID */
  specialEffect: string;
}

// ─── Item System ──────────────────────────────────────────────────────────────
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  description: string;
  /** The effect type for stacking */
  effectType:
    | 'gold_mult' | 'slow_aura' | 'discount'
    | 'fire_dmg' | 'water_atkspd' | 'earth_range' | 'wind_stun_dur'
    | 'fire_magic_charge' | 'water_slow_amp' | 'earth_radius' | 'wind_push_tiles'
    | 'hunter_dmg' | 'fire_magma_trail' | 'water_freeze' | 'earth_sandstorm'
    | 'wind_chain_magic' | 'titan_shield' | 'wave_gold_bonus' | 'fire_aoe_splash'
    | 'boss_dmg_bonus' | 'all_towers_buff' | 'cataclysm';
  effectValue: number;
}

export interface OwnedItem {
  defId: string;
  stacks: number;  // 1-3
}

// ─── Item Drop Animation ──────────────────────────────────────────────────────
export interface ItemDropAnim {
  item: ItemDef;
  phase: 'rising' | 'showing' | 'fading';
  timer: number;
  totalTime: number;
}

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
    archetypeId?: string;
  };
  game: {
    gold: number;
    lives: number;
    wave: number;
    score: number;
    mapSeed?: number;
    items: Array<{ defId: string; stacks: number }>;
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
      fusionId?: string;
    }>;
  };
  timestamp: number;
}
