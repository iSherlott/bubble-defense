import type { IGameContext } from '../core/GameContext';
import type { ItemSystem } from './ItemSystem';
import { BASE_LIVES } from '../constants';
import { GameConfig } from '../config';

/**
 * RewardSystem — handles wave completion rewards, end-of-path life loss,
 * kill processing (gold, XP, score).
 * Extracted from Game.ts update() method.
 */
export class RewardSystem {
  constructor(private itemSystem: ItemSystem) {}

  /** Process wave completion: vitality regen, item drops, titan shield */
  processWaveCompletion(ctx: IGameContext): void {
    if (!ctx.waveManager.waveComplete) return;
    ctx.waveManager.waveComplete = false;

    // Vitality regen
    const regen = ctx.player.vitalityRegen();
    if (regen > 0) {
      ctx.lives = Math.min(BASE_LIVES, ctx.lives + regen);
      ctx.addFT({ x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 }, `+${regen}❤ Vitalidade`, '#ff8888');
    }

    // Item drop every 10 waves
    const completedWave = ctx.waveManager.currentWave;
    if (completedWave > 0 && completedWave % 10 === 0 && completedWave !== ctx.itemState.lastItemWave) {
      ctx.itemState.lastItemWave = completedWave;
      this.itemSystem.rollItemDrop(ctx);
    }

    // Titan shield (Selo do Titã Sombrio): grant 1 shield charge every 3 waves
    const titanStacks = this.itemSystem.itemStacks('titan_seal', ctx.items);
    if (titanStacks > 0) {
      ctx.itemState.titanShieldWaves++;
      if (ctx.itemState.titanShieldWaves >= 3) {
        ctx.itemState.titanShieldWaves = 0;
        ctx.itemState.titanShieldCharges += titanStacks;
        ctx.addFT({ x: ctx.map.gameWidth / 2, y: ctx.map.gameHeight / 2 - 30 }, `🛡 Escudo do Titã!`, '#cc44ff');
      }
    }

    // Item wave complete hooks
    this.itemSystem.processWaveComplete(ctx);
  }

  /** Process enemies reaching the end of the path */
  processEndOfPath(ctx: IGameContext): boolean {
    for (const e of ctx.enemies) {
      if (e.reachedEnd && !e.dead) {
        e.dead = true;
        let lost = e.def.baseLivesLost;
        // Titan shield absorbs life losses
        if (lost > 0 && ctx.itemState.titanShieldCharges > 0) {
          const absorbed = Math.min(lost, ctx.itemState.titanShieldCharges);
          ctx.itemState.titanShieldCharges -= absorbed;
          lost -= absorbed;
          ctx.addFT(e.pos, `🛡 Bloqueado!`, '#cc44ff');
        }
        if (lost > 0) {
          ctx.lives = Math.max(0, ctx.lives - lost);
          ctx.addFT(e.pos, `-${lost}❤`, '#ff4444');
        }
        if (ctx.lives <= 0) {
          ctx.requestScreen('gameover');
          return true; // game over
        }
      }
    }
    return false;
  }

  /** Collect kills and grant gold / XP / score */
  processKills(ctx: IGameContext): void {
    const killed = ctx.enemies.filter(e => e.dead);
    ctx.enemies = ctx.enemies.filter(e => !e.dead);

    for (const e of killed) {
      ctx.waveManager.enemiesKilledThisWave++;
      if (!e.reachedEnd) {
        const rewardMult = 1 + (ctx.waveManager.currentWave - 1) * GameConfig.get().economy.rewardScalePerWave;
        const g = Math.round(e.def.reward * rewardMult * ctx.player.goldMultiplier()) + this.itemSystem.getGoldBonus(ctx.items);
        ctx.gold += g; ctx.score += g;
        ctx.addFT(e.pos, `+${g}g`, '#ffdd44');
      }
      const xpMult = 1 + (ctx.waveManager.currentWave - 1) * GameConfig.get().economy.xpScalePerWave;
      if (ctx.player.addXp(Math.round(e.def.xp * xpMult))) ctx.requestScreen('levelup');
    }
  }
}
