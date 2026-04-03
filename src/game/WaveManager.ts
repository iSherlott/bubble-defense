import { ENEMY_DEFS, BOSS_DEFS, GOLEM_DEFS } from '../constants';
import { CFG_WAVE_BASE_COUNT, CFG_WAVE_COUNT_PER_WAVE, CFG_ELITE_START_WAVE, CFG_ELITE_MULT,
  CFG_ENEMY_HP_SCALE_PER_WAVE, CFG_ENEMY_SPEED_SCALE_PER_WAVE } from '../settings';
import { Enemy, resetEnemyIds } from '../entities/Enemy';
import type { Vec2 } from '../types';

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

/** Returns list of enemy type IDs available for a given wave number */
function getEnemyPool(wave: number): string[] {
  const pool: string[] = ['goblin'];
  if (wave >= 3)  pool.push('troll');
  if (wave >= 5)  pool.push('harpy');
  if (wave >= 8)  pool.push('golem_fire', 'golem_water', 'golem_earth', 'golem_wind');
  if (wave >= 12) pool.push('golem');
  if (wave >= 15) pool.push('dragon');
  return pool;
}

/** How many enemy types appear in a wave */
function typeCountForWave(wave: number): number {
  if (wave < 10)  return 1;
  if (wave < 20)  return 2;
  if (wave < 30)  return 3;
  if (wave < 40)  return 4;
  return 5;
}

/** How many elite units appear (each is 1 enemy with CFG_ELITE_MULT power) */
function eliteCountForWave(wave: number): number {
  if (wave < CFG_ELITE_START_WAVE) return 0;
  return Math.floor((wave - CFG_ELITE_START_WAVE + 10) / 10);
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

  constructor() {
    this.currentWave = 0;
    this.spawnQueues = [];
    this.waveActive  = false;
    this.waveComplete = false;
    this.betweenWaves = true;
    this.isBossWave   = false;
    this.totalEnemiesThisWave   = 0;
    this.enemiesKilledThisWave  = 0;
  }

  reset() {
    Object.assign(this, new WaveManager());
    resetEnemyIds();
  }

  startWave() {
    if (this.waveActive) return;
    this.currentWave++;
    this.isBossWave = this.currentWave % 10 === 0;

    const rng = waveRng(this.currentWave * 1337 + 7);
    const baseMult = 1 + (this.currentWave - 1) * 0.1;

    if (this.isBossWave) {
      const bossIdx = Math.max(0, Math.floor((this.currentWave - 10) / 10)) % BOSS_DEFS.length;
      const boss = BOSS_DEFS[bossIdx];
      this.spawnQueues = [{ typeId: boss.id, count: 1, timer: 0, spawned: 0, isBoss: true, isElite: false }];
    } else {
      // Pick enemy types
      const pool = getEnemyPool(this.currentWave);
      const typeCount = Math.min(typeCountForWave(this.currentWave), pool.length);
      const chosen: string[] = [];
      const poolCopy = [...pool];
      for (let i = 0; i < typeCount; i++) {
        const idx = Math.floor(rng() * poolCopy.length);
        chosen.push(poolCopy.splice(idx, 1)[0]);
      }

      // Base count per type (increases with wave)
      const baseCount = Math.round(CFG_WAVE_BASE_COUNT + this.currentWave * CFG_WAVE_COUNT_PER_WAVE);

      this.spawnQueues = chosen.map(typeId => ({
        typeId, count: baseCount, timer: 0, spawned: 0, isBoss: false, isElite: false,
      }));

      // Elite units at wave 50+
      const elites = eliteCountForWave(this.currentWave);
      for (let i = 0; i < elites; i++) {
        const eliteType = chosen[Math.floor(rng() * chosen.length)];
        this.spawnQueues.push({ typeId: eliteType, count: 1, timer: 0, spawned: 0, isBoss: false, isElite: true });
      }
    }

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

  update(dt: number, activeEnemies: Enemy[], waypoints: Vec2[], totalLength: number): Enemy[] {
    if (!this.waveActive) return [];

    const spawned: Enemy[] = [];
    const dtMs = dt * 1000;
    const waveM = 1 + (this.currentWave - 1) * 0.1;

    // All enemy defs combined
    const allDefs = [...ENEMY_DEFS, ...GOLEM_DEFS, ...BOSS_DEFS];

    let allDone = true;
    for (const q of this.spawnQueues) {
      if (q.spawned < q.count) {
        allDone = false;
        q.timer -= dtMs;
        if (q.timer <= 0) {
          const def = allDefs.find(d => d.id === q.typeId);
          if (!def) { q.spawned++; continue; }
          const mult = q.isElite ? waveM * CFG_ELITE_MULT : waveM;
          const e = new Enemy(def, mult);
          if (q.isElite) (e as any)._elite = true;  // mark for rendering
          e.pos = { x: waypoints[0]?.x ?? 0, y: waypoints[0]?.y ?? 0 };
          spawned.push(e);
          q.spawned++;
          q.timer = 100 + Math.random() * 1900;
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
}
