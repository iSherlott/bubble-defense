import { registerAllContent } from './content/registerAll';
import { Game } from './game/Game';

// ── Bootstrap: register all content once before creating Game ─────────────────
registerAllContent();

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

// Auto-save when leaving page during active game
window.addEventListener('beforeunload', () => {
  if (game.screen === 'game') {
    game.saveCurrentGame();
  }
});

game.start();
