// ─── GameFlowController — game lifecycle, map management, save/load ──────────
// Extracted from Game.ts for cleaner separation of flow control.

import type { ElementType, FusionDef } from '../types';
import type { Game } from './Game';
import { Player } from '../player/Player';
import { SkillTree as TalentTree } from '../player/SkillTree';
import { WaveManager } from '../systems/WaveManager';
import { generateMap, extendMap } from '../systems/MapGenerator';
import { saveGame, loadGame, hasSave } from '../services/SaveSystem';
import { resetTowerIds, createTower } from '../factories/TowerFactory';
import { resetProjectileIds } from '../factories/ProjectileFactory';
import { towerRegistry, fusionRegistry, evolutionRegistry } from '../registries';
import { INITIAL_GOLD, BASE_LIVES, MAP_TIER_AT } from '../constants';
import { GameConfig } from '../config';

export class GameFlowController {
  constructor() {}

  /** Reset all game state for a new run */
  initState(g: Game): void {
    g.gold  = INITIAL_GOLD; g.lives = BASE_LIVES; g.score = 0;
    g.towers = []; g.enemies = []; g.projectiles = [];
    g.floatingTexts = []; g.puddles = []; g.burnZones = [];
    g.items = []; g.itemDropAnim = null;
    g.itemState.lastItemWave = 0; g.itemState.cataclysmTimer = 0;
    g.itemState.titanShieldCharges = 0; g.itemState.titanShieldWaves = 0;
    g.itemState.lastTronoWave = 0;
    g.talentTree  = new TalentTree();
    g.waveManager = new WaveManager();
    g.upgradePopup = null; g.paused = false; g.autoWave = false;
    g.movingTower = null;
    g.selectedTowerType = '';
    g.animations.clear();
    resetTowerIds(); resetProjectileIds();
  }

  /** Start a new game after bonus point distribution */
  startNewGameFromBonus(g: Game): void {
    this.initState(g);
    const seed = Date.now() & 0xffffff;
    this.regenerateMap(g, 0, seed);
    g.requestScreen('game');
  }

  /** Start a new game with specific affinity and archetype */
  startNewGame(g: Game, affinity: ElementType, archetypeId: string): void {
    g.player = new Player();
    g.player.affinity = affinity;
    g.player.applyArchetype(archetypeId);
    this.initState(g);
    const seed = Date.now() & 0xffffff;
    this.regenerateMap(g, 0, seed);
    g.requestScreen('game');
  }

  /** Regenerate the map at a given tier */
  regenerateMap(g: Game, tier: number, seed: number): void {
    g.currentMapTier = tier;
    g.currentMapSeed = seed;
    g.map = generateMap(seed, tier);
    g.renderer.updateMap(g.map);
    g.towers = g.towers.filter(t => !g.map.pathCells.has(`${t.gridX},${t.gridY}`));
  }

  /** Expand the map to the next tier */
  expandMap(g: Game): void {
    const nextTier = g.currentMapTier + 1;
    if (nextTier >= GameConfig.get().map.tiers.length) return;
    const cost = g.towerService.getMapExpandCost(g.items);
    if (g.gold < cost) return;
    g.gold -= cost;
    this.doExpandMap(g, nextTier);
  }

  /** Select archetype, create player, and transition to bonus screen */
  selectArchetype(g: Game, id: string, affinity: ElementType): void {
    g.player = new Player();
    g.player.affinity = affinity;
    g.player.applyArchetype(id);
    g.requestScreen('bonus');
  }

  /** Internal: expand map to a specific tier */
  doExpandMap(g: Game, tier: number): void {
    const newSeed = (g.currentMapSeed * 1103515245 + 12345) & 0xffffff;
    g.map = extendMap(g.map, newSeed, tier);
    g.currentMapTier = tier;
    g.currentMapSeed = newSeed;
    g.renderer.updateMap(g.map);
    g.addFT(
      { x: g.map.gameWidth / 2, y: g.map.gameHeight / 2 },
      `🗺 Mapa expandido! Tier ${tier + 1}`, '#aaffaa',
    );
  }

  /** Check if a save exists */
  hasSaveAvailable(): boolean {
    return hasSave();
  }

  /** Load game from save data */
  loadGameFromSave(g: Game): void {
    const data = loadGame();
    if (!data) return;
    this.initState(g);
    g.player = new Player();
    g.player.fromJSON(data.player);
    g.talentTree.loadFromIds(data.player.purchasedTalents);
    g.player.talentPoints = data.player.talentPoints;
    g.gold  = data.game.gold;
    g.lives = data.game.lives;
    g.score = data.game.score;
    g.waveManager.currentWave = data.game.wave;

    const tier = MAP_TIER_AT(data.game.wave);
    this.regenerateMap(g, tier, data.game.mapSeed ?? 1);

    for (const t of data.game.towers) {
      const def = towerRegistry.has(t.typeId) ? towerRegistry.getDef(t.typeId) : null;
      if (!def) continue;
      let fusionDef: FusionDef | undefined;
      if (t.fusionId) {
        const [pe, se] = t.fusionId.split('+');
        fusionDef = fusionRegistry.getDef(pe, se) ?? undefined;
      }
      const tower = createTower(def, t.gridX, t.gridY, t.slotIndex as 0 | 1, fusionDef);
      tower.damageMult    = t.damageMult;
      tower.speedMult     = t.speedMult;
      tower.dualMagic     = t.dualMagic;
      tower.upgradeCount  = t.upgradeCount ?? 0;
      tower.upgradeHistory = t.upgradeHistory ?? [];
      tower.placedCost    = t.placedCost ?? def.baseCost;
      tower.goldSpent     = t.goldSpent  ?? def.baseCost;
      tower.isSecondary   = t.isSecondary ?? (t.slotIndex === 1);
      if (t.evolutionId) {
        const evoDef = evolutionRegistry.get(t.evolutionId);
        if (evoDef) tower.evolutionDef = evoDef;
      }
      g.towers.push(tower);
    }

    if (data.game.items) {
      g.items = data.game.items.map(i => ({ defId: i.defId, stacks: i.stacks }));
    }
    g.itemState.lastItemWave = Math.floor(data.game.wave / 10) * 10;

    g.requestScreen('game');
  }

  /** Save the current game state */
  saveCurrentGame(g: Game): void {
    if (g.waveManager.waveActive) return;
    saveGame({
      version: 1,
      player: { ...g.player.toJSON(), purchasedTalents: g.talentTree.getPurchasedIds() },
      game: {
        gold: g.gold, lives: g.lives,
        wave: g.waveManager.currentWave, score: g.score,
        mapSeed: g.currentMapSeed,
        items: g.items.map(i => ({ defId: i.defId, stacks: i.stacks })),
        towers: g.towers.map(t => ({
          typeId: t.def.id, gridX: t.gridX, gridY: t.gridY,
          slotIndex: t.slotIndex, damageMult: t.damageMult,
          speedMult: t.speedMult, upgradeCount: t.upgradeCount,
          upgradeHistory: t.upgradeHistory, dualMagic: t.dualMagic,
          placedCost: t.placedCost, goldSpent: t.goldSpent,
          isSecondary: t.isSecondary,
          fusionId: t.fusionDef?.id,
          evolutionId: t.evolutionDef?.id,
        })),
      },
      timestamp: Date.now(),
    });
  }
}
