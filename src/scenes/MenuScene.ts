import Phaser from 'phaser';

const WIDTH = 1200;

interface GameChoice {
  scene: string;
  title: string;
  description: string;
}

const GAMES: GameChoice[] = [
  {
    scene: 'Arena',
    title: 'Rotating ring',
    description:
      'Flags bounce around inside a spinning ring and are out when they slip through a hole.',
  },
  {
    scene: 'Drop',
    title: 'Marble drop',
    description:
      'Flags ride up a tube and drop into a field of pegs. Red holes eliminate them, green holes send them back to the start.',
  },
];

/** Start screen: the player picks which game to play. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.add
      .text(WIDTH / 2, 150, 'Flag Marbles', {
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 230, 'Choose a game', { fontSize: '28px', color: '#9aa0c0' })
      .setOrigin(0.5);

    GAMES.forEach((game, i) => this.addButton(game, WIDTH / 2 + (i === 0 ? -290 : 290), 520));
  }

  private addButton(game: GameChoice, x: number, y: number): void {
    const box = this.add
      .rectangle(x, y, 520, 360, 0x262a40)
      .setStrokeStyle(3, 0x6c7bd9)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y - 90, game.title, { fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(x, y + 20, game.description, {
        fontSize: '22px',
        color: '#b8bfe8',
        align: 'center',
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 120, 'Click to play', { fontSize: '24px', color: '#ffd166' })
      .setOrigin(0.5);

    box.on('pointerover', () => box.setFillStyle(0x323859));
    box.on('pointerout', () => box.setFillStyle(0x262a40));
    box.on('pointerdown', () => this.scene.start(game.scene));
  }
}
