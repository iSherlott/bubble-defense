// ═══════════════════════════════════════════════════════════════════════════════
//  StateStore — the single manipulation class for all game state.
//
//  Holds one GameState instance and exposes six typed slice managers:
//    store.towerMgr    → TowerSlice
//    store.enemyMgr    → EnemySlice
//    store.phaseMgr    → PhaseSlice
//    store.mapMgr      → MapSlice
//    store.relicMgr    → RelicSlice
//    store.resourceMgr → ResourceSlice
//    store.fsm         → GameStateMachine
//
//  Implements IGameContext so all existing systems keep working unchanged.
//  Systems receive the store, call the same ctx.enemies / ctx.gold / ctx.addFT
//  API they always did — the store delegates to the appropriate slice.
// ═══════════════════════════════════════════════════════════════════════════════

import type { BaseTower } from '../entities/BaseTower';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { ProjectileData, Puddle, Vec2, OwnedItem, ItemDropAnim, GameScreen } from '../types';
import type { Player } from '../player/Player';
import type { SkillTree } from '../player/SkillTree';
import type { WaveManager } from '../systems/WaveManager';
import type { MapData } from '../systems/MapGenerator';
import type { IGameContext, FloatingText, BurnZone, ItemState } from '../core/GameContext';
import type { SingleTower as Tower } from '../entities/towers/SingleTower';
import type { AnimationSystem } from '../systems/AnimationSystem';

import { GameState, createInitialState } from './GameState';
import { TowerSlice }    from './slices/TowerSlice';
import { EnemySlice }    from './slices/EnemySlice';
import { PhaseSlice }    from './slices/PhaseSlice';
import { MapSlice }      from './slices/MapSlice';
import { RelicSlice }    from './slices/RelicSlice';
import { ResourceSlice } from './slices/ResourceSlice';
import { GameStateMachine } from './GameStateMachine';
import { INITIAL_GOLD, BASE_LIVES } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────

export class StateStore implements IGameContext {
  // ── Domain slices ──────────────────────────────────────────────────────────
  readonly towerMgr:    TowerSlice;
  readonly enemyMgr:    EnemySlice;
  readonly phaseMgr:    PhaseSlice;
  readonly mapMgr:      MapSlice;
  readonly relicMgr:    RelicSlice;
  readonly resourceMgr: ResourceSlice;
  readonly fsm:         GameStateMachine;

  // ── References held externally (Player, WaveManager, SkillTree) ───────────
  // These are passed in after construction because they have their own
  // lifecycle managed by Game.ts. The store reads them but doesn't own them.
  player!: Player;
  talentTree!: SkillTree;
  waveManager!: WaveManager;
  animations!: AnimationSystem;

  private _state: GameState;

  /** Grouped item-state object (IGameContext contract). Live proxy into relics slice. */
  readonly itemState!: ItemState;

  constructor(initialMap: MapData) {
    this._state = createInitialState(initialMap);

    // Build a single live proxy object so ctx.itemState.x++ works correctly
    const relics = this._state.relics;
    Object.defineProperty(this, 'itemState', {
      value: Object.defineProperties({} as ItemState, {
        titanShieldCharges: { get: () => relics.titanShieldCharges, set: (v: number) => { relics.titanShieldCharges = v; }, enumerable: true },
        titanShieldWaves:   { get: () => relics.titanShieldWaves,   set: (v: number) => { relics.titanShieldWaves   = v; }, enumerable: true },
        cataclysmTimer:     { get: () => relics.cataclysmTimer,     set: (v: number) => { relics.cataclysmTimer     = v; }, enumerable: true },
        lastTronoWave:      { get: () => relics.lastTronoWave,      set: (v: number) => { relics.lastTronoWave      = v; }, enumerable: true },
        lastItemWave:       { get: () => relics.lastItemWave,       set: (v: number) => { relics.lastItemWave       = v; }, enumerable: true },
      }),
      writable: false,
      enumerable: true,
    });

    this.towerMgr    = new TowerSlice(this._state.towers);
    this.enemyMgr    = new EnemySlice(this._state.enemies);
    this.phaseMgr    = new PhaseSlice(this._state.phase);
    this.mapMgr      = new MapSlice(this._state.map);
    this.relicMgr    = new RelicSlice(this._state.relics);
    this.resourceMgr = new ResourceSlice(this._state.resources);
    this.fsm         = new GameStateMachine();
  }

  // ─── Wiring helpers ────────────────────────────────────────────────────────
  /** Call once after Player/TalentTree/WaveManager are constructed. */
  wire(
    player: Player,
    talentTree: SkillTree,
    waveManager: WaveManager,
    hasSaveFn: () => boolean,
  ): void {
    this.player      = player;
    this.talentTree  = talentTree;
    this.waveManager = waveManager;

    // Plug guards into the FSM using closures over live state
    this.fsm.setHasSaveGuard(hasSaveFn);
    this.fsm.setBonusSpentGuard(() => this.player.bonusPoints <= 0);
  }

