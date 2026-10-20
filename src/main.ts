import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ArenaScene } from './scenes/ArenaScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1d2a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1200, height: 1070 },
  physics: { default: 'matter', matter: { gravity: { x: 0, y: 0.6 }, debug: false } },
  scene: [BootScene, ArenaScene],
});

// Exposed for e2e tests / debugging in the console.
(window as unknown as { __game: Phaser.Game }).__game = game;
