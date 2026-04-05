// ═══════════════════════════════════════════════════════════════════════════════
//  GameStateMachine — explicit screen/phase FSM.
//
//  Defines which transitions are valid, optional guards (preconditions),
//  and entry/exit hooks. All screen changes go through here.
//
//  Usage:
//    fsm.can('game')         → boolean
//    fsm.go('game')          → boolean (transitions if allowed)
//    fsm.current             → current screen name
//    fsm.onEnter(cb)         → subscribe to any transition
// ═══════════════════════════════════════════════════════════════════════════════

import type { GameScreen } from '../types';

// ─── Transition definition ────────────────────────────────────────────────────

interface TransitionDef {
  /** Condition that must be true for the transition to be allowed. */
  guard?: () => boolean;
  /** Called just before leaving the current screen. */
  onExit?: () => void;
  /** Called just after entering the new screen. */
  onEnter?: () => void;
}

/** Map: from → to → TransitionDef */
type TransitionTable = Partial<Record<GameScreen, Partial<Record<GameScreen, TransitionDef>>>>;

// ─── Change event ─────────────────────────────────────────────────────────────

export interface ScreenChangeEvent {
  from: GameScreen;
  to: GameScreen;
}

// ─────────────────────────────────────────────────────────────────────────────

export class GameStateMachine {
  private _current: GameScreen = 'menu';
  private _table: TransitionTable = {};
  private _listeners: Array<(ev: ScreenChangeEvent) => void> = [];

  constructor() {
    this._buildTable();
  }

  get current(): GameScreen { return this._current; }

  // ─── Query ─────────────────────────────────────────────────────────────────
  /** Returns true if transitioning to `to` is currently allowed. */
  can(to: GameScreen): boolean {
    const def = this._table[this._current]?.[to];
    if (!def) return false;
    return def.guard ? def.guard() : true;
  }

  /** List all screens reachable from the current one (ignoring guards). */
  reachable(): GameScreen[] {
    return Object.keys(this._table[this._current] ?? {}) as GameScreen[];
  }

  // ─── Transition ────────────────────────────────────────────────────────────
  /**
   * Attempt a transition. Returns true if it succeeded.
   * Runs onExit → changes current → runs onEnter → notifies listeners.
   */
  go(to: GameScreen): boolean {
    if (!this.can(to)) return false;
    const def = this._table[this._current]![to]!;
    const from = this._current;
    def.onExit?.();
    this._current = to;
    def.onEnter?.();
    this._notify({ from, to });
    return true;
  }

  /**
   * Force a transition without checking guards.
   * Use only for system-initiated transitions (game over, level up).
   */
  forceGo(to: GameScreen): void {
    const from = this._current;
    this._current = to;
    this._notify({ from, to });
  }

  // ─── Listeners ─────────────────────────────────────────────────────────────
  onTransition(cb: (ev: ScreenChangeEvent) => void): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  private _notify(ev: ScreenChangeEvent) {
    for (const l of this._listeners) l(ev);
  }

  // ─── Guards (set from outside so they can close over store state) ──────────
  private _hasSave: () => boolean = () => false;
  private _bonusSpent: () => boolean = () => true;

  setHasSaveGuard(fn: () => boolean): void    { this._hasSave   = fn; }
  setBonusSpentGuard(fn: () => boolean): void { this._bonusSpent = fn; }

  // ─── Transition table ─────────────────────────────────────────────────────
  private _buildTable(): void {
    // Helper for readability
    const t = (guard?: () => boolean, onEnter?: () => void, onExit?: () => void): TransitionDef =>
      ({ guard, onEnter, onExit });

    this._table = {
      menu: {
        affinity:  t(),
        game:      t(() => this._hasSave()),  // load save
      },
      affinity: {
        archetype: t(),
        menu:      t(),                        // back
      },
      archetype: {
        bonus:     t(),
        affinity:  t(),                        // back
      },
      bonus: {
        game:      t(() => this._bonusSpent()),
        archetype: t(),                        // back
      },
      game: {
        levelup:  t(),
        talent:   t(),
        gameover: t(),
        bestiary: t(),
      },
      levelup: {
        game: t(),
      },
      talent: {
        game: t(),
      },
      gameover: {
        menu:     t(),
        affinity: t(),  // restart — goes to character selection
      },
      bestiary: {
        game: t(),
      },
    };
  }
}