  /** Reset all slice state for a new game run. */
  resetForNewGame(map: MapData, seed: number): void {
    this.towerMgr._raw.towers       = [];
    this.towerMgr._raw.selectedType = '';
    this.towerMgr._raw.movingTower  = null;
    this.towerMgr._raw.upgradePopup = null;
    this.towerMgr._raw.hoveredCell  = null;

    this.enemyMgr._raw.enemies       = [];
    this.enemyMgr._raw.projectiles   = [];
    this.enemyMgr._raw.floatingTexts = [];
    this.enemyMgr._raw.puddles       = [];
    this.enemyMgr._raw.burnZones     = [];

    this.phaseMgr.reset();
    this.relicMgr.reset();
    this.resourceMgr.reset(INITIAL_GOLD, BASE_LIVES);
    this.mapMgr.setMap(map, 0, seed);
  }

  // ── IGameContext implementation ───────────────────────────────────────────
  // Systems (CombatSystem, EffectSystem, etc.) use these properties directly.
  // They delegate to the appropriate slice so there's a single source of truth.

  // Towers
  get towers(): BaseTower[]        { return this._state.towers.towers; }
  set towers(v: BaseTower[])       { this._state.towers.towers = v as Tower[]; }

  // Enemies
  get enemies(): BaseEnemy[]       { return this._state.enemies.enemies; }
  set enemies(v: BaseEnemy[])      { this._state.enemies.enemies = v; }

  // Projectiles
  get projectiles(): ProjectileData[]      { return this._state.enemies.projectiles; }
  set projectiles(v: ProjectileData[])     { this._state.enemies.projectiles = v; }

  // Puddles
  get puddles(): Puddle[]          { return this._state.enemies.puddles; }
  set puddles(v: Puddle[])         { this._state.enemies.puddles = v; }

  // Burn zones
  get burnZones(): BurnZone[]      { return this._state.enemies.burnZones; }
  set burnZones(v: BurnZone[])     { this._state.enemies.burnZones = v; }

  // Floating texts
  get floatingTexts(): FloatingText[] { return this._state.enemies.floatingTexts; }
  set floatingTexts(v: FloatingText[]) { this._state.enemies.floatingTexts = v; }

  // Economy
  get gold(): number               { return this._state.resources.gold; }
  set gold(v: number)              { this._state.resources.gold = v; }

  get lives(): number              { return this._state.resources.lives; }
  set lives(v: number)             { this._state.resources.lives = v; }

  get score(): number              { return this._state.resources.score; }
  set score(v: number)             { this._state.resources.score = v; }

  // Items
  get items(): OwnedItem[]         { return this._state.relics.items; }
  set items(v: OwnedItem[])        { this._state.relics.items = v; }

  // Item timers
  get titanShieldCharges(): number        { return this._state.relics.titanShieldCharges; }
  set titanShieldCharges(v: number)       { this._state.relics.titanShieldCharges = v; }

  get titanShieldWaves(): number          { return this._state.relics.titanShieldWaves; }
  set titanShieldWaves(v: number)         { this._state.relics.titanShieldWaves = v; }

  get cataclysmTimer(): number            { return this._state.relics.cataclysmTimer; }
  set cataclysmTimer(v: number)           { this._state.relics.cataclysmTimer = v; }

  get _lastTronoWave(): number            { return this._state.relics.lastTronoWave; }
  set _lastTronoWave(v: number)           { this._state.relics.lastTronoWave = v; }

  get lastItemWave(): number              { return this._state.relics.lastItemWave; }
  set lastItemWave(v: number)             { this._state.relics.lastItemWave = v; }

  // Drop animation
  get itemDropAnim(): ItemDropAnim | null  { return this._state.relics.itemDropAnim; }
  set itemDropAnim(v: ItemDropAnim | null) { this._state.relics.itemDropAnim = v; }

  // Map
  get map(): MapData               { return this._state.map.data; }

  // Screen (delegated to FSM)
  get screen(): string             { return this.fsm.current; }
  set screen(v: string)            { this.fsm.forceGo(v as GameScreen); }

  /** Preferred way for systems to request a screen change — uses FSM guards. */
  requestScreen(to: GameScreen): void {
    this.fsm.go(to);
  }

  // Actions
  addFT(pos: Vec2, text: string, color: string): void {
    this.enemyMgr.addFloatingText(pos, text, color);
  }

  triggerAoeFlash(_x: number, _y: number, _radius: number): void {
    // Implemented by Game.ts and injected via `onAoeFlash`
    this._onAoeFlash?.(_x, _y, _radius);
  }

  private _onAoeFlash?: (x: number, y: number, radius: number) => void;

  /** Wire the visual AoE flash callback (from Renderer). */
  setAoeFlashHandler(fn: (x: number, y: number, radius: number) => void): void {
    this._onAoeFlash = fn;
  }

  // ─── Convenience read ──────────────────────────────────────────────────────
  /** Raw snapshot of the full state (for serialisation, debugging). */
  snapshot(): Readonly<GameState> { return this._state; }
}
