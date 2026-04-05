// ═══════════════════════════════════════════════════════════════════════════════
//  GameState — pure data interfaces for each domain slice.
//  No logic lives here. All mutation is done through StateStore and its slices.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Vec2, OwnedItem, ItemDropAnim, ProjectileData, Puddle } from '../types';
import type { SingleTower as Tower } from '../entities/towers/SingleTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { MapData } from '../systems/MapGenerator';
import type { BurnZone, FloatingText } from '../core/GameContext';

// ─── Per-domain slice interfaces ──────────────────────────────────────────────

/** All tower-related UI and entity state. */
export interface TowerSliceState {
  towers: Tower[];
  selectedType: string;
  movingTower: Tower | null;
  upgradePopup: { col: number; row: number } | null;
  hoveredCell: Vec2 | null;
}

/** Enemies, projectiles, and all combat ephemera. */
export interface EnemySliceState {
  enemies: BaseEnemy[];
  projectiles: ProjectileData[];
  floatingTexts: FloatingText[];
  puddles: Puddle[];
  burnZones: BurnZone[];
}

/** Wave and flow control — pause, speed, auto. */
export interface PhaseSliceState {
  paused: boolean;
  autoWave: boolean;
  gameSpeed: 1 | 2;
  debugMode: boolean;
}

/** Procedural map data and expansion history. */
export interface MapSliceState {
  data: MapData;
  tier: number;
  seed: number;
}

/** Relics (items), drop animations, and item-driven timers. */
export interface RelicSliceState {
  items: OwnedItem[];
  itemDropAnim: ItemDropAnim | null;
  cataclysmTimer: number;
  titanShieldCharges: number;
  titanShieldWaves: number;
  lastItemWave: number;
  lastTronoWave: number;
}

/** Economy: gold, lives, score. */
export interface ResourceSliceState {
  gold: number;
  lives: number;
  score: number;
}

// ─── Root state ───────────────────────────────────────────────────────────────

export interface GameState {
  towers:    TowerSliceState;
  enemies:   EnemySliceState;
  phase:     PhaseSliceState;
  map:       MapSliceState;
  relics:    RelicSliceState;
  resources: ResourceSliceState;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

import { INITIAL_GOLD, BASE_LIVES } from '../constants';

export function createInitialState(map: MapData): GameState {
  return {
    towers: {
      towers:       [],
      selectedType: '',
      movingTower:  null,
      upgradePopup: null,
      hoveredCell:  null,
    },
    enemies: {
      enemies:       [],
      projectiles:   [],
      floatingTexts: [],
      puddles:       [],
      burnZones:     [],
    },
    phase: {
      paused:    false,
      autoWave:  false,
      gameSpeed: 1,
      debugMode: false,
    },
    map: {
      data: map,
      tier: 0,
      seed: 1,
    },
    relics: {
      items:               [],
      itemDropAnim:        null,
      cataclysmTimer:      0,
      titanShieldCharges:  0,
      titanShieldWaves:    0,
      lastItemWave:        0,
      lastTronoWave:       0,
    },
    resources: {
      gold:  INITIAL_GOLD,
      lives: BASE_LIVES,
      score: 0,
    },
  };
}
