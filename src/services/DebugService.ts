// ─── DebugService — debug commands extracted from Game.ts ─────────────────────

import type { IGameContext } from '../core/GameContext';
import type { ItemSystem } from '../systems/ItemSystem';
import { BASE_LIVES, MAX_LEVEL } from '../constants';
import { GameConfig } from '../config';

/**
 * Handles all debug panel commands.
 * Each command mutates game state through the IGameContext interface.
 */
export class DebugService {
  constructor(private itemSystem: ItemSystem) {}

  execute(ctx: IGameContext, cmd: string): void {
    switch (cmd) {
      case 'gold_1000':  ctx.gold += 1000; break;
      case 'gold_10000': ctx.gold += 10000; break;
      case 'levelup': {
        if (ctx.player.level < MAX_LEVEL) {
          ctx.player.xp = 0;
          ctx.player.level++;
          if (ctx.player.level % 10 === 0) ctx.player.talentPoints++;
          ctx.requestScreen('levelup');
        }
        break;
      }
      case 'levelup10': {
        for (let i = 0; i < 10 && ctx.player.level < MAX_LEVEL; i++) {
          ctx.player.level++;
          if (ctx.player.level % 10 === 0) ctx.player.talentPoints++;
          const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
            ['strength','intelligence','dexterity','agility','luck','vitality'];
          ctx.player.stats[keys[Math.floor(Math.random() * keys.length)]]++;
        }
        ctx.player.xp = 0;
        break;
      }
      case 'maxlevel': {
        while (ctx.player.level < MAX_LEVEL) {
          ctx.player.level++;
          if (ctx.player.level % 10 === 0) ctx.player.talentPoints++;
          const keys: Array<'strength'|'intelligence'|'dexterity'|'agility'|'luck'|'vitality'> =
            ['strength','intelligence','dexterity','agility','luck','vitality'];
          ctx.player.stats[keys[Math.floor(Math.random() * keys.length)]]++;
        }
        ctx.player.xp = 0;
        break;
      }
      case 'heal':       ctx.lives = BASE_LIVES; break;
      case 'kill_all': {
        for (const e of ctx.enemies) {
          if (!e.dead) {
            e.dead = true;
            ctx.waveManager.enemiesKilledThisWave++;
            const rewardM = 1 + (ctx.waveManager.currentWave - 1) * GameConfig.get().economy.rewardScalePerWave;
            const g = Math.round(e.def.reward * rewardM * ctx.player.goldMultiplier()) + this.itemSystem.getGoldBonus(ctx.items);
            ctx.gold += g; ctx.score += g;
          }
        }
        ctx.enemies = [];
        break;
      }
      case 'skip_wave': {
        for (const e of ctx.enemies) e.dead = true;
        ctx.enemies = [];
        ctx.waveManager.spawnQueues = [];
        ctx.waveManager.waveActive = false;
        ctx.waveManager.waveComplete = true;
        ctx.waveManager.betweenWaves = true;
        break;
      }
      case 'skip10': {
        for (let i = 0; i < 10; i++) ctx.waveManager.currentWave++;
        ctx.waveManager.waveActive = false;
        ctx.waveManager.waveComplete = true;
        ctx.waveManager.betweenWaves = true;
        ctx.enemies = [];
        break;
      }
      case 'give_item':  this.itemSystem.rollItemDrop(ctx); break;
      case 'max_towers': {
        for (const t of ctx.towers) {
          while (!t.isMaxLevel) {
            const stat: 'damage'|'speed' = Math.random() < 0.5 ? 'damage' : 'speed';
            if (stat === 'damage') t.damageMult += 0.1;
            else t.speedMult += 0.1;
            t.upgradeCount++;
            t.upgradeHistory.push(stat);
          }
        }
        break;
      }
      case 'god_mode':   ctx.lives = 9999; break;
    }
  }
}
