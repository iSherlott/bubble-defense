import { Game } from './game/Game';
import { saveGame } from './game/SaveSystem';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

// Auto-save when leaving page during active game
window.addEventListener('beforeunload', () => {
  if (game.screen === 'game') {
    game.saveCurrentGame();
  }
});

game.start();
