import { GameConfig } from '../config';
import { createEnemy, resetEnemyIds } from '../factories/EnemyFactory';
import { enemyRegistry } from '../registries';
import type { BaseEnemy } from '../entities/BaseEnemy';
import type { Vec2 } from '../types';
import type { WaveRules } from '../types/wave';
import { DEFAULT_WAVE_RULES } from '../content/waveRules';

const cfg = GameConfig.get();

interface SpawnQueue {
  typeId: string; count: number;
  timer: number; spawned: number;
  isBoss: boolean; isElite: boolean;
}

// Seeded LCG for deterministic wave RNG
function waveRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s + 0x6D2B79F5 | 0, 0x9e3779b9) | 0;
    return ((s ^ (s >>> 16)) >>> 0) / 0xffffffff;
  };
}

/** Returns list of enemy type IDs available for a given wave from spawn rules */
function getEnemyPool(wave: number, rules: WaveRules): string[] {
  return rules.spawnPool
    .filter(e => wave >= e.fromWave)
    .map(e => e.typeId);
}

/** How many enemy types appear in a wave, from bracket rules */
function typeCountForWave(wave: number, rules: WaveRules): number {
  let result = 1;
  for (const b of rules.typeCountBrackets) {
    if (wave >= b.minWave) result = b.maxTypes;
  }
  return result;
}

/** Gradual elite multiplier: ramps from base to max */
function eliteMultForWave(wave: number): number {
  if (wave < cfg.enemy.eliteStartWave) return 1;
  const progress = Math.min(1, (wave - cfg.enemy.eliteStartWave) / cfg.enemy.eliteScaleWaves);
  return cfg.enemy.eliteBaseMult + (cfg.enemy.eliteMaxMult - cfg.enemy.eliteBaseMult) * progress;
}

/** How many elite units appear */
function eliteCountForWave(wave: number): number {
  if (wave < cfg.enemy.eliteStartWave) return 0;
  return 1 + Math.floor((wave - cfg.enemy.eliteStartWave) / 10);
}

export class WaveManager {
  currentWave: number;
  spawnQueues: SpawnQueue[];
  waveActive: boolean;
  waveComplete: boolean;
  betweenWaves: boolean;
  isBossWave: boolean;
  totalEnemiesThisWave: number;
  enemiesKilledThisWave: number;
  rules: WaveRules;

  constructor(rules: WaveRules = DEFAULT_WAVE_RULES) {
    this.currentWave = 0;
    this.spawnQueues = [];
    this.waveActive  = false;
    this.waveComplete = false;
    this.betweenWaves = true;
    this.isBossWave   = false;
    this.totalEnemiesThisWave   = 0;
    this.enemiesKilledThisWave  = 0;
    this.rules = rules;
  }

  reset() {
    Object.assign(this, new WaveManager());
    resetEnemyIds();
  }

  startWave() {
    if (this.waveActive) return;
    this.currentWave++;
    this.isBossWave = this.currentWave % this.rules.bossEveryN === 0;

    this.spawnQueues = this.composeWavePool(this.currentWave);

    this.totalEnemiesThisWave  = this.spawnQueues.reduce((s, q) => s + q.count, 0);
    this.enemiesKilledThisWave = 0;
    this.waveActive   = true;
    this.waveComplete = false;
    this.betweenWaves = false;
  }

  get waveProgress(): number {
    if (this.totalEnemiesThisWave === 0) return 1;
    return this.enemiesKilledThisWave / this.totalEnemiesThisWave;
  }

  update(dt: number, activeEnemies: BaseEnemy[], waypoints: Vec2[], totalLength: number): BaseEnemy[] {
    if (!this.waveActive) return [];

    const spawned: BaseEnemy[] = [];
    const dtMs = dt * 1000;

    let allDone = true;
    for (const q of this.spawnQueues) {
      if (q.spawned < q.count) {
        allDone = false;
        q.timer -= dtMs;
        if (q.timer <= 0) {
          const def = enemyRegistry.getDef(q.typeId);
          if (!def) { q.spawned++; continue; }
          const eliteMult = q.isElite ? eliteMultForWave(this.currentWave) : 1;
          // Use the factory — picks BossEnemy / GolemEnemy / StandardEnemy automatically
          const e = createEnemy(def, this.currentWave, eliteMult);
          if (q.isElite) e.isElite = true;  // mark for rendering
          e.pos = { x: waypoints[0]?.x ?? 0, y: waypoints[0]?.y ?? 0 };
          spawned.push(e);
          q.spawned++;
          q.timer = 600 + Math.random() * 800;
        }
      }
    }

    for (const e of activeEnemies) e.update(dt, waypoints, totalLength);

    if (allDone && activeEnemies.length === 0 && spawned.length === 0) {
      this.waveActive   = false;
      this.waveComplete = true;
      this.betweenWaves = true;
    }
    return spawned;
  }

  /** Preview info for next wave (types, boss, elite count) */
  getNextWavePreview(): { types: string[]; isBoss: boolean; eliteCount: number; enemyCount: number } {
    const nextWave = this.currentWave + 1;
    const isBoss = nextWave % this.rules.bossEveryN === 0;
    const queues = this.composeWavePool(nextWave);
    const types = [...new Set(queues.map(q => q.typeId))];
    const eliteCount = queues.filter(q => q.isElite).length;
    const enemyCount = queues.reduce((s, q) => s + q.count, 0);
    return { types, isBoss, eliteCount, enemyCount };
  }

  // ─── Wave Composition (shared by startWave + preview) ─────────────────────

  private composeWavePool(wave: number): SpawnQueue[] {
    const isBoss = wave % this.rules.bossEveryN === 0;
    const rng = waveRng(wave * 1337 + 7);

    if (isBoss) {
      const bossDefs = enemyRegistry.getBossDefs();
      const bossIdx = Math.max(0, Math.floor((wave - this.rules.bossEveryN) / this.rules.bossEveryN)) % bossDefs.length;
      return [{ typeId: bossDefs[bossIdx].id, count: 1, timer: 0, spawned: 0, isBoss: true, isElite: false }];
    }

    const pool = getEnemyPool(wave, this.rules);
    const typeCount = Math.min(typeCountForWave(wave, this.rules), pool.length);
    const chosen: string[] = [];
    const poolCopy = [...pool];
    for (let i = 0; i < typeCount; i++) {
      const idx = Math.floor(rng() * poolCopy.length);
      chosen.push(poolCopy.splice(idx, 1)[0]);
    }

    const totalCount = Math.round(cfg.enemy.waveBaseCount + wave * cfg.enemy.waveCountPerWave);
    const perType = Math.max(1, Math.round(totalCount / chosen.length));

    const queues: SpawnQueue[] = chosen.map(typeId => ({
      typeId, count: perType, timer: 0, spawned: 0, isBoss: false, isElite: false,
    }));

    const elites = eliteCountForWave(wave);
    for (let i = 0; i < elites; i++) {
      const eliteType = chosen[Math.floor(rng() * chosen.length)];
      queues.push({ typeId: eliteType, count: 1, timer: 0, spawned: 0, isBoss: false, isElite: true });
    }

    return queues;
  }
}
